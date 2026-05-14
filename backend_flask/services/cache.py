import json
import os
import time
import hashlib

CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "cache")
os.makedirs(CACHE_DIR, exist_ok=True)

CACHE_TTL = 3600           # 1 hour for search
STREAM_CACHE_TTL = 1800    # 30 minutes for stream URLs


def _cache_key(prefix: str, key: str) -> str:
    raw = f"{prefix}_{key}".encode()
    return hashlib.sha256(raw).hexdigest()


def read_cache(prefix: str, key: str, ttl: int = CACHE_TTL) -> dict | None:
    cache_file = os.path.join(CACHE_DIR, _cache_key(prefix, key) + ".json")
    if not os.path.exists(cache_file):
        return None
    try:
        with open(cache_file, "r") as f:
            data = json.load(f)
        if time.time() - data.get("timestamp", 0) > ttl:
            os.remove(cache_file)
            return None
        return data["payload"]
    except (json.JSONDecodeError, KeyError):
        if os.path.exists(cache_file):
            os.remove(cache_file)
        return None


def write_cache(prefix: str, key: str, payload: dict):
    cache_file = os.path.join(CACHE_DIR, _cache_key(prefix, key) + ".json")
    data = {
        "timestamp": time.time(),
        "payload": payload
    }
    with open(cache_file, "w") as f:
        json.dump(data, f)
