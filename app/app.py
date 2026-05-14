import re
import requests
import urllib3
from flask import Flask, request, jsonify, Response, stream_with_context, render_template, send_from_directory
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from services.youtube import (
    search,
    get_audio_generator,
    get_audio_url,
    get_related_tracks,
    extract_playlist,
    get_home_sections,
    VIDEO_ID_RE
)

app = Flask(__name__, static_folder='static', template_folder='templates')
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


@app.route("/api/search")
@limiter.limit("30 per minute")
def search_route():
    q = request.args.get("q", "").strip()
    if not q:
        return jsonify({"error": "Missing query parameter 'q'"}), 400
    try:
        limit = min(int(request.args.get("limit", 5)), 25)
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
        headers = {}
        if request.headers.get("Range"):
            headers["Range"] = request.headers["Range"]

        upstream = requests.get(
            get_audio_url(video_id),
            headers=headers,
            stream=True,
            timeout=30,
            verify=False,
        )
        upstream.raise_for_status()

        response_headers = {
            "Accept-Ranges": upstream.headers.get("Accept-Ranges", "bytes"),
            "Cache-Control": "no-cache",
        }
        for header in ("Content-Length", "Content-Range"):
            if upstream.headers.get(header):
                response_headers[header] = upstream.headers[header]

        return Response(
            stream_with_context(upstream.iter_content(chunk_size=8192)),
            status=upstream.status_code,
            mimetype=upstream.headers.get("Content-Type", "audio/mpeg").split(";")[0],
            headers=response_headers,
            direct_passthrough=True,
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


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


# ── Frontend routes (SPA fallback) ───────────────────────
# Serve the SPA index.html for any non-API path
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def spa(path):
    # Let the frontend handle all routing
    return send_from_directory(app.static_folder, "index.html")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8765, debug=False)
