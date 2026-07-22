"""Cross-platform development entry point for the AI API."""

from __future__ import annotations

import asyncio
import os
import sys

import uvicorn


if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from app.main import app  # noqa: E402 - event-loop policy must be set first


if __name__ == "__main__":
    uvicorn.run(
        app,
        host=os.getenv("AI_HTTP_HOST", "127.0.0.1"),
        port=int(os.getenv("AI_HTTP_PORT", "8000")),
        loop="asyncio",
    )
