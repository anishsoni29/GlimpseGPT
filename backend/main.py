import os
import re
import tkinter as tk
from tkinter import filedialog, messagebox, scrolledtext
import yt_dlp
import speech_recognition as sr
from transformers import pipeline, M2M100ForConditionalGeneration, M2M100Tokenizer
from pydub import AudioSegment
from concurrent.futures import ThreadPoolExecutor
import pyttsx3
import threading
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt  # New import for interactive plotting
import platform

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

# Initialize text-to-speech engine and retrieve available voices.
try:
    engine = pyttsx3.init()
    voices = engine.getProperty('voices')
    voice_options = {voice.name: voice.id for voice in voices}
    if not voice_options:  # Fallback if no voices are detected
        voice_options = {"Default Voice": "default"}
except Exception as e:
    print(f"Warning: TTS initialization failed: {e}")
    # Create a dummy engine and voices if TTS fails
    engine = None
    voice_options = {"TTS Unavailable": "none"}

# Function to download YouTube audio
def download_audio(url, output_path="audio"):
    try:
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': os.path.join(output_path, '%(title)s.%(ext)s'),
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
            }],
            'postprocessor_args': ['-ar', '16000'],
        }
        if not os.path.exists(output_path):
            os.makedirs(output_path)
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(url, download=True)
            audio_file = os.path.join(output_path, f"{info_dict['title']}.mp3")
            return audio_file
    except Exception as e:
        raise Exception(f"Failed to download audio: {str(e)}")

# Function to convert audio to text
def audio_to_text(audio_file, chunk_duration=20):
    try:
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

        def transcribe_chunk(chunk, index):
            temp_chunk = f"chunk{index}.wav"
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

        with ThreadPoolExecutor() as executor:
            transcripts = list(executor.map(transcribe_chunk, audio_chunks, range(len(audio_chunks))))

        # Cleanup temporary file if created from an MP3.
        if audio_file.lower().endswith('.mp3'):
            os.remove(wav_file)
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

# Updated Sentiment Trend Analysis: Visualize emotion intensity trends with a plot, saving to file instead of interactive display
def analyze_sentiment_trend():
    text = output_text.get(1.0, tk.END).strip()
    if not text:
        messagebox.showwarning("Sentiment Analysis", "No text available for sentiment analysis.")
        return
    # Split the text into sentences.
    sentences = re.split(r'(?<=[.!?])\s+', text)
    trend_results = []
    for sentence in sentences:
        if sentence.strip():
            result = sentiment_pipeline(sentence)
            trend_results.append((sentence, result[0]['label'], result[0]['score']))
    
    # Prepare data for plotting
    indices = list(range(1, len(trend_results) + 1))
    intensities = [score for (_, _, score) in trend_results]
    labels = [label for (_, label, _) in trend_results]
    
    # Define colors for each sentiment label.
    label_color = {
        'positive': 'green',
        'negative': 'red',
        'neutral': 'blue'
    }
    colors = [label_color.get(label.lower(), 'black') for label in labels]
    
    # Create plot using matplotlib with non-interactive backend
    plt.figure(figsize=(10, 5))
    plt.plot(indices, intensities, marker='o', linestyle='-', color='gray', alpha=0.5)  # Line connecting points.
    plt.scatter(indices, intensities, c=colors, s=100)  # Colored points.
    plt.title("Sentiment Intensity Trend Across Sentences")
    plt.xlabel("Sentence Number")
    plt.ylabel("Sentiment Intensity")
    plt.grid(True)
    plt.xticks(indices)
    
    # Annotate each point with its sentiment label.
    for index, intensity, label in zip(indices, intensities, labels):
        plt.annotate(label, (index, intensity), textcoords="offset points", xytext=(0,10), ha='center')
    
    # Save the plot to a file instead of showing it interactively
    plot_file = 'sentiment_trend.png'
    plt.savefig(plot_file)
    plt.close()
    
    # Inform the user about the saved file
    messagebox.showinfo("Sentiment Analysis", f"Sentiment trend plot saved to {plot_file}")
    
    # Also display detailed results in a popup
    result_text = "Sentiment Analysis Results:\n\n"
    for i, (sentence, label, score) in enumerate(trend_results):
        result_text += f"Sentence {i+1}: {sentence[:50]}...\n"
        result_text += f"  Sentiment: {label}, Score: {score:.2f}\n\n"
    
    messagebox.showinfo("Sentiment Details", result_text)

