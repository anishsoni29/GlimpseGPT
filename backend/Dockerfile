FROM python:3.10-slim

WORKDIR /app

# Install system dependencies required for PyTorch, audio processing and ffmpeg
RUN apt-get update && apt-get install -y \
    build-essential \
    ffmpeg \
    libsm6 \
    libxext6 \
    libssl-dev \
    libffi-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js for supabase-js
RUN apt-get update && apt-get install -y \
    curl \
    && curl -sL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy package.json and install Node dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy the rest of the application
COPY . .

# Expose the port FastAPI will run on
EXPOSE 8000

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV TOKENIZERS_PARALLELISM=false

# Start the FastAPI server with uvicorn
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"] 