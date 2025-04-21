import os
import re
import yt_dlp
import speech_recognition as sr
from transformers import pipeline, M2M100ForConditionalGeneration, M2M100Tokenizer, AutoTokenizer, AutoModelForSeq2SeqLM
import torch
from pydub import AudioSegment
from concurrent.futures import ThreadPoolExecutor
import matplotlib
from dotenv import load_dotenv
import json
import logging
matplotlib.use('Agg')  # Force non-interactive backend
import matplotlib.pyplot as plt

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables for optional customization
load_dotenv()

# Initialize translation model and tokenizer
translator_model_name = "facebook/m2m100_418M"
translator_model = M2M100ForConditionalGeneration.from_pretrained(translator_model_name)
translator_tokenizer = M2M100Tokenizer.from_pretrained(translator_model_name)

# Mapping of languages to codes for translation
language_code_map = {
    'English': 'en',
    'Hindi': 'hi',
    'Tamil': 'ta',
    'Marathi': 'mr',
}

# Initialize sentiment analysis pipeline using a model that returns labels and confidence scores.
sentiment_pipeline = pipeline("sentiment-analysis", model="cardiffnlp/twitter-roberta-base-sentiment")

# Initialize best summarization models from HuggingFace
logger.info("Loading summarization models...")

# Primary model for high-quality summarization
try:
    MAIN_SUMMARIZER_NAME = "facebook/bart-large-cnn"
    main_summarizer = pipeline(
        "summarization", 
        model=MAIN_SUMMARIZER_NAME, 
        device=0 if torch.cuda.is_available() else -1
    )
    logger.info(f"Loaded primary summarization model: {MAIN_SUMMARIZER_NAME}")
except Exception as e:
    logger.warning(f"Could not load primary summarization model: {str(e)}")
    main_summarizer = None

# Secondary model for long contexts
try:
    LONG_SUMMARIZER_NAME = "pszemraj/led-large-book-summary"
    long_summarizer_tokenizer = AutoTokenizer.from_pretrained(LONG_SUMMARIZER_NAME)
    long_summarizer_model = AutoModelForSeq2SeqLM.from_pretrained(LONG_SUMMARIZER_NAME)
    logger.info(f"Loaded long-context summarization model: {LONG_SUMMARIZER_NAME}")
except Exception as e:
    logger.warning(f"Could not load long-context summarization model: {str(e)}")
    long_summarizer_tokenizer = None
    long_summarizer_model = None

# Fallback model for reliability
try:
    FALLBACK_SUMMARIZER_NAME = "sshleifer/distilbart-cnn-12-6"
    fallback_summarizer = pipeline(
        "summarization", 
        model=FALLBACK_SUMMARIZER_NAME, 
        device=0 if torch.cuda.is_available() else -1
    )
    logger.info(f"Loaded fallback summarization model: {FALLBACK_SUMMARIZER_NAME}")
except Exception as e:
    logger.warning(f"Could not load fallback summarization model: {str(e)}")
    fallback_summarizer = None

# Function to download YouTube audio
def download_audio(url, output_path="audio"):
    try:
        # Ensure output directory exists
        os.makedirs(os.path.abspath(output_path), exist_ok=True)
        
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': os.path.join(output_path, '%(id)s.%(ext)s'),
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
            }],
            'postprocessor_args': ['-ar', '16000'],
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(url, download=True)
            video_id = info_dict.get('id', 'audio')
            audio_file = os.path.join(output_path, f"{video_id}.mp3")
            return audio_file
    except Exception as e:
        raise Exception(f"Failed to download audio: {str(e)}")

