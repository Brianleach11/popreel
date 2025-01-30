import os
from typing import List, Dict, Any, Optional, Tuple
from pinecone import Pinecone, ServerlessSpec
from db.connection import get_db
from routes.kafka_client import VideoInteraction, VideoEmbedding
from datetime import datetime, timezone
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
            # First try to update existing record
            result = await conn.execute(
                """
                UPDATE user_embeddings 
                SET embedding = $1, updated_at = NOW()
                WHERE user_id = $2
                """,
                f"[{','.join(map(str, new_embedding))}]",  # Format as PostgreSQL array
                user_id
            )
            
            # If no record was updated, insert a new one
            if result == "UPDATE 0":
                await conn.execute(
                    """
                    INSERT INTO user_embeddings (user_id, embedding, updated_at)
                    VALUES ($1, $2, NOW())
                    """,
                    user_id,
                    f"[{','.join(map(str, new_embedding))}]"  # Format as PostgreSQL array
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
            SELECT embedding, updated_at 
            FROM user_embeddings 
            WHERE user_id = $1
            """, 
            user_id
        )
        print(f"Fetched user embedding for user {user_id}")
        
        if not result or not result['embedding']:
            return None
            
        # Parse the embedding string into a list of floats
        embedding_str = result['embedding'].strip('[]')
        embedding = [float(x.strip()) for x in embedding_str.split(',')]
            
        # Apply time decay - ensure both times are timezone-aware
        updated_at = result['updated_at'].replace(tzinfo=timezone.utc)  # Ensure UTC timezone
        current_time = datetime.now(timezone.utc)
        days_since_update = (current_time - updated_at).days
        decay_factor = np.power(TIME_DECAY_FACTOR, days_since_update / 30)  # Decay over 30-day periods
        return [x * decay_factor for x in embedding]

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
    total_weight = 0.0  # Changed to float
    
    for interaction, video_embedding_dict in interactions_with_video_embeddings:
        if not video_embedding_dict or not video_embedding_dict.get('embedding'):
            continue
            
        # Extract the embedding from the dictionary
        video_embedding = video_embedding_dict['embedding']
            
        # Convert video embedding to numpy array for vector operations
        embedding_array = np.array(video_embedding, dtype=np.float64)
            
        # Use the pre-calculated weightedScore
        weight = float(interaction.weightedScore)  # Convert to float
            
        # Apply time decay to the interaction
        interaction_time = datetime.fromisoformat(interaction.timestamp.replace('Z', '+00:00'))
        days_since_interaction = (datetime.now(timezone.utc) - interaction_time).days
        decay_factor = float(np.power(TIME_DECAY_FACTOR, days_since_interaction / 30))  # Convert to float
        weight *= decay_factor
        
        # Add weighted embedding using numpy multiplication
        weighted_embedding = embedding_array * weight
        weighted_embeddings.append(weighted_embedding)
        total_weight += weight
    
    if not weighted_embeddings or total_weight == 0:
        return None
        
    # Calculate weighted average using numpy
    result = np.zeros(EMBEDDING_DIMENSION, dtype=np.float64)
    for weighted_embedding in weighted_embeddings:
        result += weighted_embedding
    
    # Normalize by total weight and convert back to list
    if total_weight > 0:
        result = result / total_weight
            
    return result.tolist()

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

async def delete_from_pinecone(video_id: str) -> bool:
    """
    Delete video embedding from Pinecone
    Args:
        video_id: ID of the video to delete
    Returns:
        bool: Success status
    """
    try:
        pc = get_pinecone_client()
        if not pc:
            print("Pinecone client not available")
            return False
            
        index = pc.Index("video-embeddings")

        # Delete from Pinecone
        index.delete(ids=[video_id])
        return True
    except Exception as e:
        print(f"Error deleting from Pinecone: {e}")
        return False
    