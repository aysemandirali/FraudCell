"""Egitim script'i (dokuman `00-START-HERE.md` §12, `03-TECH-STACK.md` §14).

Calistirma:
    uv run python train.py

Sabit random seed kullanilir; train/validation/test ayrimi %70/%15/%15'tir.
Cikti: models/risk_model.joblib, models/fraud_type_model.joblib,
models/metadata.json (checksum + metrikler; uygulama aciliste bunu okuyup
ai.model_versions / ai.model_bundles satirlarini olusturur).
"""

from __future__ import annotations

import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split

sys.path.insert(0, str(Path(__file__).parent))

from app.config import settings  # noqa: E402
from app.ml.schema import FEATURE_COLUMNS, RANDOM_SEED  # noqa: E402
from app.ml.synthetic_data import generate_dataset  # noqa: E402

ARTIFACT_DIR = Path(__file__).parent / settings.model.artifact_dir
DATA_DIR = Path(__file__).parent / "data"


def sha256_of_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    print("[1/5] Sentetik veri seti uretiliyor (n=10000, seed=%d)..." % RANDOM_SEED)
    df = generate_dataset(n_samples=10_000, seed=RANDOM_SEED)

    dataset_path = DATA_DIR / "synthetic_transactions.csv"
    df.to_csv(dataset_path, index=False)
    data_checksum = sha256_of_file(dataset_path)

    print("Sinif dagilimi:")
    print(df["fraud_type"].value_counts(normalize=True).round(4))

    x = df[FEATURE_COLUMNS].to_numpy(dtype=float)
    y_binary = df["is_fraud"].to_numpy(dtype=int)
    y_fraud_type = df["fraud_type"].to_numpy()

    # %70 train / %15 validation / %15 test — sabit seed, stratified.
    x_train, x_temp, yb_train, yb_temp, yt_train, yt_temp = train_test_split(
        x, y_binary, y_fraud_type, test_size=0.30, random_state=RANDOM_SEED, stratify=y_fraud_type
    )
    x_val, x_test, yb_val, yb_test, yt_val, yt_test = train_test_split(
        x_temp, yb_temp, yt_temp, test_size=0.50, random_state=RANDOM_SEED, stratify=yt_temp
    )

    # Data leakage kontrolu: train/val/test arasinda satir kesisimi olmamali.
    train_hashes = {hashlib.sha256(row.tobytes()).hexdigest() for row in x_train}
    test_hashes = {hashlib.sha256(row.tobytes()).hexdigest() for row in x_test}
    overlap = train_hashes & test_hashes
    print(f"[leakage-check] train/test kesisen satir sayisi: {len(overlap)} (beklenen: dusuk/0)")

    print("[2/5] Risk modeli egitiliyor: HistGradientBoostingClassifier + CalibratedClassifierCV...")
    base_risk_model = HistGradientBoostingClassifier(random_state=RANDOM_SEED, max_iter=200)
    risk_model = CalibratedClassifierCV(base_risk_model, method="isotonic", cv=3)
    risk_model.fit(x_train, yb_train)

    risk_val_proba = risk_model.predict_proba(x_val)[:, 1]
    risk_val_pred = (risk_val_proba >= 0.5).astype(int)
    risk_test_proba = risk_model.predict_proba(x_test)[:, 1]
    risk_test_pred = (risk_test_proba >= 0.5).astype(int)

    risk_metrics = {
        "validation": {
            "precision": float(precision_score(yb_val, risk_val_pred, zero_division=0)),
            "recall": float(recall_score(yb_val, risk_val_pred, zero_division=0)),
            "f1": float(f1_score(yb_val, risk_val_pred, zero_division=0)),
        },
        "test": {
            "precision": float(precision_score(yb_test, risk_test_pred, zero_division=0)),
            "recall": float(recall_score(yb_test, risk_test_pred, zero_division=0)),
            "f1": float(f1_score(yb_test, risk_test_pred, zero_division=0)),
        },
    }
    print("Risk modeli test metrikleri:", risk_metrics["test"])
    print("Confusion matrix (test):\n", confusion_matrix(yb_test, risk_test_pred))

    print("[3/5] Fraud-type modeli egitiliyor: RandomForestClassifier...")
    fraud_type_model = RandomForestClassifier(
        n_estimators=300, max_depth=12, random_state=RANDOM_SEED, class_weight="balanced", n_jobs=-1
    )
    fraud_type_model.fit(x_train, yt_train)

    yt_test_pred = fraud_type_model.predict(x_test)
    fraud_type_report = classification_report(yt_test, yt_test_pred, output_dict=True, zero_division=0)
    print("Fraud-type siniflandirma raporu (test):")
    print(classification_report(yt_test, yt_test_pred, zero_division=0))

    print("[4/5] Model artifact'lari kaydediliyor...")
    risk_model_path = ARTIFACT_DIR / "risk_model.joblib"
    fraud_type_model_path = ARTIFACT_DIR / "fraud_type_model.joblib"
    joblib.dump(risk_model, risk_model_path)
    joblib.dump(fraud_type_model, fraud_type_model_path)

    metadata = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "randomSeed": RANDOM_SEED,
        "datasetVersion": "synthetic-tr-v1",
        "datasetChecksum": data_checksum,
        "datasetRecordCount": int(len(df)),
        "classDistribution": {str(k): int(v) for k, v in df["fraud_type"].value_counts().items()},
        "split": {"train": len(x_train), "validation": len(x_val), "test": len(x_test)},
        "riskModel": {
            "version": "risk-1.0.0",
            "algorithm": "HistGradientBoostingClassifier+CalibratedClassifierCV(isotonic)",
            "artifactPath": str(risk_model_path.name),
            "artifactSha256": sha256_of_file(risk_model_path),
            "metrics": risk_metrics,
        },
        "fraudTypeModel": {
            "version": "fraud-type-1.0.0",
            "algorithm": "RandomForestClassifier",
            "artifactPath": str(fraud_type_model_path.name),
            "artifactSha256": sha256_of_file(fraud_type_model_path),
            "metrics": {"test": fraud_type_report},
        },
        "bundleVersion": settings.model.bundle_version,
        "featureColumns": FEATURE_COLUMNS,
        "leakageCheckOverlapCount": len(overlap),
    }

    metadata_path = ARTIFACT_DIR / "metadata.json"
    metadata_path.write_text(json.dumps(metadata, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"[5/5] Tamamlandi. Artifact'lar: {ARTIFACT_DIR}")
    print(f"Model metadata: {metadata_path}")


if __name__ == "__main__":
    main()
