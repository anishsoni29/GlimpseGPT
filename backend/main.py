import os
import re
import yt_dlp
import speech_recognition as sr
from transformers import pipeline, M2M100ForConditionalGeneration, M2M100Tokenizer
from pydub import AudioSegment
from concurrent.futures import ThreadPoolExecutor
import matplotlib
matplotlib.use('Agg')  # Force non-interactive backend
import matplotlib.pyplot as plt

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

# Function to download YouTube audio
def download_audio(url, output_path="audio"):
    try:
        # Ensure output directory exists
        output_path = os.path.abspath(output_path)
        os.makedirs(output_path, exist_ok=True)
        
        # Clean filename template to avoid problematic characters
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': os.path.join(output_path, '%(id)s.%(ext)s'),  # Use video ID instead of title
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
            }],
            'postprocessor_args': ['-ar', '16000'],
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(url, download=True)
            video_id = info_dict.get('id') or 'audio'
            audio_file = os.path.join(output_path, f"{video_id}.mp3")
            
            # Verify file exists
            if not os.path.exists(audio_file):
                raise Exception(f"Downloaded file not found at {audio_file}")
                
            return audio_file
    except Exception as e:
        raise Exception(f"Failed to download audio: {str(e)}")

# Function to convert audio to text
def audio_to_text(audio_file, chunk_duration=20):
    try:
        # First check if file exists
        if not os.path.exists(audio_file):
            raise Exception(f"Audio file not found: {audio_file}")
            
        recognizer = sr.Recognizer()
        # Convert MP3 to WAV if necessary
        if audio_file.lower().endswith('.mp3'):
            audio = AudioSegment.from_mp3(audio_file)
            wav_file = audio_file.replace('.mp3', '.wav')
            audio.export(wav_file, format="wav")
        else:
            wav_file = audio_file

        # Ensure audio is in the correct sample rate (16kHz)
        audio = AudioSegment.from_wav(wav_file).set_frame_rate(16000)
        # Split audio into smaller chunks
        audio_chunks = [audio[i * 1000 * chunk_duration:(i + 1) * 1000 * chunk_duration]
                        for i in range(len(audio) // (1000 * chunk_duration))]

        # Create directory for temporary chunks if needed
        temp_dir = "temp_audio_chunks"
        os.makedirs(temp_dir, exist_ok=True)

        def transcribe_chunk(chunk, index):
            temp_chunk = os.path.join(temp_dir, f"chunk{index}.wav")
            chunk.export(temp_chunk, format="wav")
            with sr.AudioFile(temp_chunk) as source:
                audio_data = recognizer.record(source)
                try:
                    transcript = recognizer.recognize_google(audio_data, language="en-US", show_all=False)
                    return transcript
                except sr.UnknownValueError:
                    return ""
                except sr.RequestError as e:
                    return f"API Request Error: {e}"
                finally:
                    # Clean up temporary chunk file
                    if os.path.exists(temp_chunk):
                        try:
                            os.remove(temp_chunk)
                        except:
                            pass
        
        # Only process chunks if we have any
        if len(audio_chunks) > 0:
            with ThreadPoolExecutor() as executor:
                transcripts = list(executor.map(transcribe_chunk, audio_chunks, range(len(audio_chunks))))
        else:
            # If audio is too short, process it directly
            transcripts = [transcribe_chunk(audio, 0)]

        # Cleanup temporary file if created from an MP3.
        if audio_file.lower().endswith('.mp3'):
            try:
                os.remove(wav_file)
            except:
                pass
            
        full_transcript = " ".join(transcripts).strip()
        return full_transcript
    except Exception as e:
        raise Exception(f"Failed to convert audio to text: {str(e)}")

# Function to summarize text
def summarize_text(text):
    try:
        summarizer = pipeline("summarization", model="sshleifer/distilbart-cnn-12-6")
        max_input_length = 1024
        if len(text) > max_input_length:
            text = text[:max_input_length]
        summary = summarizer(text, max_length=150, min_length=30, do_sample=False)
        return summary[0]['summary_text']
    except Exception as e:
        raise Exception(f"Failed to summarize text: {str(e)}")

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
