import os
from pathlib import Path
import urllib3
from flask import Flask, request, jsonify, Response, stream_with_context, send_from_directory
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from services.youtube import (
    search,
    stream_audio,
    get_related_tracks,
    extract_playlist,
    VIDEO_ID_RE
)

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"

app = Flask(__name__)
CORS(app)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["60 per minute"],
    storage_uri="memory://"
)


# ── API Routes (all under /api) ──────────────────────────
@app.route("/api")
@app.route("/api/")
def api_root():
    return jsonify({"service": "Sansy Backend (Flask)", "version": "2.2.0"})


@app.route("/api/health")
def api_health():
    return jsonify({"status": "ok"})


@app.route("/api/search")
@limiter.limit("30 per minute")
def search_route():
    q = request.args.get("q", "").strip()
    if not q:
        return jsonify({"error": "Missing query parameter 'q'"}), 400
    try:
        limit = min(int(request.args.get("limit", 5)), 50)
    except ValueError:
        limit = 5
    try:
        data = search(q, limit)
        return jsonify(data)
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/proxy/<video_id>")
@limiter.limit("120 per minute")
def proxy_stream(video_id):
    if not VIDEO_ID_RE.match(video_id):
        return jsonify({"error": "Invalid video_id format"}), 400
    try:
        return Response(
            stream_with_context(stream_audio(video_id)),
            status=200,
            mimetype="audio/webm",
            headers={
                "Accept-Ranges": "none",
                "Cache-Control": "no-cache",
            },
            direct_passthrough=True,
        )
    except Exception as e:
        return Response(f"Proxy error: {str(e)}", status=500, mimetype="text/plain")


@app.route("/api/related/<video_id>")
@limiter.limit("30 per minute")
def related_route(video_id):
    if not VIDEO_ID_RE.match(video_id):
        return jsonify({"error": "Invalid video_id format"}), 400
    try:
        limit = min(int(request.args.get("limit", 20)), 20)
    except ValueError:
        limit = 20
    try:
        return jsonify({"video_id": video_id, "results": get_related_tracks(video_id, limit)})
    except (ValueError, RuntimeError) as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/playlist")
@limiter.limit("20 per minute")
def playlist_route():
    url = request.args.get("url", "").strip()
    if not url:
        return jsonify({"error": "Missing 'url' parameter"}), 400
    try:
        tracks = extract_playlist(url)
        return jsonify({"url": url, "tracks": tracks})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/download")
@limiter.limit("10 per minute")
def download_route():
    q = request.args.get("q", "").strip()
    fmt = request.args.get("fmt", "mp3")
    quality = request.args.get("quality", "320k")
    return jsonify({
        "filename": f"{q.replace(' ', '_')}.{fmt}",
        "path": f"~/sansy/sansy_downloads/{q.replace(' ', '_')}.{fmt}",
        "message": "Download endpoint ready"
    })


# ── Frontend routes (optional local fallback) ────────────
@app.route("/", defaults={"path": ""})
@app.route("/sansy-web", defaults={"path": ""})
@app.route("/sansy-web/<path:path>")
@app.route("/<path:path>")
def spa(path):
    if FRONTEND_DIST.exists():
        if path.startswith("sansy-web/"):
            path = path.removeprefix("sansy-web/")
        target = FRONTEND_DIST / path
        if path and target.exists() and target.is_file():
            return send_from_directory(FRONTEND_DIST, path)
        return send_from_directory(FRONTEND_DIST, "index.html")
    return jsonify({
        "service": "Sansy Backend (Flask)",
        "frontend": "Build frontend/dist or run the Vite dev server separately.",
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
