import subprocess
import sys
import json
import re
import threading
from services.cache import read_cache, write_cache, STREAM_CACHE_TTL

try:
    import yt_dlp
    HAS_YT_DLP_LIB = True
except ImportError:
    HAS_YT_DLP_LIB = False

SEMAPHORE = threading.Semaphore(3)
VIDEO_ID_RE = re.compile(r'^[a-zA-Z0-9_-]{11}$')
PLAYLIST_URL_RE = re.compile(r'^https://(www\.)?(youtube\.com|music\.youtube\.com)/.*')


def search(query: str, limit: int = 5) -> dict:
    cached = read_cache("search", query)
    if cached is not None:
        return {"query": query, "results": cached, "cached": True}

    results = []
    if HAS_YT_DLP_LIB:
        try:
            ydl_opts = {
                'format': 'bestaudio/best',
                'extract_flat': True,
                'quiet': True,
                'no_warnings': True,
                'nocheckcertificate': True,
                'extractor_args': {'youtubetab': ['skip=authcheck']},
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(f"ytsearch{limit}:{query}", download=False)
                entries = info.get("entries", [])
                for entry in entries:
                    if not entry:
                        continue
                    track = {
                        "id": entry.get("id", ""),
                        "title": entry.get("title", "Unknown"),
                        "artist": entry.get("uploader") or entry.get("channel") or "Unknown",
                        "duration": entry.get("duration") or 0,
                        "thumbnail": entry.get("thumbnail") or f"https://i.ytimg.com/vi/{entry.get('id')}/hqdefault.jpg",
                    }
                    results.append(track)
        except Exception as e:
            results = []

    if not results:
        cmd = [
            sys.executable, "-m", "yt_dlp",
            f"ytsearch{limit}:{query}",
            "--dump-json",
            "--no-playlist",
            "--flat-playlist",
            "--no-warnings",
            "--no-check-certificates",
            "--extractor-args", "youtubetab:skip=authcheck",
        ]

        with SEMAPHORE:
            try:
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
                if result.returncode != 0:
                    raise RuntimeError(result.stderr.strip() or "Search failed")
            except subprocess.TimeoutExpired:
                raise RuntimeError("Search timed out")

        for line in result.stdout.strip().split("\n"):
            if not line:
                continue
            try:
                data = json.loads(line)
                track = {
                    "id": data.get("id", ""),
                    "title": data.get("title", "Unknown"),
                    "artist": data.get("uploader") or data.get("channel") or "Unknown",
                    "duration": data.get("duration") or 0,
                    "thumbnail": data.get("thumbnail") or f"https://i.ytimg.com/vi/{data.get('id')}/hqdefault.jpg",
                }
                results.append(track)
            except json.JSONDecodeError:
                continue

    if not results:
        raise RuntimeError("No results found")

    write_cache("search", query, results)
    return {"query": query, "results": results, "cached": False}


def get_audio_generator(video_id: str):
    if not VIDEO_ID_RE.match(video_id):
        raise ValueError("Invalid video_id format")

    url = f"https://www.youtube.com/watch?v={video_id}"
    cmd = [
        sys.executable, "-m", "yt_dlp",
        url,
        "--format", "bestaudio/best",
        "--no-playlist",
        "--no-warnings",
        "--no-check-certificates",
        "--output", "-",
        "--extractor-args", "youtubetab:skip=authcheck",
    ]

    with SEMAPHORE:
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            bufsize=8192
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


def get_audio_url(video_id: str) -> str:
    if not VIDEO_ID_RE.match(video_id):
        raise ValueError("Invalid video_id format")

    cached = read_cache("stream", video_id, STREAM_CACHE_TTL)
    if cached:
        return cached["url"]

    stream_url = ""
    if HAS_YT_DLP_LIB:
        try:
            ydl_opts = {
                'format': 'bestaudio/best',
                'noplaylist': True,
                'quiet': True,
                'no_warnings': True,
                'nocheckcertificate': True,
                'extractor_args': {'youtubetab': ['skip=authcheck']},
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
                stream_url = info.get("url", "")
        except Exception as e:
            stream_url = ""

    if not stream_url:
        url = f"https://www.youtube.com/watch?v={video_id}"
        cmd = [
            sys.executable, "-m", "yt_dlp",
            url,
            "--format", "bestaudio/best",
            "--no-playlist",
            "--no-warnings",
            "--no-check-certificates",
            "--get-url",
            "--extractor-args", "youtubetab:skip=authcheck",
        ]

        with SEMAPHORE:
            try:
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
                if result.returncode != 0:
                    raise RuntimeError(result.stderr.strip() or "Stream URL extraction failed")
            except subprocess.TimeoutExpired:
                raise RuntimeError("Stream URL extraction timed out")

        stream_url = next((line.strip() for line in result.stdout.splitlines() if line.strip()), "")

    if not stream_url:
        raise RuntimeError("No stream URL found")

    write_cache("stream", video_id, {"url": stream_url})
    return stream_url


def get_related_tracks(video_id: str, max_items: int = 20) -> list[dict]:
    if not VIDEO_ID_RE.match(video_id):
        raise ValueError("Invalid video_id format")

    cached = read_cache("related", video_id, STREAM_CACHE_TTL)
    if cached is not None:
        return cached[:max_items]

    url = f"https://music.youtube.com/watch?v={video_id}&list=RDAMVM{video_id}"
    cmd = [
        sys.executable, "-m", "yt_dlp",
        url,
        "--flat-playlist",
        "--dump-json",
        "--no-warnings",
        "--no-check-certificates",
        "--playlist-end", str(max_items + 1),
        "--extractor-args", "youtubetab:skip=authcheck",
    ]

    with SEMAPHORE:
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=35)
            if result.returncode != 0:
                raise RuntimeError(result.stderr.strip() or "Related extraction failed")
        except subprocess.TimeoutExpired:
            raise RuntimeError("Related extraction timed out")

    tracks = []
    seen = {video_id}
    for line in result.stdout.strip().split("\n"):
        if not line:
            continue
        try:
            data = json.loads(line)
        except json.JSONDecodeError:
            continue

        track_id = data.get("id", "")
        if not VIDEO_ID_RE.match(track_id) or track_id in seen:
            continue
        seen.add(track_id)

        thumbnails = data.get("thumbnails") or []
        thumbnail = data.get("thumbnail") or (
            thumbnails[-1].get("url") if thumbnails else f"https://i.ytimg.com/vi/{track_id}/hqdefault.jpg"
        )
        tracks.append({
            "id": track_id,
            "title": data.get("title", "Unknown"),
            "artist": data.get("uploader") or data.get("channel") or "Unknown",
            "duration": data.get("duration") or 0,
            "thumbnail": thumbnail,
        })
        if len(tracks) >= max_items:
            break

    if not tracks:
        raise RuntimeError("No related tracks found")

    write_cache("related", video_id, tracks)
    return tracks


def extract_playlist(url: str, max_items: int = 50) -> list[dict]:
    if not PLAYLIST_URL_RE.match(url):
        raise ValueError("Invalid playlist URL – only YouTube / YT Music links allowed")

    cmd = [
        sys.executable, "-m", "yt_dlp",
        url,
        "--flat-playlist",
        "--dump-json",
        "--no-warnings",
        "--no-check-certificates",
        "--playlist-end", str(max_items),
        "--extractor-args", "youtubetab:skip=authcheck",
    ]

    with SEMAPHORE:
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            if result.returncode != 0:
                raise RuntimeError(result.stderr.strip() or "Playlist extraction failed")
        except subprocess.TimeoutExpired:
            raise RuntimeError("Playlist extraction timed out")

    tracks = []
    for line in result.stdout.strip().split("\n"):
        if not line:
            continue
        try:
            data = json.loads(line)
            track = {
                "id": data.get("id", ""),
                "title": data.get("title", "Unknown"),
                "artist": data.get("uploader") or data.get("channel") or "Unknown",
                "duration": data.get("duration") or 0,
                "thumbnail": data.get("thumbnail") or f"https://i.ytimg.com/vi/{data.get('id')}/hqdefault.jpg",
            }
            tracks.append(track)
        except json.JSONDecodeError:
            continue

    if not tracks:
        raise RuntimeError("No tracks found in playlist")
    return tracks


def get_home_sections() -> dict:
    return {
        "sections": [
            {
                "title": "Trending",
                "type": "trending",
                "items": [
                    {
                        "id": "dQw4w9WgXcQ",
                        "title": "Never Gonna Give You Up",
                        "artist": "Rick Astley",
                        "duration": 212,
                        "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
                    },
                    {
                        "id": "kJQP7kiw5Fk",
                        "title": "Despacito",
                        "artist": "Luis Fonsi",
                        "duration": 282,
                        "thumbnail": "https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg"
                    }
                ]
            },
            {
                "title": "Quick Play",
                "type": "quick_play",
                "items": [
                    {
                        "id": "3tmd-ClpJxA",
                        "title": "Shape of You",
                        "artist": "Ed Sheeran",
                        "duration": 233,
                        "thumbnail": "https://i.ytimg.com/vi/3tmd-ClpJxA/hqdefault.jpg"
                    }
                ]
            },
            {
                "title": "Recently Played",
                "type": "recently_played",
                "items": []
            }
        ]
    }