# New Function: Compare sentiment analysis before and after translation.
def compare_sentiment_across_languages():
    # Expecting the output to include both summaries in the following format:
    # "Original Text:\n... \n\nSummary in English:\n{summary_en}\n\nSummary in {selected_language}:\n{summary_translated}"
    content = output_text.get(1.0, tk.END).strip()
    if not content:
        messagebox.showwarning("Sentiment Comparison", "No summary available for comparison.")
        return
    # Use regex to extract the summaries.
    try:
        english_match = re.search(r"Summary in English:\n(.*?)\n\n", content, re.DOTALL)
        translated_match = re.search(r"Summary in [^\n]+:\n(.*)", content, re.DOTALL)
        if not english_match or not translated_match:
            raise ValueError("Could not parse summaries.")
        summary_en = english_match.group(1).strip()
        summary_translated = translated_match.group(1).strip()
    except Exception as e:
        messagebox.showerror("Parsing Error", f"Error parsing summaries: {str(e)}")
        return

    # Function to perform sentiment analysis on each sentence.
    def analyze_sentences(text):
        sentences = re.split(r'(?<=[.!?])\s+', text)
        results = []
        for sentence in sentences:
            if sentence.strip():
                result = sentiment_pipeline(sentence)
                results.append((sentence, result[0]['label'], result[0]['score']))
        return results

    results_en = analyze_sentences(summary_en)
    results_translated = analyze_sentences(summary_translated)

    output_str = "Sentiment Comparison Across Languages:\n\nEnglish Summary:\n"
    for idx, (sentence, label, score) in enumerate(results_en):
        output_str += f"Sentence {idx+1}: {sentence}\n  Emotion: {label}, Intensity: {score:.2f}\n"
    output_str += "\nTranslated Summary:\n"
    for idx, (sentence, label, score) in enumerate(results_translated):
        output_str += f"Sentence {idx+1}: {sentence}\n  Emotion: {label}, Intensity: {score:.2f}\n"
    messagebox.showinfo("Sentiment Comparison", output_str)

# Enhanced Text-to-Speech function with threading support and better error handling
def text_to_speech(text, voice_id=None):
    if engine is None:
        messagebox.showwarning("TTS Unavailable", "Text-to-speech is not available on this system.")
        return
        
    def run_tts():
        try:
            if voice_id:
                engine.setProperty('voice', voice_id)
            else:
                engine.setProperty('voice', voices[0].id)
            engine.say(text)
            engine.runAndWait()
        except Exception as e:
            print(f"TTS Error: {e}")
            messagebox.showerror("TTS Error", f"Text-to-speech failed: {str(e)}")
    
    tts_thread = threading.Thread(target=run_tts)
    tts_thread.daemon = True  # Make thread a daemon so it terminates with the main program
    tts_thread.start()

# Function to stop any ongoing TTS audio with error handling
def stop_tts():
    if engine is None:
        return
    try:
        engine.stop()
    except Exception as e:
        print(f"Error stopping TTS: {e}")

# Function to save the summary to a file.
def save_summary():
    summary = output_text.get(1.0, tk.END).strip()
    if not summary:
        messagebox.showwarning("Save Error", "No summary to save. Please process audio first.")
        return
    file_path = filedialog.asksaveasfilename(defaultextension=".txt", filetypes=[("Text files", "*.txt")])
    if file_path:
        with open(file_path, 'w', encoding='utf-8') as file:
            file.write(summary)
        messagebox.showinfo("Save Successful", f"Summary saved to {file_path}")

# Process YouTube video via URL.
def process_video():
    url = url_entry.get()
    if not url:
        messagebox.showwarning("Input Error", "Please enter a YouTube URL.")
        return
    try:
        status_text.set("Downloading audio from YouTube...")
        window.update_idletasks()
        audio_file = download_audio(url)
        status_text.set("Converting audio to text...")
        window.update_idletasks()
        original_text = audio_to_text(audio_file)
        status_text.set("Summarizing text...")
        summary_en = summarize_text(original_text)
        selected_language = language_choice.get()
        target_language_code = language_code_map.get(selected_language, 'en')
        summary_translated = translate_text(summary_en, target_language_code)
        output_text.delete(1.0, tk.END)
        output_text.insert(tk.END, f"Original Text:\n{original_text}\n\nSummary in English:\n{summary_en}\n\nSummary in {selected_language}:\n{summary_translated}")
        status_text.set("Process completed successfully.")
    except Exception as e:
        messagebox.showerror("Error", str(e))
        status_text.set("Process failed. Please try again.")

# Process a local audio file.
def process_audio_file():
    file_path = filedialog.askopenfilename(
        title="Select an audio file",
        filetypes=[("Audio Files", "*.mp3 *.wav *.m4a"), ("All Files", "*.*")]
    )
    if not file_path:
        return
    try:
        status_text.set("Converting local audio to text...")
        window.update_idletasks()
        original_text = audio_to_text(file_path)
        status_text.set("Summarizing text...")
        summary_en = summarize_text(original_text)
        selected_language = language_choice.get()
        target_language_code = language_code_map.get(selected_language, 'en')
        summary_translated = translate_text(summary_en, target_language_code)
        output_text.delete(1.0, tk.END)
        output_text.insert(tk.END, f"Original Text:\n{original_text}\n\nSummary in English:\n{summary_en}\n\nSummary in {selected_language}:\n{summary_translated}")
        status_text.set("Process completed successfully.")
    except Exception as e:
        messagebox.showerror("Error", str(e))
        status_text.set("Process failed. Please try again.")

