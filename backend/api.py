import os
import base64
import logging
import re
import json
from typing import Optional, Union, Dict, Any
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
    
    if request.headers.get('content-type') == 'application/json':
        try:
            json_body = json.loads(body_bytes)
            logger.info(f"Parsed JSON body: {json_body}")
            url = json_body.get('url')
            if language is None:
                language = json_body.get('language', 'English')
        except Exception as e:
            logger.error(f"Failed to parse JSON body: {e}")
    
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
    
    try:
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
                audio_file = download_audio(standard_url)
                logger.info(f"Downloaded audio file: {audio_file}")
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
                original_text = audio_to_text(audio_file)
                logger.info(f"Transcribed text length: {len(original_text)} characters")
                
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
                original_text = audio_to_text(temp_path)
                logger.info(f"Transcribed text length: {len(original_text)} characters")
                
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
        try:
            summary_en = summarize_text(original_text)
            logger.info(f"Summary generated, length: {len(summary_en)} characters")
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
        
        response_data = {
            "original_text": original_text,
            "summary_en": summary_en,
            "summary_translated": summary_translated,
            "language": language,
            "sentiment": {
                "label": sentiment_label,
                "score": sentiment_score
            }
        }
        
        logger.info("Successfully processed request, returning response")
        return JSONResponse(content=response_data)
    
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        logger.error(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={"detail": f"Server error: {str(e)}"}
        )

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {str(exc)}")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": f"Server error: {str(exc)}"},
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True) 