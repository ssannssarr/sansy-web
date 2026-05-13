from pydantic import BaseModel
from typing import Optional

# ── Search ──────────────────────────
class SearchRequest(BaseModel):
    q: str
    limit: Optional[int] = 5


class TrackResult(BaseModel):
    id: str
    title: str
    artist: str
    duration: int
    thumbnail: str
    url: Optional[str] = None


class SearchResponse(BaseModel):
    query: str
    results: list[TrackResult]
    cached: bool = False

# ── Stream ─────────────────────────
class StreamInfo(BaseModel):
    video_id: str
    title: str
    artist: str
    duration: int
    thumbnail: str
    audio_url: str  # Direct stream URL
    cached: bool = False



# ── Error ───────────────────────────
class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