# Function to convert audio to text with improved accuracy
def audio_to_text(audio_file, chunk_duration=15):
    try:
        # Check if file exists
        if not os.path.exists(audio_file):
            raise Exception(f"Audio file not found: {audio_file}")
            
        # Create temp dir
        temp_dir = "temp_audio_chunks"
        os.makedirs(temp_dir, exist_ok=True)
            
        recognizer = sr.Recognizer()
        
        # Convert MP3 to WAV if necessary
        if audio_file.lower().endswith('.mp3'):
            audio = AudioSegment.from_mp3(audio_file)
            wav_file = audio_file.replace('.mp3', '.wav')
            audio.export(wav_file, format="wav")
        else:
            wav_file = audio_file

        # Process audio with smaller chunks for better accuracy
        audio = AudioSegment.from_wav(wav_file).set_frame_rate(16000)
        
        # Calculate chunk size with overlap for smoother transitions
        chunk_size = chunk_duration * 1000  # convert to milliseconds
        overlap = 1000  # 1 second overlap
        
        # Create overlapping chunks for better context
        audio_length = len(audio)
        transcript_segments = []
        
        def transcribe_chunk(chunk, start_time):
            temp_chunk = os.path.join(temp_dir, f"chunk_{start_time}.wav")
            chunk.export(temp_chunk, format="wav")
            
            with sr.AudioFile(temp_chunk) as source:
                audio_data = recognizer.record(source)
                try:
                    text = recognizer.recognize_google(audio_data, language="en-US", show_all=False)
                    if text:
                        # Create segment with timestamp
                        return {
                            "text": text,
                            "start": start_time / 1000,  # convert to seconds
                            "end": (start_time + len(chunk)) / 1000  # convert to seconds
                        }
                    return None
                except sr.UnknownValueError:
                    return None
                except sr.RequestError as e:
                    logger.error(f"API Request Error: {e}")
                    return None
                finally:
                    if os.path.exists(temp_chunk):
                        try:
                            os.remove(temp_chunk)
                        except:
                            pass
        
        # Process chunks with ThreadPoolExecutor
        chunk_positions = list(range(0, audio_length - chunk_size + 1, chunk_size - overlap))
        if chunk_positions:
            chunks_with_positions = [(audio[pos:pos + chunk_size], pos) for pos in chunk_positions]
            
            # Add the last chunk if needed
            if chunk_positions[-1] + chunk_size < audio_length:
                last_pos = audio_length - chunk_size
                chunks_with_positions.append((audio[last_pos:], last_pos))
            
            with ThreadPoolExecutor() as executor:
                results = list(executor.map(lambda x: transcribe_chunk(*x), chunks_with_positions))
                
            # Filter out None results and combine
            transcript_segments = [r for r in results if r]
            
            # Sort segments by start time
            transcript_segments.sort(key=lambda x: x["start"])
            
            # Combine the text
            full_transcript = " ".join([segment["text"] for segment in transcript_segments])
        else:
            # Handle short audio
            result = transcribe_chunk(audio, 0)
            if result:
                transcript_segments = [result]
                full_transcript = result["text"]
            else:
                full_transcript = ""
                transcript_segments = []

        # Cleanup
        if audio_file.lower().endswith('.mp3') and os.path.exists(wav_file):
            try:
                os.remove(wav_file)
            except:
                pass
            
        return {
            "full_text": full_transcript.strip(),
            "segments": transcript_segments
        }
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}")
        raise Exception(f"Failed to convert audio to text: {str(e)}")

