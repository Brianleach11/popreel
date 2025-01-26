# routes/kafka_producer.py
from fastapi import APIRouter, HTTPException
from .kafka_client import get_kafka_client, VideoEmbedding, VideoInteraction

router = APIRouter(prefix="/api/kafka")

@router.post("/video")
async def produce_video(video: VideoEmbedding):
    client = get_kafka_client()
    success = client.produce_video_embedding(video)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to produce message")
    return {"status": "success"}

@router.post("/interaction")
async def produce_interaction(interaction: VideoInteraction):
    client = get_kafka_client()
    success = client.produce_interaction(interaction)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to produce message")
    return {"status": "success"}