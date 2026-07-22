"""<c>GET /api/v1/ai/predictions/{assessmentId}</c> (dokuman §54, Assigned Analyst/Supervisor/Admin).

Rol/ownership kontrolu Gateway + Transaction Service tarafindan zaten
uygulanmistir; bu servis JWT'nin gecerliligini kendisi de dogrular.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.envelope import ok
from app.database import get_session
from app.models.ai import Prediction

router = APIRouter(prefix="/api/v1/ai/predictions", tags=["AI Predictions"])


@router.get("/{assessment_id}")
async def get_prediction(assessment_id: str, session: AsyncSession = Depends(get_session)) -> dict:
    prediction = await session.get(Prediction, assessment_id)
    if prediction is None:
        raise HTTPException(status_code=404, detail="Tahmin bulunamadi.")

    return ok({
        "assessmentId": prediction.id,
        "transactionId": prediction.transaction_id,
        "riskScore": float(prediction.risk_score),
        "riskLevel": prediction.risk_level,
        "decision": prediction.decision,
        "fraudType": prediction.fraud_type,
        "reasonCodes": prediction.reason_codes,
        "predictedAt": prediction.predicted_at.isoformat(),
    })
