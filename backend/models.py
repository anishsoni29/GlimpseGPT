from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

class SentimentData(BaseModel):
    label: float
    score: float

class Transcript(BaseModel):
    video_id: str
    text: str
    language: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    duration: Optional[float] = None
    segments: Optional[List[Dict[str, Any]]] = None

class Summary(BaseModel):
    video_id: str
    text: str
    language: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    sentiment: Optional[SentimentData] = None
    key_points: Optional[List[str]] = None

class AudioMetadata(BaseModel):
    video_id: str
    title: Optional[str] = None
    duration: Optional[float] = None
    format: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    file_path: str
    file_size: Optional[int] = None 