from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from models import StreamInfo, ErrorResponse
from services.stream_service import resolve_stream_url, get_audio_stream

router = APIRouter(tags=["Stream"])


@router.get(
    "/stream/{video_id}",
    response_model=StreamInfo,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse}
    },
    summary="Get stream info",
    description="Resolves the direct audio URL for a video ID"
)
async def stream_info(video_id: str):
    """Returns stream metadata including direct audio URL."""
    try:
        info, cached = resolve_stream_url(video_id)
        info.cached = cached
        return info
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/proxy/{video_id}",
    responses={
        200: {
            "content": {"audio/mpeg": {}},
            "description": "Audio stream"
        },
        500: {"model": ErrorResponse}
    },
    summary="Proxy audio stream",
    description="Streams audio directly to the client"
)
async def proxy_stream(video_id: str):
    """Proxies the audio stream through the backend."""
    try:
        return StreamingResponse(
            get_audio_stream(video_id),
            media_type="audio/mpeg",
            headers={
                "Accept-Ranges": "bytes",
                "Cache-Control": "no-cache",
                "Access-Control-Allow-Origin": "*",
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
