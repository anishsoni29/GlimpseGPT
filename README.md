# GlimpseGPT - AI-Powered Video Understanding Platform

## Features
- YouTube video processing and analysis
- Multilingual transcription & translation (English, Hindi, Tamil, Marathi)
- AI-generated summaries and insights
- Sentiment analysis
- User authentication with Supabase
- Video history tracking

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI**: Shadcn UI, Radix UI, Tailwind CSS
- **Animation**: Framer Motion
- **State Management**: React Hook Form, react-hook-form

### Backend
- **Database**: Supabase (PostgreSQL)
- **AI Models**:
  - OpenAI Whisper Large-v3 (Audio Transcription)
  - Facebook BART-large-cnn (Summarization)
  - Helsinki-NLP MarianMT (en-mul for translation)
  - CardiffNLP Twitter-RoBERTa (Sentiment Analysis)
- **Core Libraries**:
  - PyTorch 2.0.1
  - Transformers 4.31.0
  - Sentencepiece 0.1.99 (Tokenization)

### Deployment
- Vercel (Frontend)
- Docker (AI services)

## Installation

```bash
# Clone repository
git clone https://github.com/yourusername/glimpsegpt.git

# Install dependencies
cd frontend && npm install
cd ../backend && pip install -r requirements.txt
```