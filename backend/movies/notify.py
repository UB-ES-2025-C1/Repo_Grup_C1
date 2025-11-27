# backend/movies/notify.py

import json
import redis
import os


REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

redis_client = redis.from_url(REDIS_URL)


def publish_sse(channel: str, event: dict):
    message = {
        "channel": channel,
        "event": event
    }
    redis_client.publish("sse_notifications", json.dumps(message))