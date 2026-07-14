import asyncio
import json
from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

router = APIRouter()

_clients: list[asyncio.Queue] = []


async def broadcast(event_type: str, data: dict) -> None:
    payload = json.dumps(data, default=str)
    for queue in list(_clients):
        await queue.put({"event": event_type, "data": payload})


@router.get("/events")
async def sse_events():
    async def event_generator():
        queue: asyncio.Queue = asyncio.Queue()
        _clients.append(queue)
        try:
            while True:
                try:
                    item = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield item
                except asyncio.TimeoutError:
                    yield {"comment": "ping"}
        except asyncio.CancelledError:
            pass
        finally:
            if queue in _clients:
                _clients.remove(queue)

    return EventSourceResponse(event_generator())
