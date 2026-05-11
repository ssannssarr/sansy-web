#!/usr/bin/env python3
"""
Sansy Backend — yt-dlp stream cache + download server
Endpoints consumed by the frontend HTML
"""

import os
import json
import hashlib
import subprocess
import urllib.request
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

CACHE_DIR = "./sansy_cache"
DOWNLOAD_DIR = "./sansy_downloads"
PORT = 8765

os.makedirs(CACHE_DIR, exist_ok=True)
os.makedirs(DOWNLOAD_DIR, exist_ok=True)


def cache_key(query: str) -> str:
    return hashlib.md5(query.encode()).hexdigest()


def get_stream_url(query: str) -> dict:
    """Resolve YouTube stream URL via yt-dlp (no download)."""
    cache_file = os.path.join(CACHE_DIR, cache_key(query) + ".json")

    if os.path.exists(cache_file):
        with open(cache_file) as f:
            return json.load(f)

    cmd = [
        "yt-dlp",
        f"ytsearch1:{query}",
        "--dump-json",
        "--no-playlist",
        "--format", "bestaudio/best",
        "--no-warnings",
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        return {"error": result.stderr.strip()}

    data = json.loads(result.stdout)
    payload = {
        "title":     data.get("title", "Unknown"),
        "artist":    data.get("uploader", "Unknown"),
        "url":       data.get("url"),
        "thumbnail": data.get("thumbnail"),
        "duration":  data.get("duration"),
        "id":        data.get("id"),
    }

    with open(cache_file, "w") as f:
        json.dump(payload, f)

    return payload


def stream_proxy(query: str, response):
    """Pipe yt-dlp audio stream directly to HTTP response."""
    info = get_stream_url(query)
    if "error" in info:
        return info

    stream_url = info["url"]
    req = urllib.request.Request(stream_url, headers={
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://www.youtube.com/"
    })

    with urllib.request.urlopen(req) as audio:
        response.send_response(200)
        response.send_header("Content-Type", "audio/mpeg")
        response.send_header("Access-Control-Allow-Origin", "*")
        response.send_header("Accept-Ranges", "bytes")
        response.end_headers()
        while chunk := audio.read(8192):
            try:
                response.wfile.write(chunk)
            except BrokenPipeError:
                break
    return None


def download_track(query: str, fmt: str = "mp3", quality: str = "320k") -> dict:
    """
    Download audio or video.
    fmt:     'mp3' | 'mp4'
    quality: '320k' | '128k' | '1080p' | '720p' | '480p'
    """
    safe_name = cache_key(query)
    ext = "mp3" if fmt == "mp3" else "mp4"
    out_path = os.path.join(DOWNLOAD_DIR, f"{safe_name}.{ext}")

    if os.path.exists(out_path):
        return {"status": "exists", "path": out_path}

    if fmt == "mp3":
        audio_quality = quality.replace("k", "")  # '320' or '128'
        cmd = [
            "yt-dlp",
            f"ytsearch1:{query}",
            "--no-playlist",
            "-x", "--audio-format", "mp3",
            "--audio-quality", audio_quality,
            "-o", out_path,
            "--no-warnings",
        ]
    else:
        res_map = {"1080p": "1080", "720p": "720", "480p": "480"}
        res = res_map.get(quality, "720")
        cmd = [
            "yt-dlp",
            f"ytsearch1:{query}",
            "--no-playlist",
            "-f", f"bestvideo[height<={res}]+bestaudio/best[height<={res}]",
            "--merge-output-format", "mp4",
            "-o", out_path,
            "--no-warnings",
        ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        return {"error": result.stderr.strip()}

    return {"status": "done", "path": out_path}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass  # silence default logs

    def send_json(self, data: dict, code: int = 200):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", len(body))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        q = params.get("q", [None])[0]

        if not q:
            self.send_json({"error": "Missing ?q= param"}, 400)
            return

        # GET /stream?q=<query>
        if parsed.path == "/stream":
            self.send_json(get_stream_url(q))

        # GET /proxy?q=<query>
        elif parsed.path == "/proxy":
            error = stream_proxy(q, self)
            if error:
                self.send_json(error, 500)

        # GET /download?q=<query>&fmt=mp3&quality=320k
        elif parsed.path == "/download":
            fmt     = params.get("fmt", ["mp3"])[0]
            quality = params.get("quality", ["320k"])[0]
            self.send_json(download_track(q, fmt, quality))

        else:
            self.send_json({"error": "Unknown endpoint"}, 404)


if __name__ == "__main__":
    print(f"[Sansy] Server running → http://localhost:{PORT}")
    print(f"  Cache:     {os.path.abspath(CACHE_DIR)}")
    print(f"  Downloads: {os.path.abspath(DOWNLOAD_DIR)}")
    HTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
