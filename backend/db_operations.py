from typing import Optional, Dict, Any
from datetime import datetime
from db_config import transcripts_collection, summaries_collection, audio_metadata_collection
from models import Transcript, Summary, AudioMetadata

async def save_transcript(transcript: Transcript) -> str:
    """Save transcript to MongoDB and return the video_id"""
    result = transcripts_collection.insert_one(transcript.dict())
    return str(result.inserted_id)

async def save_summary(summary: Summary) -> str:
    """Save summary to MongoDB and return the video_id"""
    result = summaries_collection.insert_one(summary.dict())
    return str(result.inserted_id)

async def save_audio_metadata(metadata: AudioMetadata) -> str:
    """Save audio metadata to MongoDB and return the video_id"""
    result = audio_metadata_collection.insert_one(metadata.dict())
    return str(result.inserted_id)

async def get_transcript(video_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve transcript by video_id"""
    return transcripts_collection.find_one({"video_id": video_id})

async def get_summary(video_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve summary by video_id"""
    return summaries_collection.find_one({"video_id": video_id})

async def get_audio_metadata(video_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve audio metadata by video_id"""
    return audio_metadata_collection.find_one({"video_id": video_id})

async def update_transcript(video_id: str, update_data: Dict[str, Any]) -> bool:
    """Update transcript by video_id"""
    result = transcripts_collection.update_one(
        {"video_id": video_id},
        {"$set": update_data}
    )
    return result.modified_count > 0

async def update_summary(video_id: str, update_data: Dict[str, Any]) -> bool:
    """Update summary by video_id"""
    result = summaries_collection.update_one(
        {"video_id": video_id},
        {"$set": update_data}
    )
    return result.modified_count > 0

async def delete_transcript(video_id: str) -> bool:
    """Delete transcript by video_id"""
    result = transcripts_collection.delete_one({"video_id": video_id})
    return result.deleted_count > 0

async def delete_summary(video_id: str) -> bool:
    """Delete summary by video_id"""
    result = summaries_collection.delete_one({"video_id": video_id})
    return result.deleted_count > 0

async def delete_audio_metadata(video_id: str) -> bool:
    """Delete audio metadata by video_id"""
    result = audio_metadata_collection.delete_one({"video_id": video_id})
    return result.deleted_count > 0 