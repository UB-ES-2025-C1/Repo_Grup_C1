# backend/movies/notify.py

import json
import logging
from redis import Redis
import os


logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")

DISABLE_SSE = os.environ.get("DISABLE_SSE", "")

# Initialize redis_client safely - don't fail if Redis is unavailable
try:
    redis_client = Redis.from_url(REDIS_URL, decode_responses=True)
    # Test the connection
    redis_client.ping()
except Exception as e:
    logger.warning(f"Redis not available: {e}. SSE features will be disabled.")
    redis_client = None


def publish_sse(channel: str, event: dict):
    if DISABLE_SSE == "1" or redis_client is None:
        return

    try:
        message = {
            "channel": channel,
            "event": event
        }
        redis_client.publish("sse_notifications", json.dumps(message))
    except Exception as e:
        logger.warning(f"Failed to publish SSE message: {e}")