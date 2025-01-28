from fastapi import APIRouter, HTTPException, Query
from services.ml_processor import get_pinecone_client
from db.connection import get_db
from fastapi import Depends
import asyncpg
from typing import List

router = APIRouter(prefix="/api/recommendations")

@router.get("")
async def get_recommendations(
    user_id: str = Query(..., description="User ID to get recommendations for"),
    limit: int = Query(20, description="Number of recommendations to return"),
    offset: int = Query(0, description="Offset for pagination"),
    db_pool: asyncpg.Pool = Depends(get_db)
):
    """Get personalized video recommendations for a user"""
    try:
        # Get user's embedding
        async with db_pool.acquire() as conn:
            user_embedding = await conn.fetchrow(
                """
                SELECT embedding 
                FROM user_embeddings 
                WHERE user_id = $1
                """,
                user_id
            )

        if not user_embedding or not user_embedding['embedding']:
            # Return empty list if no user embedding
            return {"videoIds": []}

        # Get recommendations from Pinecone
        pc = get_pinecone_client()
        if not pc:
            raise HTTPException(status_code=500, detail="Pinecone client not available")

        index = pc.Index("video-embeddings")
        query_response = index.query(
            vector=user_embedding['embedding'],
            top_k=limit + offset,  # Get extra for offset
            include_metadata=True
        )

        # Extract video IDs, respecting offset and limit
        video_ids = [match.id for match in query_response.matches[offset:offset + limit]]

        return {"videoIds": video_ids}
    except Exception as e:
        print(f"Error getting recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e)) 