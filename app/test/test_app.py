#!/usr/bin/env python3
"""Pytest coverage for the Sansy Flask backend."""

from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[2]
APP_DIR = ROOT / "app"
if str(APP_DIR) not in sys.path:
    sys.path.insert(0, str(APP_DIR))
import app as app_module


class DummyUpstreamResponse:
    status_code = 200
    headers = {
        "Accept-Ranges": "bytes",
        "Content-Length": "5",
        "Content-Type": "audio/webm",
    }

    def raise_for_status(self):
        return None

    def iter_content(self, chunk_size=8192):
        yield b"audio"


def test_api_root():
    client = app_module.app.test_client()
    response = client.get("/api/")

    assert response.status_code == 200
    assert response.get_json()["service"] == "Sansy Backend (Flask)"


def test_search_valid(monkeypatch):
    client = app_module.app.test_client()

    monkeypatch.setattr(
        app_module,
        "search",
        lambda q, limit: {
            "query": q,
            "results": [{"id": "abc123def45", "title": "Track"}],
            "cached": False,
        },
    )

    response = client.get("/api/search?q=Rick%20Astley&limit=50")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["query"] == "Rick Astley"
    assert len(payload["results"]) == 1


def test_search_missing_query():
    client = app_module.app.test_client()
    response = client.get("/api/search")

    assert response.status_code == 400
    assert "Missing query parameter" in response.get_json()["error"]


def test_proxy_valid(monkeypatch):
    client = app_module.app.test_client()

    monkeypatch.setattr(app_module, "get_audio_url", lambda video_id: "https://example.test/audio")
    monkeypatch.setattr(app_module.requests, "get", lambda *args, **kwargs: DummyUpstreamResponse())

    response = client.get("/api/proxy/dQw4w9WgXcQ")

    assert response.status_code == 200
    assert response.headers["Content-Type"] == "audio/webm"
    assert response.data == b"audio"


def test_proxy_invalid_video_id():
    client = app_module.app.test_client()
    response = client.get("/api/proxy/bad")

    assert response.status_code == 400
    assert "Invalid video_id format" in response.get_json()["error"]


def test_related_valid(monkeypatch):
    client = app_module.app.test_client()

    monkeypatch.setattr(
        app_module,
        "get_related_tracks",
        lambda video_id, limit: [{"id": "abc123def45", "title": "Related"}],
    )

    response = client.get("/api/related/dQw4w9WgXcQ?limit=3")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["video_id"] == "dQw4w9WgXcQ"
    assert len(payload["results"]) == 1


def test_playlist_valid(monkeypatch):
    client = app_module.app.test_client()

    monkeypatch.setattr(
        app_module,
        "extract_playlist",
        lambda url: [{"id": "abc123def45", "title": "Playlist Track"}],
    )

    response = client.get("/api/playlist?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ")

    assert response.status_code == 200
    assert len(response.get_json()["tracks"]) == 1


def test_playlist_invalid_url():
    client = app_module.app.test_client()
    response = client.get("/api/playlist?url=file:///etc/passwd")

    assert response.status_code == 400
    assert "Invalid playlist URL" in response.get_json()["error"]


def test_playlist_missing_url():
    client = app_module.app.test_client()
    response = client.get("/api/playlist")

    assert response.status_code == 400
    assert "Missing 'url' parameter" in response.get_json()["error"]


def test_download_valid():
    client = app_module.app.test_client()
    response = client.get("/api/download?q=test%20song&fmt=mp3&quality=320k")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["filename"] == "test_song.mp3"
    assert "Download endpoint ready" in payload["message"]


def test_spa_root_page():
    client = app_module.app.test_client()
    response = client.get("/")

    assert response.status_code == 200
    assert b"<!DOCTYPE html>" in response.data
