from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import obligations, events

app = FastAPI(title="Financial Obligations Tracker", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(obligations.router)
app.include_router(events.router)