# Function to summarize text using advanced Hugging Face models
def summarize_text(text):
    try:
        logger.info(f"Summarizing text of length {len(text)} characters")
        max_input_length = 1024

        # Strategy 1: Try the long-context summarizer for very long texts
        if len(text) > 2000 and long_summarizer_model is not None and long_summarizer_tokenizer is not None:
            try:
                logger.info("Using long-context summarizer")
                # This model can handle much longer inputs (up to 16k tokens)
                inputs = long_summarizer_tokenizer(
                    text[:16000],  # Limit text to prevent overflow
                    max_length=16384,
                    return_tensors="pt",
                    truncation=True
                )
                
                with torch.no_grad():
                    summary_ids = long_summarizer_model.generate(
                        inputs["input_ids"],
                        max_length=500,
                        min_length=100,
                        length_penalty=2.0,
                        num_beams=4,
                        early_stopping=True
                    )
                
                summary = long_summarizer_tokenizer.decode(summary_ids[0], skip_special_tokens=True)
                logger.info(f"Long-context summary generated, length: {len(summary)} characters")
                return summary
            except Exception as e:
                logger.warning(f"Long-context summarizer failed: {str(e)}. Falling back to chunked approach.")
                
        # Strategy 2: Use our main summarizer with chunking for medium-sized texts
        if main_summarizer is not None:
            try:
                logger.info("Using main summarizer with chunking")
                # Handle long texts by splitting into chunks
                summaries = []
                
                # Process in chunks with overlap
                for i in range(0, len(text), max_input_length - 100):
                    chunk = text[i:i + max_input_length]
                    if len(chunk) < 100:  # Skip very small chunks
                        continue
                        
                    summary = main_summarizer(
                        chunk, 
                        max_length=150, 
                        min_length=30, 
                        do_sample=False
                    )
                    summaries.append(summary[0]['summary_text'])
                
                # If we have multiple summaries, combine and re-summarize
                if len(summaries) > 1:
                    combined = " ".join(summaries)
                    logger.info(f"Combined {len(summaries)} chunk summaries for final summarization")
                    
                    # Recursively summarize the combined text if it's still too long
                    if len(combined) > max_input_length:
                        return summarize_text(combined)
                    
                    # Otherwise summarize the combined text once more for coherence
                    final_summary = main_summarizer(
                        combined, 
                        max_length=200, 
                        min_length=75,
                        do_sample=False
                    )
                    logger.info(f"Final summary generated, length: {len(final_summary[0]['summary_text'])} characters")
                    return final_summary[0]['summary_text']
                elif len(summaries) == 1:
                    logger.info(f"Single chunk summary generated, length: {len(summaries[0])} characters")
                    return summaries[0]
                else:
                    raise Exception("No valid summarization chunks generated")
            except Exception as e:
                logger.warning(f"Main summarizer failed: {str(e)}. Falling back to fallback model.")
                
        # Strategy 3: Try fallback model as last resort
        if fallback_summarizer is not None:
            try:
                logger.info("Using fallback summarizer")
                if len(text) > max_input_length:
                    text = text[:max_input_length]
                    
                summary = fallback_summarizer(
                    text, 
                    max_length=150, 
                    min_length=30, 
                    do_sample=False
                )
                logger.info(f"Fallback summary generated, length: {len(summary[0]['summary_text'])} characters")
                return summary[0]['summary_text']
            except Exception as e:
                logger.error(f"Fallback summarizer also failed: {str(e)}")

        # If all strategies fail, create a basic summary from first sentences
        logger.warning("All summarizers failed! Creating basic summary from first sentences.")
        sentences = text.split('. ')
        basic_summary = '. '.join(sentences[:5]) + '.'
        return basic_summary
        
    except Exception as e:
        logger.error(f"Summarization error: {str(e)}")
        # Final emergency fallback - just return the beginning of the text
        sentences = text.split('. ')
        return '. '.join(sentences[:3]) + '.'

# Function to translate text using the M2M100 model
def translate_text(text, target_language_code):
    try:
        translator_tokenizer.src_lang = "en"
        encoded_text = translator_tokenizer(text, return_tensors="pt")
        generated_tokens = translator_model.generate(
            **encoded_text, 
            forced_bos_token_id=translator_tokenizer.get_lang_id(target_language_code)
        )
        translated_text = translator_tokenizer.batch_decode(generated_tokens, skip_special_tokens=True)[0]
        return translated_text
    except Exception as e:
        raise Exception(f"Failed to translate text: {str(e)}")

# API-specific functions only - no GUI components
