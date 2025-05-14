from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DATABASE_NAME = "glimpse-db"

client = MongoClient(MONGODB_URI)
db = client[DATABASE_NAME]

# Collections
transcripts_collection = db["transcripts"]
summaries_collection = db["summaries"]
audio_metadata_collection = db["glimpse-collection"]

def init_db():
    """Initialize database indexes and other setup if needed"""
    # Create indexes for faster queries
    transcripts_collection.create_index("video_id")
    summaries_collection.create_index("video_id")
    audio_metadata_collection.create_index("video_id") 