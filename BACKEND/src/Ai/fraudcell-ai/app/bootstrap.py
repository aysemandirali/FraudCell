"""Aciliste model registry'i yukler ve DB'de model_versions/model_bundles
satirlarini idempotent olarak olusturur (dokuman §37/§38).

Training script (train.py) DB baglantisi olmadan calisabilir; bu modul
uretilen `metadata.json`'i okuyup gerekli kayitlari senkronize eder.
"""

from __future__ import annotations

import datetime as dt
import logging

from sqlalchemy import select

from app.database import SessionFactory
from app.ml.model_registry import registry
from app.models.ai import ModelBundle, ModelVersion

logger = logging.getLogger(__name__)


async def bootstrap_models() -> None:
    registry.load()
    metadata = registry.metadata
    assert metadata is not None

    now = dt.datetime.now(dt.timezone.utc)

    async with SessionFactory() as session:
        risk_version = await _upsert_model_version(
            session, kind="RISK", metadata=metadata["riskModel"], now=now
        )
        fraud_type_version = await _upsert_model_version(
            session, kind="FRAUD_TYPE", metadata=metadata["fraudTypeModel"], now=now
        )

        bundle = (
            await session.execute(select(ModelBundle).where(ModelBundle.bundle_version == metadata["bundleVersion"]))
        ).scalar_one_or_none()

        if bundle is None:
            from ulid import ULID

            bundle = ModelBundle(
                id=str(ULID()),
                bundle_version=metadata["bundleVersion"],
                risk_model_id=risk_version.id,
                fraud_type_model_id=fraud_type_version.id,
                status="ACTIVE",
                activated_at=now,
                created_at=now,
            )
            session.add(bundle)
        elif bundle.status != "ACTIVE":
            bundle.status = "ACTIVE"
            bundle.activated_at = now

        await session.commit()
        logger.info("Model bundle '%s' is ACTIVE (risk=%s, fraudType=%s).", metadata["bundleVersion"], risk_version.semantic_version, fraud_type_version.semantic_version)


async def _upsert_model_version(session, *, kind: str, metadata: dict, now: dt.datetime) -> ModelVersion:  # type: ignore[no-untyped-def]
    existing = (
        await session.execute(
            select(ModelVersion).where(ModelVersion.model_kind == kind, ModelVersion.semantic_version == metadata["version"])
        )
    ).scalar_one_or_none()

    if existing is not None:
        return existing

    from ulid import ULID

    version = ModelVersion(
        id=str(ULID()),
        model_kind=kind,
        semantic_version=metadata["version"],
        algorithm=metadata["algorithm"],
        artifact_path=metadata["artifactPath"],
        artifact_sha256=metadata["artifactSha256"],
        metrics=metadata["metrics"],
        status="ACTIVE",
        created_at=now,
        activated_at=now,
    )
    session.add(version)
    await session.flush()
    return version
