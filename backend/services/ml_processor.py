import os
from typing import List, Dict, Any, Optional, Tuple
from pinecone import Pinecone, ServerlessSpec
from db.connection import get_db
from routes.kafka_client import VideoInteraction, VideoEmbedding
from datetime import datetime
import numpy as np

# Lazy initialization of Pinecone
_pinecone_client = None

# Constants for embedding calculations
EMBEDDING_DIMENSION = 1536  # OpenAI embedding dimension
TIME_DECAY_FACTOR = 0.5  # Halves importance every 30 days

def get_pinecone_client():
    """Get or create Pinecone client"""
    global _pinecone_client
    if _pinecone_client is None:
        api_key = os.getenv('PINECONE_API_KEY')
        if not api_key:
            print("Warning: PINECONE_API_KEY not set")
            return None
        
        _pinecone_client = Pinecone(api_key=api_key)
        
        # Create index if it doesn't exist
        index_name = "video-embeddings"
        try:
            if index_name not in _pinecone_client.list_indexes().names():
                _pinecone_client.create_index(
                    name=index_name,
                    dimension=1536,  # OpenAI embedding dimension
                    spec=ServerlessSpec(
                        cloud="aws",
                        region="us-west-2"
                    )
                )
        except Exception as e:
            print(f"Error creating Pinecone index: {e}")
            return None
            
    return _pinecone_client

async def add_to_pinecone(video: VideoEmbedding) -> bool:
    """
    Add video embedding to Pinecone
    Args:
        video: Video embedding data
    Returns:
        bool: Success status
    """
    try:
        if not video.embedding:
            print(f"No embedding for video {video.id}")
            return False
            
        pc = get_pinecone_client()
        if not pc:
            print("Pinecone client not available")
            return False
            
        index = pc.Index("video-embeddings")

        # Upsert to Pinecone
        index.upsert(
            vectors=[{
                'id': video.id,
                'values': video.embedding,
                'metadata': {
                    'title': video.title,
                    'description': video.description,
                    'userId': video.userId,
                    'duration': video.duration,
                    'trendingScore': video.trendingScore
                }
            }]
        )
        
        # Update video status in database
        db_pool = await get_db()
        async with db_pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE videos 
                SET status = 'ready'
                WHERE id = $1
                """,
                video.id
            )
        
        return True
    except Exception as e:
        print(f"Error adding to Pinecone: {e}")
        return False 
    

async def update_user_embedding(user_id: str, interactions_with_video_embeddings: List[Tuple[VideoInteraction, List[float] | None]]) -> bool:
    """
    Update user embedding based on their video interactions
    Args:
        user_id: ID of the user
        interactions_with_video_embeddings: List of tuples containing video interactions and their embeddings
    Returns:
        bool: Success status
    """
    try:
        # Get current user embedding if it exists
        current_user_embedding = await get_user_embedding(user_id)
        
        # Generate new embedding from interactions
        delta_embedding = await generate_delta_embedding(interactions_with_video_embeddings)
        if not delta_embedding:
            print(f"No valid delta embedding generated for user {user_id}")
            return False
            
        if not current_user_embedding:
            # First time user - use delta embedding as is
            new_embedding = delta_embedding
        else:
            # Merge existing embedding with delta
            new_embedding = merge_embeddings(current_user_embedding, delta_embedding)
        
        # Update in database
        db_pool = await get_db()
        async with db_pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO user_embeddings (user_id, embedding, last_updated)
                VALUES ($1, $2, NOW())
                ON CONFLICT (user_id) 
                DO UPDATE SET 
                    embedding = $2,
                    last_updated = NOW()
                """,
                user_id,
                new_embedding
            )
        return True
    except Exception as e:
        print(f"Error updating user embedding: {e}")
        return False

async def get_user_embedding(user_id: str) -> Optional[List[float]]:
    """
    Get user embedding and apply time decay
    Args:
        user_id: ID of the user
    Returns:
        Optional[List[float]]: Time-decayed user embedding or None if not found
    """
    db_pool = await get_db()
    async with db_pool.acquire() as conn:
        result = await conn.fetchrow(
            """
            SELECT embedding, last_updated 
            FROM user_embeddings 
            WHERE user_id = $1
            """, 
            user_id
        )
        
        if not result or not result['embedding']:
            return None
            
        # Apply time decay
        days_since_update = (datetime.now() - result['last_updated']).days
        decay_factor = np.power(TIME_DECAY_FACTOR, days_since_update / 30)  # Decay over 30-day periods
        return [x * decay_factor for x in result['embedding']]

async def generate_delta_embedding(interactions_with_video_embeddings: List[Tuple[VideoInteraction, List[float] | None]]) -> Optional[List[float]]:
    """
    Generate delta embedding based on video interactions
    Args:
        interactions_with_video_embeddings: List of tuples containing video interactions and their embeddings
    Returns:
        Optional[List[float]]: Weighted average embedding based on interactions
    """
    if not interactions_with_video_embeddings:
        return None
        
    weighted_embeddings = []
    total_weight = 0
    
    for interaction, video_embedding in interactions_with_video_embeddings:
        if not video_embedding:
            continue
            
        # Use the pre-calculated weightedScore
        weight = interaction.weightedScore
            
        # Apply time decay to the interaction
        interaction_time = datetime.fromisoformat(interaction.timestamp)
        days_since_interaction = (datetime.now() - interaction_time).days
        decay_factor = np.power(TIME_DECAY_FACTOR, days_since_interaction / 30)
        weight *= decay_factor
        
        # Add weighted embedding
        weighted_embeddings.append([x * weight for x in video_embedding])
        total_weight += weight
    
    if not weighted_embeddings or total_weight == 0:
        return None
        
    # Calculate weighted average
    result = [0.0] * EMBEDDING_DIMENSION
    for embedding in weighted_embeddings:
        for i in range(EMBEDDING_DIMENSION):
            result[i] += embedding[i] / total_weight
            
    return result

def merge_embeddings(current: List[float], delta: List[float], alpha: float = 0.7) -> List[float]:
    """
    Merge current embedding with delta embedding using exponential moving average
    Args:
        current: Current user embedding
        delta: New delta embedding
        alpha: Weight for current embedding (1-alpha applied to delta)
    Returns:
        List[float]: Merged embedding
    """
    return [alpha * c + (1 - alpha) * d for c, d in zip(current, delta)]
    