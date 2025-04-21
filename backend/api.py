import os
import base64
import logging
import re
import json
from typing import Optional, Union, Dict, Any, List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query, Depends, Body, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydub import AudioSegment
import tempfile
import traceback
import time
from main import (
    download_audio,
    audio_to_text,
    summarize_text,
    translate_text,
    sentiment_pipeline,
    language_code_map
)
import yt_dlp
from io import StringIO, BytesIO
from datetime import datetime

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="GlimpseGPT API",
    description="API for GlimpseGPT audio summarization",
    version="1.0.0"
)

# Add CORS middleware with more permissive settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Set up logging with a custom handler that stores recent logs
class MemoryLogHandler(logging.Handler):
    def __init__(self, capacity=100):
        super().__init__()
        self.capacity = capacity
        self.logs = []
        self.formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    
    def emit(self, record):
        log_entry = self.formatter.format(record)
        self.logs.append(log_entry)
        # Keep only the most recent logs
        if len(self.logs) > self.capacity:
            self.logs.pop(0)

# Create memory handler
memory_handler = MemoryLogHandler()
memory_handler.setLevel(logging.INFO)

# Add it to the root logger
logging.getLogger().addHandler(memory_handler)

# Add it to our logger
logger.addHandler(memory_handler)

# Now all log messages will be stored in memory_handler.logs

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
    # Get the raw request body for debugging
    body_bytes = await request.body()
    logger.info(f"Raw request body: {body_bytes}")
    
    # Try to parse as JSON if content-type is application/json
    url = None
    json_body = None
    
    try:
        if request.headers.get('content-type') == 'application/json':
            try:
                json_body = json.loads(body_bytes)
                logger.info(f"Parsed JSON body: {json_body}")
                url = json_body.get('url')
                if language is None:
                    language = json_body.get('language', 'English')
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON body: {e}")
                return JSONResponse(
                    status_code=400,
                    content={"detail": f"Invalid JSON body: {str(e)}"}
                )
        
        # Default language if not provided
        if language is None:
            language = "English"
        
        logger.info(f"Processing request with URL: {url}, File: {file.filename if file else None}, Language: {language}")
        
        if not url and not file:
            logger.warning("Request missing both URL and file")
            return JSONResponse(
                status_code=400,
                content={"detail": "Either URL or file must be provided"}
            )
        
        # Validate language
        if language not in language_code_map:
            logger.warning(f"Unsupported language: {language}")
            return JSONResponse(
                status_code=400,
                content={"detail": f"Unsupported language: {language}. Supported languages are {', '.join(language_code_map.keys())}"}
            )
        
        # Process YouTube URL
        if url:
            logger.info(f"Validating YouTube URL: {url}")
            try:
                # Validate and extract YouTube ID
                video_id = validate_youtube_url(url)
                logger.info(f"Extracted YouTube video ID: {video_id}")
                standard_url = f"https://www.youtube.com/watch?v={video_id}"
                
                # Download audio
                logger.info(f"Downloading audio from YouTube ID: {video_id}")
                logger.info("Progress update: Downloading audio content")
                try:
                    audio_file = download_audio(standard_url)
                    logger.info(f"Downloaded audio file: {audio_file}")
                except Exception as e:
                    logger.error(f"Failed to download audio: {str(e)}")
                    return JSONResponse(
                        status_code=500,
                        content={"detail": f"Failed to download audio: {str(e)}"}
                    )
            except ValueError as ve:
                logger.error(f"Invalid YouTube URL: {str(ve)}")
                return JSONResponse(
                    status_code=400,
                    content={"detail": f"Invalid YouTube URL: {str(ve)}"}
                )
            except Exception as e:
                logger.error(f"Failed to download audio: {str(e)}")
                return JSONResponse(
                    status_code=400,
                    content={"detail": f"Failed to download from URL: {str(e)}"}
                )
            
            try:
                logger.info(f"Transcribing audio from: {audio_file}")
                logger.info("Progress update: Transcribing audio to text")
                transcription_result = audio_to_text(audio_file)
                
                # Extract full text and segments
                original_text = transcription_result["full_text"]
                transcript_segments = transcription_result["segments"]
                
                logger.info(f"Transcribed text length: {len(original_text)} characters, with {len(transcript_segments)} segments")
                
                # If we got no transcribed text, return an error
                if not original_text.strip():
                    logger.error("No speech detected in the audio")
                    return JSONResponse(
                        status_code=400,
                        content={"detail": "No speech detected in the audio"}
                    )
            except Exception as e:
                logger.error(f"Failed to transcribe audio: {str(e)}")
                return JSONResponse(
                    status_code=500,
                    content={"detail": f"Failed to transcribe audio: {str(e)}"}
                )
        
        # Process uploaded file
        elif file:
            logger.info(f"Processing uploaded file: {file.filename}")
            temp_path = None
            try:
                # Save uploaded file to a temporary file
                with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as temp_file:
                    content = await file.read()
                    if len(content) == 0:
                        logger.error("Uploaded file is empty")
                        return JSONResponse(
                            status_code=400,
                            content={"detail": "Uploaded file is empty"}
                        )
                    
                    temp_file.write(content)
                    temp_path = temp_file.name
                
                logger.info(f"Saved uploaded file to temp path: {temp_path}")
                try:
                    transcription_result = audio_to_text(temp_path)
                    
                    # Extract full text and segments
                    original_text = transcription_result["full_text"]
                    transcript_segments = transcription_result["segments"]
                    
                    logger.info(f"Transcribed text length: {len(original_text)} characters, with {len(transcript_segments)} segments")
                except Exception as e:
                    logger.error(f"Failed to transcribe audio: {str(e)}")
                    return JSONResponse(
                        status_code=500,
                        content={"detail": f"Failed to transcribe audio: {str(e)}"}
                    )
                
                # If we got no transcribed text, return an error
                if not original_text.strip():
                    logger.error("No speech detected in the uploaded audio")
                    return JSONResponse(
                        status_code=400,
                        content={"detail": "No speech detected in the uploaded audio"}
                    )
            except Exception as e:
                logger.error(f"Failed to process uploaded file: {str(e)}")
                return JSONResponse(
                    status_code=500,
                    content={"detail": f"Failed to process file: {str(e)}"}
                )
            finally:
                # Clean up temp file
                if temp_path and os.path.exists(temp_path):
                    try:
                        os.remove(temp_path)
                    except Exception as e:
                        logger.warning(f"Failed to remove temp file: {str(e)}")
        
        # Generate summary in English
        logger.info("Generating summary")
        logger.info("Progress update: Generating summary of content")
        try:
            summary_en = summarize_text(original_text)
            logger.info(f"Summary generated, length: {len(summary_en)} characters")
            
            # Validate summary content
            if not summary_en or len(summary_en.strip()) == 0:
                logger.error("Generated summary is empty")
                return JSONResponse(
                    status_code=500,
                    content={"detail": "Failed to generate a meaningful summary from the content"}
                )
                
            # Log summary for debugging (only in development)
            logger.info(f"Summary content preview: {summary_en[:100]}...")
        except Exception as e:
            logger.error(f"Failed to summarize text: {str(e)}")
            return JSONResponse(
                status_code=500,
                content={"detail": f"Failed to generate summary: {str(e)}"}
            )
        
        # Translate summary if needed
        target_language_code = language_code_map.get(language, "en")
        if language != "English":
            logger.info(f"Translating to {language} ({target_language_code})")
            logger.info("Progress update: Translating summary")
            try:
                summary_translated = translate_text(summary_en, target_language_code)
                logger.info(f"Translation complete, length: {len(summary_translated)} characters")
            except Exception as e:
                logger.error(f"Failed to translate summary: {str(e)}")
                # Fall back to English summary if translation fails
                summary_translated = summary_en
                logger.info("Falling back to English summary")
        else:
            summary_translated = summary_en
        
        # Analyze sentiment
        logger.info("Analyzing sentiment")
        logger.info("Progress update: Performing sentiment analysis")
        try:
            sentiment_result = sentiment_pipeline(summary_en)
            sentiment_label = sentiment_result[0]["label"]
            sentiment_score = sentiment_result[0]["score"]
            logger.info(f"Sentiment analysis complete: {sentiment_label} ({sentiment_score})")
        except Exception as e:
            logger.error(f"Failed to analyze sentiment: {str(e)}")
            # Provide default sentiment values if analysis fails
            sentiment_label = "neutral"
            sentiment_score = 0.5
            logger.info("Using default sentiment values")
        
        logger.info("Progress update: Finalizing results")
        response_data = {
            "original_text": original_text,
            "summary_en": summary_en,
            "summary_translated": summary_translated,
            "language": language,
            "sentiment": {
                "label": sentiment_label,
                "score": sentiment_score
            },
            "transcript_segments": transcript_segments
        }
        
        # Log response structure (without full content) for debugging
        logger.info(f"Response structure: keys={list(response_data.keys())}")
        logger.info(f"Summary length: original={len(summary_en)}, translated={len(summary_translated)}")
        
        # Additional metadata if available from YouTube
        if url:
            try:
                # Try to extract thumbnail and title
                with yt_dlp.YoutubeDL({'quiet': True}) as ydl:
                    video_info = ydl.extract_info(url, download=False)
                    
                    if video_info:
                        # Get best thumbnail
                        thumbnails = video_info.get('thumbnails', [])
                        thumbnails.sort(key=lambda x: x.get('height', 0) * x.get('width', 0), reverse=True)
                        
                        if thumbnails:
                            response_data["thumbnail_url"] = thumbnails[0]['url']
                        
                        # Get title
                        if 'title' in video_info:
                            response_data["title"] = video_info['title']
            except Exception as e:
                logger.warning(f"Could not extract additional metadata: {str(e)}")
        
        logger.info("Successfully processed request, returning response")
        return JSONResponse(content=response_data)
    
    except Exception as e:
        logger.error(f"Unhandled exception in summarize endpoint: {str(e)}")
        logger.error(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={"detail": f"An error occurred while processing the request: {str(e)}"}
        )

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
        return {"logs": memory_handler.logs}
    except Exception as e:
        logger.error(f"Error retrieving logs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve logs: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True) 