/**
 * Risk görselleştirme sözlüğü.
 *
 * Burada risk HESAPLANMAZ. Skor→seviye ve skor→karar eşiklerinin tek otoritesi
 * backend'dir (`RiskThresholds.cs`); frontend yalnızca gelen değeri renklendirir.
 * Eşikleri burada tekrarlamak iki doğruluk kaynağı yaratırdı.
 */

import type { DisplayRiskLevel } from '@/shared/api/contract';
import type { AssessmentStatus, RiskLevel, SlaStatus } from '@/shared/api/enums';

/** Değerlendirme tamamlanmadığında backend'in yazdığı değer. */
export const UNKNOWN_RISK = 'BELIRSIZ';

export const DISPLAY_RISK_LABEL: Record<DisplayRiskLevel, string> = {
  DUSUK: 'Düşük',
  ORTA: 'Orta',
  YUKSEK: 'Yüksek',
  KRITIK: 'Kritik',
  BELIRSIZ: 'Belirsiz',
};

export interface Tone {
  /** Rozet/çip dolgusu. */
  chip: string;
  /** Vurgu metni ve ikon rengi. */
  text: string;
  /** İlerleme çubuğu dolgusu. */
  bar: string;
  /** Kart sol kenar şeridi. */
  rail: string;
  /** SVG halka rengi. */
  stroke: string;
}

const TONES: Record<DisplayRiskLevel, Tone> = {
  DUSUK: {
    chip: 'bg-success-100 text-success-700',
    text: 'text-success-700',
    bar: 'bg-success-500',
    rail: 'bg-success-500',
    stroke: 'stroke-success-500',
  },
  ORTA: {
    chip: 'bg-warning-100 text-warning-700',
    text: 'text-warning-700',
    bar: 'bg-warning-500',
    rail: 'bg-warning-500',
    stroke: 'stroke-warning-500',
  },
  YUKSEK: {
    chip: 'bg-danger-100 text-danger-700',
    text: 'text-danger-700',
    bar: 'bg-danger-500',
    rail: 'bg-danger-500',
    stroke: 'stroke-danger-500',
  },
  KRITIK: {
    chip: 'bg-critical-100 text-critical-700',
    text: 'text-critical-700',
    bar: 'bg-critical-500',
    rail: 'bg-critical-500',
    stroke: 'stroke-critical-500',
  },
  BELIRSIZ: {
    chip: 'bg-ink-100 text-ink-500',
    text: 'text-ink-500',
    bar: 'bg-ink-400',
    rail: 'bg-ink-400',
    stroke: 'stroke-ink-400',
  },
};

export function riskTone(level: DisplayRiskLevel | RiskLevel | null | undefined): Tone {
  return TONES[level ?? UNKNOWN_RISK];
}

/**
 * Değerlendirme bitmemişse "BELIRSIZ" gösteririz — uydurma bir skor ya da
 * sahte "düşük risk" göstermeyiz (doküman §2, §21).
 */
export function displayRisk(
  status: AssessmentStatus,
  level: RiskLevel | null | undefined,
): DisplayRiskLevel {
  if (status !== 'COMPLETED' || !level) return UNKNOWN_RISK;
  return level;
}

/** Değerlendirme henüz sonuçlanmadı mı? */
export function isAssessmentPending(status: AssessmentStatus): boolean {
  return status !== 'COMPLETED';
}

/* -------------------------------------------------------------------- SLA -- */

/**
 * SLA durumunu backend hesaplar (`CaseSlaStatusCalculator`): geçen süre
 * <%75 NORMAL, <%90 WARNING, üstü URGENT, deadline geçtiyse BREACHED.
 * Frontend eşiği yeniden hesaplamaz, yalnızca renklendirir.
 */
export const SLA_TONE: Record<SlaStatus, Tone> = {
  NORMAL: TONES.DUSUK,
  WARNING: TONES.ORTA,
  URGENT: TONES.YUKSEK,
  BREACHED: TONES.KRITIK,
};
