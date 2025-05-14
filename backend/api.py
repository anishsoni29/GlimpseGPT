import os
import sys
import json
import traceback
import tempfile
import logging
import re
import yt_dlp
import asyncio
import time
import base64
from typing import Optional, List, Dict, Any, Union
from fastapi import FastAPI, File, Form, UploadFile, Request, Response, HTTPException, Query, Depends, Body, WebSocket
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from pydub import AudioSegment
from io import StringIO, BytesIO
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from functools import partial

# Import MongoDB related modules
from db_config import init_db
from db_operations import (
    save_transcript, save_summary, save_audio_metadata,
    get_transcript, get_summary, get_audio_metadata
)
from models import Transcript, Summary, AudioMetadata

# Set the TOKENIZERS_PARALLELISM environment variable to avoid warnings
os.environ["TOKENIZERS_PARALLELISM"] = "false"

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import (
    download_audio,
    audio_to_text,
    summarize_text,
    translate_text,
    sentiment_pipeline,
    language_code_map
)

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Create a thread pool executor for CPU-intensive tasks
thread_pool = ThreadPoolExecutor()

app = FastAPI(
    title="GlimpseGPT API",
    description="API for GlimpseGPT audio summarization",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store active WebSocket connections
active_connections: List[WebSocket] = []

# Initialize MongoDB on startup
@app.on_event("startup")
async def startup_event():
    init_db()

@app.on_event("shutdown")
async def shutdown_event():
    thread_pool.shutdown(wait=True)

def run_in_thread(func, *args, **kwargs):
    """Run a CPU-intensive function in a thread pool"""
    return asyncio.get_event_loop().run_in_executor(thread_pool, partial(func, *args, **kwargs))

@app.websocket("/ws/logs")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            # Keep the connection alive
            await websocket.receive_text()
    except:
        active_connections.remove(websocket)

async def broadcast_log(message: str):
    """Broadcast a log message to all connected clients"""
    for connection in active_connections:
        try:
            await connection.send_json({
                "timestamp": datetime.now().isoformat(),
                "message": message
            })
        except:
            active_connections.remove(connection)

class WebSocketLogHandler(logging.Handler):
    def emit(self, record):
        log_entry = self.formatter.format(record)
        asyncio.create_task(broadcast_log(log_entry))

# Add WebSocket handler to logger
websocket_handler = WebSocketLogHandler()
websocket_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
logger.addHandler(websocket_handler)

# Validate YouTube URL and extract ID
def validate_youtube_url(url: str) -> str:
    if not url:
        logger.error("YouTube URL is empty")
        raise ValueError("YouTube URL cannot be empty")
        
    # First attempt: Check if it matches the standard youtube.com/watch?v= format
    pattern1 = re.compile(r'^(https?://)?(www\.)?youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})')
    match1 = pattern1.match(url)
    if match1:
        return match1.group(3)
    
    # Second attempt: Check for youtu.be/ format
    pattern2 = re.compile(r'^(https?://)?(www\.)?youtu\.be/([a-zA-Z0-9_-]{11})')
    match2 = pattern2.match(url)
    if match2:
        return match2.group(3)
    
    # If no match found
    logger.error(f"Invalid YouTube URL format: {url}")
    raise ValueError(f"Invalid YouTube URL format. Please provide a standard YouTube URL like https://www.youtube.com/watch?v=xxxx or https://youtu.be/xxxx")

@app.get("/")
async def root():
    logger.info("Health check endpoint called")
    return {"message": "GlimpseGPT API is running"}

@app.post("/api/summarize")
async def summarize(
    request: Request,
    file: Optional[UploadFile] = File(None),
    language: Optional[str] = Form(None)
):
    body_bytes = await request.body()
    url = None
    json_body = None
    
    try:
        if request.headers.get('content-type') == 'application/json':
            try:
                json_body = json.loads(body_bytes)
                url = json_body.get('url')
                if language is None:
                    language = json_body.get('language', 'English')
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON body: {e}")
                raise HTTPException(status_code=400, detail=f"Invalid JSON body: {str(e)}")
        
        if language is None:
            language = "English"
        
        if not url and not file:
            raise HTTPException(status_code=400, detail="Either URL or file must be provided")
        
        if language not in language_code_map:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported language: {language}. Supported languages are {', '.join(language_code_map.keys())}"
            )
        
        # Process YouTube URL or uploaded file
        if url:
            video_id = validate_youtube_url(url)
            
            # Check if we already have the data in MongoDB
            existing_summary = await get_summary(video_id)
            if existing_summary:
                return {
                    "summary": existing_summary["text"],
                    "video_id": video_id,
                    "cached": True
                }
            
            # Download and process if not in cache
            audio_file = await run_in_thread(download_audio, url)
            
            # Save audio metadata
            audio_metadata = AudioMetadata(
                video_id=video_id,
                format="mp3",
                file_path=audio_file,
                file_size=os.path.getsize(audio_file)
            )
            await save_audio_metadata(audio_metadata)
            
        else:
            # Handle uploaded file
            temp_dir = tempfile.mkdtemp()
            temp_path = os.path.join(temp_dir, file.filename)
            
            with open(temp_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
            
            audio_file = temp_path
            video_id = f"upload_{int(time.time())}"
            
            # Save audio metadata for uploaded file
            audio_metadata = AudioMetadata(
                video_id=video_id,
                format=file.filename.split('.')[-1],
                file_path=temp_path,
                file_size=len(content)
            )
            await save_audio_metadata(audio_metadata)
        
        # Transcribe audio
        transcription_result = await run_in_thread(audio_to_text, audio_file)
        transcript_text = transcription_result["full_text"]
        segments = transcription_result["segments"]
        
        # Save transcript
        transcript = Transcript(
            video_id=video_id,
            text=transcript_text,
            language=language,
            segments=segments
        )
        await save_transcript(transcript)
        
        # Generate and save summary
        summary_text = await run_in_thread(summarize_text, transcript_text)
        sentiment_result = await run_in_thread(sentiment_pipeline, summary_text)
        
        # Format sentiment data to match the model's expectations
        sentiment_data = {
            "label": float(sentiment_result[0]["score"]) if isinstance(sentiment_result, list) else float(sentiment_result["score"]),
            "score": float(sentiment_result[0]["score"]) if isinstance(sentiment_result, list) else float(sentiment_result["score"])
        }
        
        summary = Summary(
            video_id=video_id,
            text=summary_text,
            language=language,
            sentiment=sentiment_data
        )
        await save_summary(summary)
        
        return {
            "summary": summary_text,
            "video_id": video_id,
            "cached": False
        }
        
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/transcript/{video_id}")
async def get_video_transcript(video_id: str):
    """Get transcript for a specific video"""
    transcript = await get_transcript(video_id)
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not found")
    return transcript

@app.get("/api/summary/{video_id}")
async def get_video_summary(video_id: str):
    """Get summary for a specific video"""
    summary = await get_summary(video_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found")
    return summary

@app.get("/api/metadata/{video_id}")
async def get_video_metadata(video_id: str):
    """Get audio metadata for a specific video"""
    metadata = await get_audio_metadata(video_id)
    if not metadata:
        raise HTTPException(status_code=404, detail="Audio metadata not found")
    return metadata

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {str(exc)}")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": f"Server error: {str(exc)}"},
    )

@app.get("/api/logs")
async def get_logs():
    """
    Return the most recent logs from the application.
    """
    try:
        recent_logs = websocket_handler.logs
        progress_updates = [log for log in recent_logs if "Progress update" in log]
        return {
            "logs": recent_logs,
            "progress": progress_updates[-5:] if progress_updates else [],
            "count": len(recent_logs),
            "last_updated": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error retrieving logs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve logs: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True) 