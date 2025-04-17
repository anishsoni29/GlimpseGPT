# GlimpseGPT

A powerful video and audio summarization tool with sentiment analysis and multilingual capabilities.

## Features

- Extract audio from YouTube videos or upload your own audio/video files
- Transcribe audio to text
- Summarize text content
- Translate summaries to multiple languages
- Analyze sentiment in the text
- Text-to-speech functionality

## Project Structure

- `backend/`: Python FastAPI backend with ML models and processing logic
- `frontend/`: Next.js frontend with a clean UI for user interaction

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Create a virtual environment:
   ```
   python -m venv venv
   ```

3. Activate the virtual environment:
   - On Windows: `venv\Scripts\activate`
   - On macOS/Linux: `source venv/bin/activate`

4. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

5. Run the FastAPI server:
   ```
   uvicorn api:app --reload
   ```

The backend will be available at http://localhost:8000

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Run the development server:
   ```
   npm run dev
   ```

The frontend will be available at http://localhost:3000

## Usage

1. Open your browser and go to http://localhost:3000
2. Enter a YouTube URL or upload an audio/video file
3. Select your preferred summary language
4. Click "Process" to generate a summary
5. View the summary, transcript, and sentiment analysis results
6. Use the built-in text-to-speech to listen to the summary

## License

MIT 