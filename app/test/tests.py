#!/usr/bin/env python3
"""Simple integration tests for the Sansy Flask backend."""
import requests
import sys

BASE = "http://localhost:8765/api"
TIMEOUT = 15

def test_endpoint(name, method, path, params=None, expected_status=200, assert_fn=None):
    try:
        if method == "GET":
            resp = requests.get(f"{BASE}{path}", params=params, timeout=TIMEOUT)
        else:
            raise ValueError(f"Unsupported method {method}")

        if resp.status_code == expected_status:
            print(f"✓ {name} — status {resp.status_code}")
        else:
            print(f"✗ {name} — expected {expected_status}, got {resp.status_code}")
            print(f"  Response: {resp.text[:200]}")
            return False

        if assert_fn:
            assert_fn(resp)

        return True
    except requests.exceptions.ConnectionError:
        print(f"✗ {name} — server not reachable. Is it running on {BASE}?")
        return False
    except AssertionError as e:
        print(f"✗ {name} — assertion failed: {e}")
        return False
    except Exception as e:
        print(f"✗ {name} — error: {e}")
        return False


def main():
    results = []

    # 1. API root
    def api_root_assert(r):
        assert "service" in r.json()
    results.append(test_endpoint("API Root", "GET", "/", assert_fn=api_root_assert))

    # 2. Search (valid - testing larger limit for infinite scroll)
    def search_assert(r):
        # We now want to support up to 50 results for the client-side paging plan
        assert len(r.json()["results"]) > 0
    results.append(test_endpoint(
        "Search (valid - large limit)", "GET", "/search",
        params={"q": "Rick Astley Never Gonna", "limit": 50},
        assert_fn=search_assert
    ))

    # 3. Search missing param
    results.append(test_endpoint(
        "Search (missing q)", "GET", "/search",
        expected_status=400
    ))

    # 4. Proxy valid video_id
    def proxy_valid_assert(r):
        assert "audio" in r.headers.get("content-type", "")
    results.append(test_endpoint(
        "Proxy (valid)", "GET", "/proxy/dQw4w9WgXcQ",
        assert_fn=proxy_valid_assert
    ))

    # 5. Proxy invalid video_id
    results.append(test_endpoint(
        "Proxy (invalid id)", "GET", "/proxy/bad",
        expected_status=400
    ))

    # 6. Playlist extraction (valid)
    def playlist_assert(r):
        assert len(r.json()["tracks"]) > 0
    results.append(test_endpoint(
        "Playlist (valid)", "GET", "/playlist",
        params={"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"},
        assert_fn=playlist_assert
    ))

    # 7. Playlist invalid URL
    results.append(test_endpoint(
        "Playlist (invalid URL)", "GET", "/playlist",
        params={"url": "file:///etc/passwd"},
        expected_status=400
    ))

    # 8. Playlist missing param
    results.append(test_endpoint(
        "Playlist (missing url)", "GET", "/playlist",
        expected_status=400
    ))

    # 9. Download (placeholder)
    def download_assert(r):
        assert "filename" in r.json()
    results.append(test_endpoint(
        "Download (valid)", "GET", "/download",
        params={"q": "test song", "fmt": "mp3", "quality": "320k"},
        assert_fn=download_assert
    ))

    # 10. Frontend SPA page (HTML)
    results.append(test_endpoint(
        "SPA root page", "GET", "/../", expected_status=200,
        assert_fn=lambda r: None   # we just want 200, any content is fine
    ))

    # Summary
    total = len(results)
    passed = sum(results)
    print(f"{'─' * 30}{passed}/{total} tests passed")
    sys.exit(0 if passed == total else 1)


if __name__ == "__main__":
    main()
