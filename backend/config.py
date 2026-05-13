import os

# Server
HOST = "0.0.0.0"
PORT = 8765

# Cache
CACHE_DIR = os.path.join(os.path.dirname(__file__), "cache")
CACHE_TTL = 3600  # 1 hour in seconds

# Search
SEARCH_LIMIT = 5  # Max results per search

#Stream 
STREAM_CACHE_TTL = 1800 # 30 minutes (stream URLs expire faster)
