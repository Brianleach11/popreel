from fastapi import APIRouter, HTTPException
from .kafka_client import get_kafka_client
from confluent_kafka import Consumer

kafka_router = APIRouter(prefix="/kafka-test")

@kafka_router.post("/produce")
def test_produce():
    """Test producing a message to Confluent Cloud"""
    try:
        kafka = get_kafka_client()
        test_message = {
            "message": "Hello Confluent!",
            "timestamp": "2024-02-14T00:00:00Z"
        }
        success = kafka.produce("test-topic", [test_message])
        if success:
            return {"status": "success", "message": "Message produced to Confluent Cloud"}
        else:
            raise HTTPException(status_code=500, detail="Failed to produce message")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@kafka_router.get("/consume")
def test_consume():
    """Test consuming messages from Confluent Cloud"""
    try:
        kafka = get_kafka_client()
        consumer = kafka.create_consumer("test-group")
        consumer.subscribe(["test-topic"])
        
        messages = kafka.consume_batch(consumer, timeout=5.0)  # 5 second timeout
        consumer.close()
        
        return {
            "status": "success", 
            "message_count": len(messages),
            "messages": messages
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 