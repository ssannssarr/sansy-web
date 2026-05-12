from fastapi import APIRouter, Query, HTTPException
from models import SearchResponse, ErrorResponse
from services.search_service import search_youtube

router = APIRouter(tags=["Search"])


@router.get(
    "/search",
    response_model=SearchResponse,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse}
    },
    summary="Search YouTube",
    description="Returns matching tracks with video IDs"
)
async def search(
    q: str = Query(..., min_length=1, max_length=200, description="Search query"),
    limit: int = Query(5, ge=1, le=20, description="Max results"),
):
    try:
        results, cached = search_youtube(query=q, limit=limit)
        return SearchResponse(query=q, results=results, cached=cached)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
