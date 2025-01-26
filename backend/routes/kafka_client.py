import json
import os
from typing import Dict, Any, List, TypedDict, Literal
from datetime import datetime
from confluent_kafka import Producer, Consumer, KafkaError
from pathlib import Path

# Topic names
class Topics:
    VIDEO_INTERACTIONS = "video-interactions"
    VIDEO_EMBEDDINGS = "video-embeddings"

# Message type definitions
class VideoInteraction(TypedDict):
    userId: str
    videoId: str
    viewDuration: int  # Seconds watched
    liked: bool
    commented: bool
    shared: bool
    timestamp: str
    weightedScore: float

class VideoEmbedding(TypedDict):
    id: str
    userId: str
    title: str
    description: str | None
    fileUrl: str
    createdAt: str
    metadata: Dict[str, Any]  # Google Video Intelligence API results
    status: Literal["processing", "ready", "failed"]
    duration: int | None  # in seconds
    embedding: List[float] | None  # Vector embedding from video content
    trendingScore: float

class KafkaClient:
    """Confluent Cloud Kafka client"""
    
    def __init__(self):
        self.config = self._read_config()
        self.producer = None  # Lazy initialization
        
    def _read_config(self) -> Dict[str, str]:
        """Read the client configuration from client.properties"""
        config = {}
        properties_path = Path(__file__).parent.parent / "client.properties"
        
        with open(properties_path) as fh:
            for line in fh:
                line = line.strip()
                if len(line) != 0 and line[0] != "#":
                    parameter, value = line.strip().split('=', 1)
                    config[parameter] = value.strip()
        return config

    def _get_producer(self) -> Producer:
        """Lazy initialization of producer"""
        if self.producer is None:
            self.producer = Producer(self.config)
        return self.producer

    def produce_interaction(self, interaction: VideoInteraction) -> bool:
        """
        Produce a video interaction event
        Args:
            interaction: The interaction event to produce
        Returns:
            bool: True if message was delivered successfully
        """
        return self.produce(Topics.VIDEO_INTERACTIONS, [interaction])

    def produce_video_embedding(self, embedding: VideoEmbedding) -> bool:
        """
        Produce a video embedding event
        Args:
            embedding: The video embedding to produce
        Returns:
            bool: True if message was delivered successfully
        """
        return self.produce(Topics.VIDEO_EMBEDDINGS, [embedding])

    def produce(self, topic: str, messages: List[Dict[str, Any]]) -> bool:
        """
        Produce messages to a Confluent Cloud topic
        Args:
            topic: The topic to produce to
            messages: List of dictionaries to be converted to JSON
        Returns:
            bool: True if all messages were delivered successfully
        """
        try:
            producer = self._get_producer()
            for msg in messages:
                # Add timestamp if not present
                if 'timestamp' not in msg:
                    msg['timestamp'] = datetime.utcnow().isoformat()
                
                producer.produce(
                    topic,
                    value=json.dumps(msg).encode('utf-8'),
                    callback=self._delivery_report
                )
            remaining = producer.flush(timeout=10)  # 10 seconds
            if remaining > 0:
                print(f"Warning: {remaining} messages were not delivered")
                return False
            return True
        except Exception as e:
            print(f"Error producing to Confluent Cloud: {e}")
            return False

    def create_consumer(self, group_id: str) -> Consumer:
        """
        Create a new Confluent Cloud consumer
        Args:
            group_id: Consumer group ID for this consumer
        Returns:
            Consumer: Configured Confluent Kafka consumer
        """
        consumer_config = {
            **self.config,
            'group.id': group_id
        }
        return Consumer(consumer_config)

    def consume_interactions_by_user(self, consumer: Consumer, timeout: float = 1.0) -> Dict[str, List[VideoInteraction]]:
        """
        Consume video interactions and group them by userId
        Args:
            consumer: The consumer instance to use
            timeout: How long to wait for messages in seconds
        Returns:
            Dict[str, List[VideoInteraction]]: Dictionary of userId -> list of interactions
        """
        messages = self.consume_batch(consumer, timeout)
        interactions_by_user: Dict[str, List[VideoInteraction]] = {}
        
        for msg in messages:
            interaction = VideoInteraction(**msg)
            user_id = interaction['userId']
            if user_id not in interactions_by_user:
                interactions_by_user[user_id] = []
            interactions_by_user[user_id].append(interaction)
        
        return interactions_by_user

    def consume_video_embeddings(self, consumer: Consumer, timeout: float = 1.0) -> List[VideoEmbedding]:
        """
        Consume video embedding messages
        Args:
            consumer: The consumer instance to use
            timeout: How long to wait for messages in seconds
        Returns:
            List[VideoEmbedding]: List of video embeddings
        """
        messages = self.consume_batch(consumer, timeout)
        return [VideoEmbedding(**msg) for msg in messages]

    def consume_batch(self, consumer: Consumer, timeout: float = 1.0) -> List[Dict[str, Any]]:
        """
        Consume a batch of messages from Confluent Cloud
        Args:
            consumer: The consumer instance to use
            timeout: How long to wait for messages in seconds
        Returns:
            List[Dict]: List of decoded messages
        """
        messages = []
        try:
            msg = consumer.poll(timeout)
            if msg is None:
                return messages
            if msg.error():
                if msg.error().code() != KafkaError._PARTITION_EOF:
                    print(f"Confluent Cloud consumer error: {msg.error()}")
                return messages
            
            try:
                messages.append(json.loads(msg.value().decode('utf-8')))
            except json.JSONDecodeError as e:
                print(f"Error decoding message from Confluent Cloud: {e}")
                
        except Exception as e:
            print(f"Error consuming from Confluent Cloud: {e}")
        
        return messages

    def _delivery_report(self, err, msg):
        """Callback for Confluent Cloud message delivery reports"""
        if err is not None:
            print(f'Message delivery failed: {err}')
        else:
            print(f'Message delivered to {msg.topic()} [{msg.partition()}]')

    def close(self):
        """Close the Confluent Cloud producer"""
        if self.producer:
            self.producer.flush()
            self.producer.close()

# Singleton instance
_kafka_client: KafkaClient | None = None

def get_kafka_client() -> KafkaClient:
    """Get or create the Confluent Cloud Kafka client singleton"""
    global _kafka_client
    if _kafka_client is None:
        _kafka_client = KafkaClient()
    return _kafka_client 