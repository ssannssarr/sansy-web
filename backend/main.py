from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import HOST, PORT
from routes.search import router as search_router
from routes.stream import router as stream_router

app = FastAPI(
    title="Sansy Backend",
    version="1.0.0",
    description="YouTube music search & stream API",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

# Routes
app.include_router(search_router)
app.include_router(stream_router)


@app.get("/")
async def root():
    return {"service": "Sansy Backend", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT)
