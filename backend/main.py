import os
# Set the TOKENIZERS_PARALLELISM environment variable to avoid warnings
os.environ["TOKENIZERS_PARALLELISM"] = "false"

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
        text = text.strip()
        
        # Skip summarization if text is too short or empty
        if len(text) < 100:
            logger.warning("Text too short for summarization")
            return text
            
        max_input_length = 1024
        
        # Attempt to improve summarization by extracting key information first
        # This helps focus the summary on important content
        key_information = extract_key_information(text)
        
        # Strategy 1: Try the long-context summarizer for best quality
        if len(text) > 2000 and long_summarizer_model is not None and long_summarizer_tokenizer is not None:
            try:
                logger.info("Using high-quality long-context summarizer")
                # Limit text to prevent overflow but ensure enough context
                truncated_text = text[:10000] if len(text) > 10000 else text
                
                # Add instructions to the model to get a better summary
                enhanced_prompt = f"Below is a transcript from a video. Please provide a concise summary highlighting the key points, main ideas, and essential information so someone doesn't need to watch the full video:\n\n{truncated_text}"
                
                inputs = long_summarizer_tokenizer(
                    enhanced_prompt,
                    max_length=16384,
                    return_tensors="pt",
                    truncation=True
                )
                
                with torch.no_grad():
                    summary_ids = long_summarizer_model.generate(
                        inputs["input_ids"],
                        max_length=300,
                        min_length=100,
                        length_penalty=2.0,
                        num_beams=4,
                        early_stopping=True
                    )
                
                summary = long_summarizer_tokenizer.decode(summary_ids[0], skip_special_tokens=True)
                logger.info(f"Long-context summary generated, length: {len(summary)} characters")
                
                # Improve summary formatting by adding section headers
                formatted_summary = format_summary(summary)
                
                if len(formatted_summary.strip()) > 100:
                    return formatted_summary
                logger.warning("Long-context summarizer returned inadequate result, trying alternatives.")
            except Exception as e:
                logger.warning(f"Long-context summarizer failed: {str(e)}. Trying alternatives.")
        
        # Strategy 2: For shorter texts, use the main summarizer
        if main_summarizer is not None:
            try:
                logger.info("Using main summarizer with improved prompt")
                # Add summary instruction to the beginning
                if len(text) > 10000:
                    text = text[:10000]
                    logger.info("Text truncated to 10,000 characters for better processing")
                
                # Create an enhanced prompt for better summary quality
                enhanced_prompt = f"Summarize this video transcript highlighting key points, main ideas, and important takeaways: {text[:max_input_length-100]}"
                
                summary = main_summarizer(
                    enhanced_prompt,
                    max_length=200, 
                    min_length=80, 
                    do_sample=False,
                    num_beams=4
                )
                
                result = summary[0]['summary_text']
                formatted_result = format_summary(result)
                logger.info(f"Enhanced summary generated, length: {len(formatted_result)} characters")
                
                if len(formatted_result.strip()) > 80:
                    return formatted_result
                
                # If the result isn't good enough, try another approach
                logger.warning("Main summarizer returned inadequate result, trying chunked approach.")
                
                # Handle long texts by splitting into chunks and focusing on important parts
                summaries = []
                
                # Process text in chunks, focusing on beginning, middle and end
                if len(text) > max_input_length * 3:
                    chunks = [
                        text[:max_input_length],  # Beginning
                        text[len(text)//2 - max_input_length//2:len(text)//2 + max_input_length//2],  # Middle
                        text[-max_input_length:]  # End
                    ]
                else:
                    # Process in chunks with minimal overlap
                    chunks = [text[i:i + max_input_length] for i in range(0, len(text), max_input_length - 100)]
                
                for i, chunk in enumerate(chunks):
                    if len(chunk) < 100:  # Skip very small chunks
                        continue
                    
                    # Add contextual prompts based on chunk position
                    if i == 0:
                        prompt = f"Summarize the introduction and initial points from this video transcript: {chunk}"
                    elif i == len(chunks) - 1:
                        prompt = f"Summarize the conclusion and final points from this video transcript: {chunk}"
                    else:
                        prompt = f"Summarize the main content from this video transcript: {chunk}"
                    
                    summary = main_summarizer(
                        prompt,
                        max_length=150, 
                        min_length=30, 
                        do_sample=False,
                        num_beams=3
                    )
                    summaries.append(summary[0]['summary_text'])
                
                # If we have multiple summaries, process them better
                if len(summaries) > 1:
                    # Create a structured summary from the parts
                    if len(summaries) >= 3:
                        final_summary = "Key Points:\n"
                        for i, part in enumerate(summaries):
                            section = "Introduction" if i == 0 else "Conclusion" if i == len(summaries)-1 else f"Main Content {i}"
                            final_summary += f"• {part}\n"
                    else:
                        final_summary = " ".join(summaries)
                    
                    logger.info(f"Structured summary from {len(summaries)} chunks, length: {len(final_summary)} characters")
                    return format_summary(final_summary)
                elif len(summaries) == 1:
                    logger.info(f"Single chunk summary generated, length: {len(summaries[0])} characters")
                    return format_summary(summaries[0])
                else:
                    raise Exception("No valid summarization chunks generated")
            except Exception as e:
                logger.warning(f"Main summarizer failed: {str(e)}. Using fallback approach.")
        
        # Strategy 3: Use the fallback summarizer as last resort
        if fallback_summarizer is not None:
            try:
                logger.info("Using fallback summarizer with enhanced prompt")
                enhanced_prompt = f"Create a concise summary of this video content highlighting the most important points: {text[:max_input_length-100]}"
                
                summary = fallback_summarizer(
                    enhanced_prompt, 
                    max_length=200, 
                    min_length=50, 
                    do_sample=False
                )
                result = summary[0]['summary_text']
                logger.info(f"Fallback summary generated, length: {len(result)} characters")
                return format_summary(result)
            except Exception as e:
                logger.warning(f"Fallback summarizer failed: {str(e)}. Using basic approach.")
                
        # Create a basic summary based on key information extraction
        if key_information:
            logger.info("Creating summary from extracted key information")
            return key_information
                
        # If all strategies fail, create a basic summary from key sections
        logger.warning("All ML summarizers failed! Creating basic structured summary.")
        if len(text) > 1000:
            # Extract meaningful parts from beginning, middle and end
            beginning = extract_sentences(text[:800], 3)
            middle = extract_sentences(text[len(text)//2-400:len(text)//2+400], 2)
            end = extract_sentences(text[-800:], 2)
            
            summary = "Summary Points:\n\n"
            summary += f"• Introduction: {beginning}\n\n"
            summary += f"• Main Content: {middle}\n\n"
            summary += f"• Conclusion: {end}"
            
            logger.info(f"Created structured summary of length {len(summary)} characters")
            return summary
        else:
            sentences = text.split('. ')
            basic_summary = '. '.join(sentences[:5]) + '.'
            return basic_summary
        
    except Exception as e:
        logger.error(f"Summarization error: {str(e)}")
        # Final emergency fallback - just return the beginning of the text
        if len(text) > 500:
            return "Summary could not be generated properly. Here's the beginning of the transcript:\n\n" + text[:500] + "..."
        return text

# Helper function to extract key information from text
def extract_key_information(text):
    try:
        # Look for patterns that often indicate important information
        key_patterns = [
            r"(?i)(?:main|key|important)(?:\s+points?|\s+ideas?|\s+takeaways?|\s+concepts?)(?:\s+(?:are|include|is))?(?:\s*:)?",
            r"(?i)(?:in\s+(?:summary|conclusion|essence))(?:\s*,)?",
            r"(?i)(?:to\s+summarize)",
            r"(?i)(?:benefits(?:\s+of)?)",
            r"(?i)(?:advantages(?:\s+of)?)",
            r"(?i)(?:features(?:\s+of)?)"
        ]
        
        # Extract sentences following these patterns
        important_sentences = []
        sentences = re.split(r'(?<=[.!?])\s+', text)
        
        for i, sentence in enumerate(sentences):
            for pattern in key_patterns:
                if re.search(pattern, sentence):
                    # Add this sentence and the next 3 sentences if available
                    important_sentences.append(sentence)
                    for j in range(1, 4):
                        if i + j < len(sentences):
                            important_sentences.append(sentences[i + j])
        
        # If we found important sentences, format them as a summary
        if important_sentences:
            summary = "Key Information:\n\n"
            for i, sentence in enumerate(important_sentences[:10]):  # Limit to top 10 important sentences
                summary += f"• {sentence.strip()}\n"
            return summary
        
        return None
    except Exception as e:
        logger.warning(f"Failed to extract key information: {str(e)}")
        return None

# Helper function to format a summary with better structure
def format_summary(summary):
    try:
        # If summary already contains bullet points or numbers, return as is
        if re.search(r'(?:^|\n)[•\-*\d]+\s', summary):
            return summary
            
        # Split into paragraphs
        paragraphs = summary.split('\n')
        formatted = []
        
        if len(paragraphs) > 1:
            for i, para in enumerate(paragraphs):
                if para.strip():
                    formatted.append(f"• {para.strip()}")
            return "Key Points:\n\n" + "\n".join(formatted)
        else:
            # Split into sentences and add bullets
            sentences = re.split(r'(?<=[.!?])\s+', summary)
            formatted = ["Key Points:"]
            
            for sentence in sentences:
                if len(sentence.strip()) > 10:  # Only include meaningful sentences
                    formatted.append(f"• {sentence.strip()}")
            
            return "\n\n".join(formatted)
    except Exception as e:
        logger.warning(f"Failed to format summary: {str(e)}")
        return summary

# Helper function to extract the most informative sentences
def extract_sentences(text, count=3):
    sentences = re.split(r'(?<=[.!?])\s+', text)
    # Filter out very short sentences
    meaningful_sentences = [s for s in sentences if len(s.split()) > 5]
    # Return the requested number of sentences or all if fewer
    selected = meaningful_sentences[:count] if len(meaningful_sentences) > count else meaningful_sentences
    return ' '.join(selected)

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
