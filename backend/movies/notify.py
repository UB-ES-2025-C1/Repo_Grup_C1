# backend/movies/notify.py

import json
import logging
from redis import Redis
import os


REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

DISABLE_SSE = os.environ.get("DISABLE_SSE", "")

redis_client = None


def get_redis_client():
    global redis_client

    if os.environ.get("DISABLE_SSE") == "1":
        return None

    if redis_client is None:
        redis_client = Redis.from_url(REDIS_URL)

    return redis_client


def publish_sse(channel: str, event: dict):
    client = get_redis_client()
    if client is None:
        return

    message = {
        "channel": channel,
        "event": event
    }
    client.publish("sse_notifications", json.dumps(message))
