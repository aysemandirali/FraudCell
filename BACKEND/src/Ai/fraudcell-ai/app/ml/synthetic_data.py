"""Sentetik egitim verisi ureticisi (dokuman `00-START-HERE.md` §12 egitim verisi).

Sabit random seed kullanilir; class distribution ve data leakage kontrolu
egitim script'inde (train.py) raporlanir.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from app.ml.schema import FEATURE_COLUMNS, FRAUD_TYPE_CLASSES, RANDOM_SEED


def generate_dataset(n_samples: int = 10_000, seed: int = RANDOM_SEED) -> pd.DataFrame:
    """10.000 sentetik islem uretir: meşru + 4 dolandiricilik kategorisi (dokuman §12)."""

    rng = np.random.default_rng(seed)

    # Sinif dagilimi: cogunluk mesru, geri kalani fraud turleri arasinda paylastirilir.
    class_weights = {
        "TEMIZ": 0.78,
        "CALINTI_KART": 0.09,
        "HESAP_ELE_GECIRME": 0.06,
        "SUPHELI_DAVRANIS": 0.05,
        "PARA_AKLAMA": 0.02,
    }
    labels = rng.choice(list(class_weights.keys()), size=n_samples, p=list(class_weights.values()))

    rows = []
    for label in labels:
        rows.append(_generate_row(rng, label))

    df = pd.DataFrame(rows, columns=[*FEATURE_COLUMNS, "fraud_type", "is_fraud"])
    return df


def _generate_row(rng: np.random.Generator, fraud_type: str) -> list[float | str | int]:
    is_fraud = fraud_type != "TEMIZ"

    if fraud_type == "TEMIZ":
        amount = float(rng.lognormal(mean=6.0, sigma=0.8))
        is_night = rng.random() < 0.08
        is_foreign = rng.random() < 0.03
        is_new_device = rng.random() < 0.05
        is_new_recipient = rng.random() < 0.15
        amount_dev = float(np.clip(rng.normal(1.0, 0.3), 0.1, 3.0))
        last_10 = rng.poisson(0.2)
        last_24h = rng.poisson(2.0)
        device_age = float(rng.integers(1, 800))
        recipient_age = float(rng.integers(0, 500))
    elif fraud_type == "CALINTI_KART":
        amount = float(rng.lognormal(mean=7.2, sigma=0.9))
        is_night = rng.random() < 0.55
        is_foreign = rng.random() < 0.45
        is_new_device = rng.random() < 0.85
        is_new_recipient = rng.random() < 0.80
        amount_dev = float(np.clip(rng.normal(6.0, 3.0), 1.5, 20.0))
        last_10 = rng.poisson(2.5)
        last_24h = rng.poisson(6.0)
        device_age = float(rng.integers(0, 3))
        recipient_age = float(rng.integers(0, 3))
    elif fraud_type == "HESAP_ELE_GECIRME":
        amount = float(rng.lognormal(mean=6.8, sigma=0.7))
        is_night = rng.random() < 0.40
        is_foreign = rng.random() < 0.30
        is_new_device = rng.random() < 0.90
        is_new_recipient = rng.random() < 0.70
        amount_dev = float(np.clip(rng.normal(3.5, 2.0), 1.2, 15.0))
        last_10 = rng.poisson(1.5)
        last_24h = rng.poisson(5.0)
        device_age = float(rng.integers(0, 2))
        recipient_age = float(rng.integers(0, 10))
    elif fraud_type == "PARA_AKLAMA":
        amount = float(rng.lognormal(mean=8.5, sigma=0.6))
        is_night = rng.random() < 0.25
        is_foreign = rng.random() < 0.60
        is_new_device = rng.random() < 0.30
        is_new_recipient = rng.random() < 0.85
        amount_dev = float(np.clip(rng.normal(8.0, 4.0), 2.0, 25.0))
        last_10 = rng.poisson(0.5)
        last_24h = rng.poisson(3.5)
        device_age = float(rng.integers(30, 400))
        recipient_age = float(rng.integers(0, 5))
    else:  # SUPHELI_DAVRANIS
        amount = float(rng.lognormal(mean=6.5, sigma=1.0))
        is_night = rng.random() < 0.35
        is_foreign = rng.random() < 0.20
        is_new_device = rng.random() < 0.40
        is_new_recipient = rng.random() < 0.50
        amount_dev = float(np.clip(rng.normal(2.5, 1.5), 1.0, 10.0))
        last_10 = rng.poisson(1.0)
        last_24h = rng.poisson(4.0)
        device_age = float(rng.integers(0, 60))
        recipient_age = float(rng.integers(0, 60))

    hour_of_day = int(rng.integers(23, 24)) if is_night and rng.random() < 0.5 else int(rng.integers(0, 6) if is_night else rng.integers(6, 23))
    txn_type = rng.choice(["odeme", "transfer", "fatura", "cekim"], p=[0.35, 0.40, 0.15, 0.10])

    row: list[float | str | int] = [
        round(amount, 2),
        hour_of_day,
        1.0 if is_night else 0.0,
        1.0 if is_foreign else 0.0,
        1.0 if is_new_device else 0.0,
        1.0 if is_new_recipient else 0.0,
        amount_dev,
        float(last_10),
        float(last_24h),
        device_age,
        recipient_age,
        1.0 if txn_type == "odeme" else 0.0,
        1.0 if txn_type == "transfer" else 0.0,
        1.0 if txn_type == "fatura" else 0.0,
        1.0 if txn_type == "cekim" else 0.0,
        fraud_type,
        int(is_fraud),
    ]
    return row


__all__ = ["generate_dataset", "FRAUD_TYPE_CLASSES"]
