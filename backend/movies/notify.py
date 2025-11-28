# backend/movies/notify.py

import json
from redis import Redis
import os


REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")

redis_client = Redis.from_url(REDIS_URL)


def publish_sse(channel: str, event: dict):
    message = {
        "channel": channel,
        "event": event
    }
    redis_client.publish("sse_notifications", json.dumps(message))