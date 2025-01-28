# services/ml_consumer.py
from typing import List, Optional
from routes.kafka_client import get_kafka_client, Topics
import asyncio
from services.ml_processor import add_to_pinecone, update_user_embedding
from db.connection import get_db

async def process_video_embeddings():
    client = get_kafka_client()
    consumer = client.create_consumer("video-processor")
    consumer.subscribe([Topics.VIDEO_EMBEDDINGS])
    
    try:
        while True:
            embeddings = client.consume_video_embeddings(consumer)
            for embedding in embeddings:
                # Add to Pinecone
                await add_to_pinecone(embedding)
            await asyncio.sleep(1)  # Poll every second
    finally:
        consumer.close()

async def process_interactions():
    client = get_kafka_client()
    consumer = client.create_consumer("interaction-processor")
    consumer.subscribe([Topics.VIDEO_INTERACTIONS])
    
    try:
        while True:
            # Get interactions grouped by user
            interactions_by_user = client.consume_interactions_by_user(consumer)
            
            for user_id, interactions in interactions_by_user.items():
                # Update user embeddings
                video_ids = [i.videoId for i in interactions]
                video_embeddings = await get_video_embeddings(video_ids)
                interactions_with_video_embeddings = zip(interactions, video_embeddings)
                await update_user_embedding(user_id, interactions_with_video_embeddings)
            await asyncio.sleep(60)  # Poll every day
    finally:
        consumer.close()

async def get_video_embeddings(video_ids: List[str]) -> List[dict]:
    if not video_ids:
        return []
    pool = await get_db()

    query = """
    SELECT id, embedding 
    FROM video_embeddings
    WHERE id = ANY($1)
    """
    async with pool.acquire() as conn:
        rows = await conn.execute(query, video_ids)
        if not rows:
            return []
        return [dict(row) for row in rows]


# Start both consumers
async def run_consumers():
    await asyncio.gather(
        process_video_embeddings(),
        process_interactions()
    )

if __name__ == "__main__":
    asyncio.run(run_consumers())

