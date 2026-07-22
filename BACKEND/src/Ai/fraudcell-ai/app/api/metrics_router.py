"""<c>/api/v1/ai/metrics/*</c> (dokuman `07-API-DESIGN.md` §56-57).

Dogruluk metrikleri, gercek zamanli SQL aggregate yerine `prediction_feedback`
tablosundan hesaplanir (dokuman §45); bu ground-truth kaynaklarindandir
(analyst override, final case decision, customer feedback).
"""

from __future__ import annotations

import datetime as dt

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.envelope import ok
from app.database import get_session
from app.models.ai import ModelBundle, Prediction, PredictionFeedback

router = APIRouter(prefix="/api/v1/ai/metrics", tags=["AI Metrics"])


@router.get("/overview")
async def get_overview(
    session: AsyncSession = Depends(get_session),
    from_: dt.datetime | None = Query(default=None, alias="from"),
    to: dt.datetime | None = Query(default=None),
) -> dict:
    feedback_query = select(PredictionFeedback)
    if from_ is not None:
        feedback_query = feedback_query.where(PredictionFeedback.occurred_at >= from_)
    if to is not None:
        feedback_query = feedback_query.where(PredictionFeedback.occurred_at <= to)

    feedback_rows = (await session.execute(feedback_query)).scalars().all()
    sample_count = len(feedback_rows)

    fraud_type_correct = sum(1 for f in feedback_rows if f.is_fraud_type_correct)
    decision_agreement = sum(1 for f in feedback_rows if f.is_decision_agreement)
    false_positives = sum(1 for f in feedback_rows if f.is_false_positive)

    prediction_count = (await session.execute(select(func.count()).select_from(Prediction))).scalar_one()

    bundle = (await session.execute(select(ModelBundle).where(ModelBundle.status == "ACTIVE"))).scalar_one_or_none()

    return ok({
        "sampleCount": sample_count,
        "fraudTypeAccuracy": round(fraud_type_correct / sample_count, 4) if sample_count else None,
        "decisionAgreementRate": round(decision_agreement / sample_count, 4) if sample_count else None,
        "falsePositiveRate": round(false_positives / sample_count, 4) if sample_count else None,
        "totalPredictions": prediction_count,
        "modelBundleVersion": bundle.bundle_version if bundle else None,
        "calculatedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
    }, generated_at=dt.datetime.now(dt.timezone.utc).isoformat())


@router.get("/categories")
async def get_category_accuracy(
    session: AsyncSession = Depends(get_session),
    from_: dt.datetime | None = Query(default=None, alias="from"),
    to: dt.datetime | None = Query(default=None),
) -> dict:
    query = select(PredictionFeedback)
    if from_ is not None:
        query = query.where(PredictionFeedback.occurred_at >= from_)
    if to is not None:
        query = query.where(PredictionFeedback.occurred_at <= to)

    rows = (await session.execute(query)).scalars().all()

    by_type: dict[str, list[PredictionFeedback]] = {}
    for row in rows:
        key = row.ai_fraud_type or "UNKNOWN"
        by_type.setdefault(key, []).append(row)

    items = []
    for fraud_type, group in by_type.items():
        total = len(group)
        correct = sum(1 for g in group if g.is_fraud_type_correct)
        items.append({
            "fraudType": fraud_type,
            "sampleCount": total,
            "accuracy": round(correct / total, 4) if total else None,
        })

    return ok({"items": items})


@router.get("/decision-agreement")
async def get_decision_agreement(session: AsyncSession = Depends(get_session)) -> dict:
    rows = (await session.execute(select(PredictionFeedback))).scalars().all()
    total = len(rows)
    agreement = sum(1 for r in rows if r.is_decision_agreement)

    return ok({
        "sampleCount": total,
        "decisionAgreementRate": round(agreement / total, 4) if total else None,
    })
