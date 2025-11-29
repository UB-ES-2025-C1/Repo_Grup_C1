# backend/movies/server.py

from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import json
import uuid
import os
from pathlib import Path
from redis import asyncio as aioredis

# ------------------------------
# Configuración
# ------------------------------

BASE_DIR = Path(__file__).resolve().parent
SUBSCRIPTIONS_FILE = BASE_DIR / "subscriptions.json"

SSE_PREFIX = os.getenv("SSE_PREFIX", "/sse")
STREAM_PATH = f"{SSE_PREFIX}/stream"
SUBSCRIBE_PATH = f"{SSE_PREFIX}/subscribe"
UNSUBSCRIBE_PATH = f"{SSE_PREFIX}/unsubscribe"

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")

# ------------------------------
# Estado del servidor
# ------------------------------

# client_id -> SSEClient
clients = {}

# channel -> set(client_id)
subscriptions = {}

# ------------------------------
# Funciones de persistencia
# ------------------------------

def load_subscriptions():
    if not SUBSCRIPTIONS_FILE.exists():
        return {}
    with SUBSCRIPTIONS_FILE.open("r", encoding="utf-8") as f:
        data = json.load(f)
    return {channel: set(clients) for channel, clients in data.items()}

def save_subscriptions():
    serializable = {ch: list(clients) for ch, clients in subscriptions.items()}
    with SUBSCRIPTIONS_FILE.open("w", encoding="utf-8") as f:
        json.dump(serializable, f, indent=2)

# ------------------------------
# Cliente SSE
# ------------------------------

class SSEClient:
    def __init__(self, client_id: str):
        self.id = client_id
        self.queue = asyncio.Queue()
        self.subscriptions = set()

    async def send(self, event: dict):
        await self.queue.put(event)

    async def stream(self):
        while True:
            event = await self.queue.get()
            yield f"data: {json.dumps(event)}\n\n"

# ----------------------------
# Redis listener
# ----------------------------

async def redis_listener():
    redis = await aioredis.from_url(REDIS_URL)
    pubsub = redis.pubsub()
    await pubsub.subscribe("sse_notifications")

    async for msg in pubsub.listen():
        if msg["type"] == "message":
            data = json.loads(msg["data"])
            channel = data["channel"]
            event = data["event"]
            await notify(channel, event)

# ------------------------------
# FastAPI app con lifespan
# ------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    global subscriptions
    print("Loading subscriptions...")
    subscriptions = load_subscriptions()
    print("SSE server starting")
    redis_task = asyncio.create_task(redis_listener())

    yield

    print("Saving subscriptions...")
    save_subscriptions()
    print("SSE server shutting down")
    clients.clear()
    subscriptions.clear()
    redis_task.cancel()
    try:
        await redis_task
    except asyncio.CancelledError:
        pass

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------
# Endpoints SSE
# ------------------------------

@app.get(STREAM_PATH)
async def stream(request: Request):
    # Generamos el client_id en el servidor
    client_id = str(uuid.uuid4())
    client = SSEClient(client_id)
    clients[client_id] = client

    async def event_generator():
        try:
            # Enviar evento inicial con client_id
            await client.send({"type": "client_id", "client_id": client_id})

            while True:
                if await request.is_disconnected():
                    break
                async for chunk in client.stream():
                    yield chunk
        finally:
            clients.pop(client_id, None)
            for channel in list(client.subscriptions):
                subscriptions[channel].discard(client_id)
            save_subscriptions()

    return StreamingResponse(event_generator(), media_type="text/event-stream")

# ------------------------------
# Suscribirse / desuscribirse
# ------------------------------

@app.post(f"{SUBSCRIBE_PATH}/{{channel}}")
async def subscribe(channel: str, request: Request):
    data = await request.json()
    client_id = data.get("client_id")
    if client_id not in clients:
        return {"error": "Client not connected"}

    if channel not in subscriptions:
        subscriptions[channel] = set()

    subscriptions[channel].add(client_id)
    clients[client_id].subscriptions.add(channel)
    print(f"{client_id} subscribed to channel {channel}")
    save_subscriptions()
    return {"ok": True}

@app.post(f"{UNSUBSCRIBE_PATH}/{{channel}}")
async def unsubscribe(channel: str, request: Request):
    data = await request.json()
    client_id = data.get("client_id")
    if client_id not in clients:
        return {"error": "Client not connected"}

    if channel in subscriptions:
        subscriptions[channel].discard(client_id)
    clients[client_id].subscriptions.discard(channel)
    print(f"{client_id} unsubscribed from channel {channel}")
    save_subscriptions()
    return {"ok": True}

# ------------------------------
# Enviar notificaciones
# ------------------------------

async def notify(channel: str, event: dict):
    if channel not in subscriptions:
        return
    for client_id in subscriptions[channel]:
        client = clients[client_id]
        if client:
            print(f"Notifying client {client_id} in channel {channel} of event type {event['type']}")
            await client.send(event)
