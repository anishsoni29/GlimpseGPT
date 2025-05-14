# GlimpseGPT

A powerful video and audio summarization tool with sentiment analysis and multilingual capabilities, powered by state-of-the-art Hugging Face transformer models.

## Features

- Extract audio from YouTube videos or upload your own audio/video files
- Transcribe audio to text with improved accuracy and timestamp segmentation
- Generate high-quality summaries using advanced Hugging Face transformer models
- Translate summaries to multiple languages with Facebook's M2M100 model
- Analyze sentiment in the text using RoBERTa-based models
- Text-to-speech functionality
- Clean, responsive UI with light and dark modes
- MongoDB integration for persistent storage of transcripts, summaries, and metadata

## Project Structure

- `backend/`: Python FastAPI backend with ML models and processing logic
- `frontend/`: Next.js frontend with a clean UI for user interaction

## Setup Instructions

### MongoDB Setup

1. Install MongoDB Community Edition:
   - On macOS with Homebrew: `brew tap mongodb/brew && brew install mongodb-community`
   - On Windows/Linux: Follow the [official MongoDB installation guide](https://www.mongodb.com/docs/manual/installation/)

2. Start MongoDB service:
   - On macOS: `brew services start mongodb-community`
   - On Windows: MongoDB runs as a service by default
   - On Linux: `sudo systemctl start mongod`

3. Configure MongoDB:
   - Create a `.env` file in the backend directory with:
     ```
     MONGODB_URI=mongodb://localhost:27017
     DATABASE_NAME=glimpse-db
     ```

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

5. Set up environment variables:
   - Create a `.env` file in the backend directory (see MongoDB Setup section)

6. Run the FastAPI server:
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
4. Click "Summarize" to generate a summary
5. View the detailed summary with sentiment analysis
6. Examine the full transcript with timestamps 
7. Use the built-in text-to-speech to listen to the summary
8. Toggle between light and dark modes using the theme switcher

## API Endpoints

### Main Endpoints
- `POST /api/summarize`: Process a video/audio file and generate summary
- `GET /api/transcript/{video_id}`: Get transcript for a specific video
- `GET /api/summary/{video_id}`: Get summary for a specific video
- `GET /api/metadata/{video_id}`: Get audio metadata for a specific video

## Transformer-Powered Summarization

The application uses a tiered approach to summarization with multiple Hugging Face transformer models:

1. **Long-context Summarizer** (`pszemraj/led-large-book-summary`) - Handles lengthy transcripts with up to 16k tokens
2. **Primary Summarizer** (`facebook/bart-large-cnn`) - High-quality summarization with chunking for medium-length texts
3. **Fallback Summarizer** (`sshleifer/distilbart-cnn-12-6`) - Reliable backup option

This multi-model approach provides:
- No reliance on external APIs
- Complete offline processing capability
- High-quality summaries without subscription costs
- Handling various text lengths efficiently

Additional features include:
- Sentiment analysis using `cardiffnlp/twitter-roberta-base-sentiment`
- Multilingual translation with Facebook's `m2m100_418M` model
- Speech recognition with improved segmentation and timestamps
- Persistent storage with MongoDB for all processed data

## License

MIT 