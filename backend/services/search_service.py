import json
import os
import hashlib
import subprocess
import sys
import time
from typing import Optional

from config import CACHE_DIR, CACHE_TTL
from models import TrackResult

os.makedirs(CACHE_DIR, exist_ok=True)


def _cache_key(query: str) -> str:
    return hashlib.md5(query.lower().encode()).hexdigest()


def _read_cache(query: str) -> Optional[list[TrackResult]]:
    cache_file = os.path.join(CACHE_DIR, _cache_key(query) + ".json")
    
    if not os.path.exists(cache_file):
        return None
    
    try:
        with open(cache_file) as f:
            data = json.load(f)
        
        if time.time() - data.get("timestamp", 0) > CACHE_TTL:
            os.remove(cache_file)
            return None
        
        return [TrackResult(**item) for item in data["results"]]
    except (json.JSONDecodeError, KeyError):
        if os.path.exists(cache_file):
            os.remove(cache_file)
        return None


def _write_cache(query: str, results: list[TrackResult]):
    cache_file = os.path.join(CACHE_DIR, _cache_key(query) + ".json")
    data = {
        "timestamp": time.time(),
        "results": [r.dict() for r in results]
    }
    with open(cache_file, "w") as f:
        json.dump(data, f)


def search_youtube(query: str, limit: int = 5) -> tuple[list[TrackResult], bool]:
    """Search YouTube. Returns (results, is_cached)."""
    
    cached = _read_cache(query)
    if cached is not None:
        return cached[:limit], True
    
    cmd = [
        sys.executable, "-m", "yt_dlp",
        f"ytsearch{limit}:{query}",
        "--dump-json",
        "--no-playlist",
        "--flat-playlist",
        "--no-warnings",
        "--extractor-args", "youtubetab:skip=authcheck",
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        if result.returncode != 0:
            raise RuntimeError(result.stderr.strip() or "Search failed")
        
        results = []
        for line in result.stdout.strip().split("\n"):
            if not line:
                continue
            try:
                data = json.loads(line)
                track = TrackResult(
                    id=data.get("id", ""),
                    title=data.get("title", "Unknown"),
                    artist=data.get("uploader") or data.get("channel") or "Unknown",
                    duration=data.get("duration") or 0,
                    thumbnail=data.get("thumbnail") or f"https://i.ytimg.com/vi/{data.get('id')}/hqdefault.jpg",
                    url=data.get("url") or f"https://www.youtube.com/watch?v={data.get('id')}",
                )
                results.append(track)
            except json.JSONDecodeError:
                continue
        
        if not results:
            raise RuntimeError("No results found")
        
        _write_cache(query, results)
        return results, False
        
    except subprocess.TimeoutExpired:
        raise RuntimeError("Search timed out")
