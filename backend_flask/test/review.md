# Backend & Frontend Review Report

## Backend Review Verdict

### Security Score: 3/10
- **SSL Verification Disabled (Critical):** `app.py` uses `verify=False` for upstream streaming requests. This is a high-risk security flaw.
- **Deceptive Stub (Medium):** The `/api/download` endpoint returns a fake success message and a hardcoded path without performing any actual download.
- **Path Disclosure (Low):** The download stub exposes internal directory structure (`~/sansy/...`).
- **No Authentication (Medium):** All endpoints, including the streaming proxy, are open to the public without any authorization.

### Future Compatibility Score: 4/10
- **Semaphore Bottleneck:** A global semaphore in `youtube.py` restricts `yt-dlp` to 3 concurrent processes, which will cause request queuing and timeouts under load.
- **Blocking I/O:** Flask threads are blocked by `subprocess.run` calls, preventing efficient handling of concurrent users.
- **Local Cache:** `services/cache.py` uses local JSON files, making it impossible to share cache across multiple server instances.

### Overall Score: 3.5/10
The backend is suitable for local development only. Disabling SSL verification and the lack of asynchronous task handling make it unfit for production.

### Recommendations
1. **Fix first:** Enable SSL verification (`verify=True`) in `app.py` and remove the warning suppression.
2. **Next:** Implement a task queue (like Celery) or switch to an async framework to handle long-running `yt-dlp` tasks.
3. **Then:** Replace file-based caching with Redis to allow for scaling.

---

## Frontend Entrypoint Compatibility Report

| Frontend Call | Method | Backend Route | Method | Match? | Issue |
|---|---|---|---|---|---|
| `/api/search` | GET | `/api/search` | GET | ✅ | — |
| `/api/proxy/<id>` | GET | `/api/proxy/<video_id>` | GET | ✅ | — |
| `/api/related/<id>` | GET | `/api/related/<video_id>` | GET | ✅ | — |
| `/api/download` | GET | `/api/download` | GET | ✅ | Backend is a stub (fake success) |
| — | — | `/api/playlist` | GET | ❌ | Backend exists but is unused by UI |

### Summary
- **4 / 5** functional endpoints match correctly in `static/index.html`.
- **Orphaned Code:** Files in `static/js/` are not imported and contain redundant logic.
- **Recommended Fixes:** 
    1. Consolidate JS logic from `index.html` into the external files and import them.
    2. Implement actual download logic in `app.py`.
    3. Add UI support for the existing `/api/playlist` endpoint.
    4. Implement XSS protection when rendering track titles via `innerHTML`.
