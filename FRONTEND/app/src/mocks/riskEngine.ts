import { decisionForScore, riskLevelForScore } from '@/domain/risk';
import type { AiAssessment, FraudType, ReasonCode, Transaction } from '@/domain/types';

/**
 * Mock risk motoru.
 *
 * Gerçek sistemde bu iş Python/FastAPI + scikit-learn tarafında yapılır
 * (doküman §12). Buradaki amaç arayüzü backend olmadan gerçekçi ve
 * DETERMİNİSTİK biçimde sürebilmektir: aynı girdi her zaman aynı skoru üretir,
 * böylece demo tekrarlanabilir olur.
 */

/** Müşterinin "normal" davranış profili — sapma buna göre ölçülür. */
export interface CustomerProfile {
  averageAmount: number;
  usualCities: string[];
  knownDevices: string[];
  knownRecipients: string[];
}

export const DEFAULT_PROFILE: CustomerProfile = {
  averageAmount: 850,
  usualCities: ['İstanbul', 'Kocaeli'],
  knownDevices: ['Xiaomi Redmi Note 12', 'Chrome / Windows'],
  knownRecipients: ['Mehmet Kaya', 'Elif Şahin', 'Turkcell Fatura'],
};

interface Signal {
  code: string;
  label: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  weight: number;
  /** Bu sinyal hangi fraud tipine işaret ediyor. */
  suggests: FraudType | null;
}

/**
 * Kural katmanı. Ağırlıklar toplanıp lojistik benzeri bir eğriden geçirilir.
 * Kurallar açıklanabilir olduğu için jüriye reason code olarak sunulur.
 */
function evaluateSignals(tx: Transaction, profile: CustomerProfile): Signal[] {
  const signals: Signal[] = [];
  const hour = new Date(tx.occurredAt).getHours();
  const ratio = tx.amount / Math.max(profile.averageAmount, 1);

  if (!profile.knownDevices.includes(tx.sourceDevice)) {
    signals.push({
      code: 'NEW_DEVICE',
      label: 'İlk kez görülen cihaz',
      impact: 'HIGH',
      weight: 1.5,
      suggests: 'HESAP_ELE_GECIRME',
    });
  }

  if (ratio >= 3) {
    signals.push({
      code: 'AMOUNT_DEVIATION',
      label: `Normal tutarın ${ratio.toFixed(1)} katı`,
      impact: ratio >= 6 ? 'HIGH' : 'MEDIUM',
      weight: ratio >= 6 ? 1.6 : 0.9,
      suggests: 'CALINTI_KART',
    });
  }

  if (!profile.usualCities.includes(tx.city)) {
    signals.push({
      code: 'UNUSUAL_LOCATION',
      label: `Alışılmadık şehir: ${tx.city}`,
      impact: 'HIGH',
      weight: 1.3,
      suggests: 'CALINTI_KART',
    });
  }

  if (tx.country !== 'TR') {
    signals.push({
      code: 'CROSS_BORDER',
      label: `Yurt dışı işlem: ${tx.country}`,
      impact: 'HIGH',
      weight: 1.4,
      suggests: 'PARA_AKLAMA',
    });
  }

  if (hour >= 1 && hour <= 5) {
    signals.push({
      code: 'NIGHT_TRANSACTION',
      label: `Gece saatinde işlem (${String(hour).padStart(2, '0')}:00)`,
      impact: 'MEDIUM',
      weight: 0.7,
      suggests: 'SUPHELI_DAVRANIS',
    });
  }

  if (!profile.knownRecipients.includes(tx.recipient)) {
    signals.push({
      code: 'NEW_RECIPIENT',
      label: 'Daha önce işlem yapılmamış alıcı',
      impact: 'MEDIUM',
      weight: 0.8,
      suggests: 'SUPHELI_DAVRANIS',
    });
  }

  // Yuvarlak ve yüksek tutarlar klasik para aklama göstergesidir.
  if (tx.amount >= 10_000 && tx.amount % 1000 === 0) {
    signals.push({
      code: 'ROUND_HIGH_AMOUNT',
      label: 'Yüksek ve yuvarlak tutar',
      impact: 'MEDIUM',
      weight: 0.9,
      suggests: 'PARA_AKLAMA',
    });
  }

  if (tx.transactionType === 'YURT_DISI_TRANSFER' && tx.amount >= 5_000) {
    signals.push({
      code: 'HIGH_VALUE_WIRE',
      label: 'Yüksek tutarlı yurt dışı transferi',
      impact: 'HIGH',
      weight: 1.2,
      suggests: 'PARA_AKLAMA',
    });
  }

  if (signals.length === 0) {
    signals.push({
      code: 'CONSISTENT_BEHAVIOUR',
      label: 'Geçmiş davranışla tutarlı',
      impact: 'LOW',
      weight: -0.6,
      suggests: null,
    });
  }

  return signals;
}

/** Ağırlık toplamını 0–1 aralığına sıkıştırır. */
function squash(totalWeight: number): number {
  const score = 1 / (1 + Math.exp(-(totalWeight - 1.6)));
  // İki ondalık basamağa yuvarla — eşik testleri net olsun.
  return Math.round(score * 10_000) / 10_000;
}

function classifyFraudType(signals: Signal[], score: number): FraudType {
  if (score < 0.4) return 'TEMIZ';

  const tally = new Map<FraudType, number>();
  for (const signal of signals) {
    if (!signal.suggests) continue;
    tally.set(signal.suggests, (tally.get(signal.suggests) ?? 0) + signal.weight);
  }

  let best: FraudType = 'SUPHELI_DAVRANIS';
  let bestWeight = -Infinity;
  for (const [type, weight] of tally) {
    if (weight > bestWeight) {
      best = type;
      bestWeight = weight;
    }
  }
  return best;
}

export function assess(tx: Transaction, profile: CustomerProfile = DEFAULT_PROFILE): AiAssessment {
  const signals = evaluateSignals(tx, profile);
  const total = signals.reduce((sum, signal) => sum + signal.weight, 0);
  const riskScore = squash(total);

  const reasonCodes: ReasonCode[] = signals
    // Etki sırasına göre göster; en açıklayıcı sinyal en üstte.
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)
    .map(({ code, label, impact }) => ({ code, label, impact }));

  return {
    transactionId: tx.id,
    riskScore,
    riskLevel: riskLevelForScore(riskScore),
    decision: decisionForScore(riskScore),
    fraudType: classifyFraudType(signals, riskScore),
    modelVersion: 'risk-1.0.0',
    reasonCodes,
    assessedAt: new Date().toISOString(),
  };
}

/**
 * Analist atama skoru — doküman §13'teki formülün birebir uygulaması:
 *   expertise_match * 0.50 + capacity_ratio * 0.30 + performance * 0.20
 */
export function assignmentScore(input: {
  expertiseMatch: 0 | 1;
  activeCases: number;
  performance: number;
}): number {
  const capacityRatio = Math.max(0, 1 - input.activeCases / 10);
  const score = input.expertiseMatch * 0.5 + capacityRatio * 0.3 + input.performance * 0.2;
  return Math.round(score * 10_000) / 10_000;
}
