"""Egitilmis model artifact'larini yukler ve inference saglar (dokuman §14.4).

Model yalnizca takim tarafindan uretilmis artifact'i yukler; kullanicidan
gelen bir artifact ASLA yuklenmez. Checksum, `metadata.json` ile karsilastirilir;
uyusmazlikta servis "not ready" olur (dokuman §14.4/§33.2).
"""

from __future__ import annotations

import hashlib
import json
import logging
from pathlib import Path

import joblib
import numpy as np

from app.config import settings
from app.ml.schema import FEATURE_COLUMNS, FRAUD_TYPE_CLASSES

logger = logging.getLogger(__name__)


class ModelNotReadyError(RuntimeError):
    """Model artifact'i bulunamadi veya checksum uyusmuyor."""


class ModelRegistry:
    """Uygulama aciliminda bir kez yuklenen, thread-safe salt-okunur model container'i."""

    def __init__(self) -> None:
        self._risk_model = None
        self._fraud_type_model = None
        self.metadata: dict | None = None

    def load(self) -> None:
        artifact_dir = Path(settings.model.artifact_dir)
        metadata_path = artifact_dir / "metadata.json"

        if not metadata_path.exists():
            raise ModelNotReadyError(
                f"Model metadata bulunamadi: {metadata_path}. Once 'python train.py' calistirilmalidir."
            )

        self.metadata = json.loads(metadata_path.read_text(encoding="utf-8"))

        risk_path = artifact_dir / self.metadata["riskModel"]["artifactPath"]
        fraud_type_path = artifact_dir / self.metadata["fraudTypeModel"]["artifactPath"]

        self._verify_checksum(risk_path, self.metadata["riskModel"]["artifactSha256"])
        self._verify_checksum(fraud_type_path, self.metadata["fraudTypeModel"]["artifactSha256"])

        self._risk_model = joblib.load(risk_path)
        self._fraud_type_model = joblib.load(fraud_type_path)

        logger.info(
            "Loaded model bundle %s (risk=%s, fraudType=%s)",
            self.metadata["bundleVersion"],
            self.metadata["riskModel"]["version"],
            self.metadata["fraudTypeModel"]["version"],
        )

    @staticmethod
    def _verify_checksum(path: Path, expected_sha256: str) -> None:
        if not path.exists():
            raise ModelNotReadyError(f"Model artifact bulunamadi: {path}")

        actual = hashlib.sha256(path.read_bytes()).hexdigest()
        if actual != expected_sha256:
            raise ModelNotReadyError(f"Checksum uyusmuyor: {path} (beklenen {expected_sha256}, bulunan {actual})")

    @property
    def is_ready(self) -> bool:
        return self._risk_model is not None and self._fraud_type_model is not None

    def predict_risk_score(self, feature_vector: dict[str, float]) -> float:
        if self._risk_model is None:
            raise ModelNotReadyError("Risk modeli henuz yuklenmedi.")

        x = np.array([[feature_vector[col] for col in FEATURE_COLUMNS]], dtype=float)
        return float(self._risk_model.predict_proba(x)[0, 1])

    def predict_fraud_type(self, feature_vector: dict[str, float]) -> str:
        if self._fraud_type_model is None:
            raise ModelNotReadyError("Fraud-type modeli henuz yuklenmedi.")

        x = np.array([[feature_vector[col] for col in FEATURE_COLUMNS]], dtype=float)
        prediction = self._fraud_type_model.predict(x)[0]
        return str(prediction) if prediction in FRAUD_TYPE_CLASSES else "SUPHELI_DAVRANIS"


registry = ModelRegistry()
