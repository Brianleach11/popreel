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
            if embeddings:  # Only process and commit if we received messages
                for embedding in embeddings:
                    # Add to Pinecone
                    success = await add_to_pinecone(embedding)
                    if not success:
                        print(f"Failed to process video embedding for video {embedding.id}")
                # Commit offset after successful processing of batch
                consumer.commit()
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
            
            if interactions_by_user:  # Only process and commit if we received messages
                success = True
                for user_id, interactions in interactions_by_user.items():
                    # Update user embeddings
                    video_ids = [i.videoId for i in interactions]
                    video_embeddings = await get_video_embeddings(video_ids)
                    interactions_with_video_embeddings = zip(interactions, video_embeddings)
                    result = await update_user_embedding(user_id, interactions_with_video_embeddings)
                    if not result:
                        print(f"Failed to process interactions for user {user_id}")
                        success = False
                
                # Only commit if all users were processed successfully
                if success:
                    consumer.commit()
                    print("Successfully committed offset after processing interactions")
            
            await asyncio.sleep(60)  # Poll every minute
    finally:
        consumer.close()

async def get_video_embeddings(video_ids: List[str]) -> List[dict]:
    if not video_ids:
        return []
    pool = await get_db()

    query = """
    SELECT id, embedding 
    FROM videos
    WHERE id = ANY($1)
    """
    async with pool.acquire() as conn:
        rows = await conn.fetch(query, video_ids)
        if not rows:
            return []
        
        # Convert each row to a dict and parse the embedding string into a list of floats
        processed_rows = []
        for row in rows:
            row_dict = dict(row)
            if row_dict['embedding']:
                # Remove brackets and split by comma
                embedding_str = row_dict['embedding'].strip('[]')
                embedding_floats = [float(x.strip()) for x in embedding_str.split(',')]
                row_dict['embedding'] = embedding_floats
            processed_rows.append(row_dict)
            
        return processed_rows


# Start both consumers
async def run_consumers():
    await asyncio.gather(
        process_video_embeddings(),
        process_interactions()
    )

if __name__ == "__main__":
    asyncio.run(run_consumers())

