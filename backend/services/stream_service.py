import json
import os
import hashlib
import subprocess
import sys
import time
from typing import Optional

from config import CACHE_DIR, STREAM_CACHE_TTL
from models import StreamInfo

os.makedirs(CACHE_DIR, exist_ok=True)


def _cache_key(video_id: str) -> str:
    return hashlib.md5(f"stream_{video_id}".encode()).hexdigest()


def _read_cache(video_id: str) -> Optional[StreamInfo]:
    cache_file = os.path.join(CACHE_DIR, _cache_key(video_id) + ".json")
    
    if not os.path.exists(cache_file):
        return None
    
    try:
        with open(cache_file) as f:
            data = json.load(f)
        
        if time.time() - data.get("timestamp", 0) > STREAM_CACHE_TTL:
            os.remove(cache_file)
            return None
        
        return StreamInfo(**data["info"])
    except (json.JSONDecodeError, KeyError):
        if os.path.exists(cache_file):
            os.remove(cache_file)
        return None


def _write_cache(video_id: str, info: StreamInfo):
    cache_file = os.path.join(CACHE_DIR, _cache_key(video_id) + ".json")
    data = {
        "timestamp": time.time(),
        "info": info.dict()
    }
    with open(cache_file, "w") as f:
        json.dump(data, f)


def resolve_stream_url(video_id: str) -> tuple[StreamInfo, bool]:
    """
    Resolve direct audio stream URL for a video.
    Returns (StreamInfo, is_cached).
    """
    
    # Check cache
    cached = _read_cache(video_id)
    if cached is not None:
        return cached, True
    
    # Resolve with yt-dlp
    url = f"https://www.youtube.com/watch?v={video_id}"
    cmd = [
        sys.executable, "-m", "yt_dlp",
        url,
        "--dump-json",
        "--no-playlist",
        "--format", "bestaudio/best",
        "--no-warnings",
        "--extractor-args", "youtubetab:skip=authcheck",
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        if result.returncode != 0:
            raise RuntimeError(result.stderr.strip() or "Failed to resolve stream")
        
        data = json.loads(result.stdout)
        
        info = StreamInfo(
            video_id=video_id,
            title=data.get("title", "Unknown"),
            artist=data.get("uploader") or data.get("channel") or "Unknown",
            duration=data.get("duration") or 0,
            thumbnail=data.get("thumbnail") or f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
            audio_url=data.get("url", ""),
        )
        
        if not info.audio_url:
            raise RuntimeError("No audio URL found")
        
        _write_cache(video_id, info)
        return info, False
        
    except subprocess.TimeoutExpired:
        raise RuntimeError("Stream resolution timed out")
    except json.JSONDecodeError:
        raise RuntimeError("Failed to parse stream info")


def get_audio_stream(video_id: str):
    """
    Generator that yields audio chunks for proxying.
    Uses yt-dlp to pipe the audio directly.
    """
    url = f"https://www.youtube.com/watch?v={video_id}"
    cmd = [
        sys.executable, "-m", "yt_dlp",
        url,
        "--format", "bestaudio/best",
        "--no-playlist",
        "--no-warnings",
        "--output", "-",  # stdout
        "--extractor-args", "youtubetab:skip=authcheck",
    ]
    
    proc = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    
    try:
        while True:
            chunk = proc.stdout.read(8192)
            if not chunk:
                break
            yield chunk
    finally:
        proc.kill()
        proc.wait()
