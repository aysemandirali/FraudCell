"""Schema migration for the AI service's own database.

Applied at service startup (see app.main.lifespan), mirroring the
`db.Database.MigrateAsync()` call the three .NET services make. Also runnable
standalone as a one-shot container:

    docker compose --profile migration run --rm ai-migrate

A versioned Alembic migration will replace metadata.create_all before final
delivery.
"""

from __future__ import annotations

import asyncio

from sqlalchemy import text

import app.models  # noqa: F401 - imports all mapped tables into Base.metadata
from app.database import Base, engine


async def migrate() -> None:
    """Idempotent; safe to run on every startup. Does NOT dispose the engine,
    because in-process callers keep using it afterwards."""
    async with engine.begin() as connection:
        await connection.execute(text("CREATE SCHEMA IF NOT EXISTS ai"))
        await connection.run_sync(Base.metadata.create_all)
        # create_all yeni kolonlari mevcut tablolara EKLEMEZ; idempotent ALTER'lar
        # onceden olusmus veritabanlarini da guncel tutar (Gemini aciklama katmani).
        await connection.execute(
            text("ALTER TABLE ai.predictions ADD COLUMN IF NOT EXISTS explanation TEXT")
        )
        await connection.execute(
            text(
                "ALTER TABLE ai.predictions "
                "ADD COLUMN IF NOT EXISTS explanation_generated_at TIMESTAMP"
            )
        )


async def _run_standalone() -> None:
    await migrate()
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(_run_standalone())