# GUI Setup.
window = tk.Tk()
window.title("Audio Summarizer with Emotion Intensity & Sentiment Comparison")
window.geometry("600x880")

# Fix for macOS - prevent Tk from using the native macOS color picker that's causing the crash
window.option_add('*foreground', 'black')
window.option_add('*background', '#f0f0f0')

# Define colors programmatically instead of using hex codes directly
button_blue = '#4287f5'
button_purple = '#8a2be2'
button_orange = '#ffa500'
button_green = '#4CAF50'
button_red = '#ff6347'
button_teal = '#008080'

# Frame for URL input and buttons.
frame = tk.Frame(window)
frame.pack(pady=20)
url_label = tk.Label(frame, text="YouTube URL:", font=("Arial", 12))
url_label.grid(row=0, column=0, padx=5, pady=5)
url_entry = tk.Entry(frame, width=50, font=("Arial", 12))
url_entry.grid(row=0, column=1, padx=5, pady=5)
process_video_button = tk.Button(frame, text="Process YouTube Video", command=process_video, font=("Arial", 12), bg=button_blue, fg="white")
process_video_button.grid(row=0, column=2, padx=5, pady=5)

# Button to upload a local audio file.
upload_button = tk.Button(window, text="Upload Local Audio File", command=process_audio_file, font=("Arial", 12), bg=button_blue, fg="white")
upload_button.pack(pady=10)

# Language selection for translation.
language_label = tk.Label(window, text="Choose summary language:", font=("Arial", 12))
language_label.pack(pady=5)
language_choice = tk.StringVar()
language_choice.set('English')
languages = ['English', 'Hindi', 'Tamil', 'Marathi']
language_menu = tk.OptionMenu(window, language_choice, *languages)
language_menu.pack(pady=5)

# Voice selection for TTS.
voice_label = tk.Label(window, text="Choose TTS Voice:", font=("Arial", 12))
voice_label.pack(pady=5)
selected_voice = tk.StringVar()
selected_voice.set(list(voice_options.keys())[0])
voice_menu = tk.OptionMenu(window, selected_voice, *voice_options.keys())
voice_menu.pack(pady=5)

# Output text box.
output_text = scrolledtext.ScrolledText(window, wrap=tk.WORD, width=60, height=15, font=("Arial", 12))
output_text.pack(padx=10, pady=10)

# Buttons for additional functionalities.
summarize_button = tk.Button(window, text="Summarize Output Text", command=lambda: summarize_text(output_text.get(1.0, tk.END)), font=("Arial", 12), bg=button_blue, fg="white")
summarize_button.pack(pady=5)
sentiment_trend_button = tk.Button(window, text="Analyze Sentiment Trend", command=analyze_sentiment_trend, font=("Arial", 12), bg=button_orange, fg="white")
sentiment_trend_button.pack(pady=5)
compare_sentiment_button = tk.Button(window, text="Compare Sentiment Across Languages", command=compare_sentiment_across_languages, font=("Arial", 12), bg=button_teal, fg="white")
compare_sentiment_button.pack(pady=5)
tts_button = tk.Button(window, text="Read Summary", 
                       command=lambda: text_to_speech(output_text.get(1.0, tk.END), voice_options[selected_voice.get()]), 
                       font=("Arial", 12), bg=button_purple, fg="white")
tts_button.pack(pady=5)
stop_tts_button = tk.Button(window, text="Stop TTS", command=stop_tts, font=("Arial", 12), bg=button_red, fg="white")
stop_tts_button.pack(pady=5)
save_button = tk.Button(window, text="Save Summary", command=save_summary, font=("Arial", 12), bg=button_green, fg="white")
save_button.pack(pady=5)

status_text = tk.StringVar()
status_text.set("Status: Waiting for input...")
status_label = tk.Label(window, textvariable=status_text, font=("Arial", 12))
status_label.pack(pady=5)

def main():
    try:
        window.mainloop()
    except Exception as e:
        print(f"Error in main loop: {e}")
        # If GUI fails, we'll provide a simple CLI fallback
        print("\nFallback CLI mode activated due to GUI error")
        print("Available options:")
        print("1. Process YouTube video")
        print("2. Process local audio file")
        print("3. Exit")
        
        choice = input("Enter your choice (1-3): ")
        if choice == "1":
            url = input("Enter YouTube URL: ")
            try:
                audio_file = download_audio(url)
                text = audio_to_text(audio_file)
                summary = summarize_text(text)
                print(f"\nSummary:\n{summary}")
            except Exception as e:
                print(f"Error processing video: {e}")
        elif choice == "2":
            file_path = input("Enter path to audio file: ")
            try:
                text = audio_to_text(file_path)
                summary = summarize_text(text)
                print(f"\nSummary:\n{summary}")
            except Exception as e:
                print(f"Error processing audio: {e}")

if __name__ == "__main__":
    main()
