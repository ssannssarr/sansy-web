# Sansy Web

Sansy Web is a mobile-first music streaming prototype. The frontend is a static Vite app that provides the player UI, and the backend is a Flask API that searches YouTube, proxies audio streams, returns related tracks, and handles playlist extraction.

## Folder Structure

```text
sansy-web/
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   ├── services/
│   └── tests/
├── frontend/
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── legacy/
├── assets/
├── README.md
└── .gitignore
```

`frontend/legacy/` preserves the older Flask template-based UI files that are no longer part of the active deploy path.

## Local Development

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Frontend:

```bash
cd frontend
cp .env.example .env
```

Set `VITE_API_URL=http://127.0.0.1:5000` in `frontend/.env`, then run:

```bash
npm install
npm run dev
```

The frontend will call `${VITE_API_URL}/api`. If `frontend/dist` exists, `backend/app.py` can also serve the built frontend for local convenience.

## Environment Variables

Frontend:

- `VITE_API_URL`: Base URL of the Flask backend, for example `https://your-backend-url.onrender.com`

Backend:

- `PORT`: Render injects this automatically. Local default is `5000`.

## Deploy Frontend on GitHub Pages

1. Set `VITE_API_URL` to your Render backend URL before building.
2. Build the frontend:

```bash
cd frontend
npm install
npm run build
```

3. Deploy the contents of `frontend/dist/` to GitHub Pages for the `ssannssarr/sansy-web` repository.
4. Keep `frontend/vite.config.js` set to `base: "/sansy-web/"` so the built asset paths match the repository Pages URL.

## Deploy Backend on Render

1. Create a new Render Web Service from this repository.
2. Set the Root Directory to `backend`.
3. Use this build command:

```bash
pip install -r requirements.txt
```

4. Use this start command:

```bash
gunicorn app:app
```

5. Render will provide `PORT`; `backend/app.py` already reads it and binds to `0.0.0.0`.

## Backend API

- `GET /api` returns backend info.
- `GET /api/search?q=<query>&limit=<number>` searches tracks.
- `GET /api/proxy/<video_id>` proxies audio.
- `GET /api/related/<video_id>?limit=20` returns related tracks.
- `GET /api/playlist?url=<youtube_or_ytmusic_url>` extracts playlist items.
- `GET /api/download?q=<query>&fmt=<format>&quality=<value>` returns download metadata.
