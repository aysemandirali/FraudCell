import type { AssessmentStatus, Decision, RiskLevel } from './types';

/**
 * Karar eşikleri — doküman §9. Sınır davranışı testlerle sabitlenmiştir:
 *   0.3999 -> ONAY | 0.4000 -> INCELEME | 0.9000 -> INCELEME | 0.9001 -> BLOK
 */
export const RISK_THRESHOLD = {
  review: 0.4,
  block: 0.9,
} as const;

export function decisionForScore(score: number): Decision {
  if (score < RISK_THRESHOLD.review) return 'ONAY';
  if (score <= RISK_THRESHOLD.block) return 'INCELEME';
  return 'BLOK';
}

/**
 * Skordan risk seviyesi. Otorite backend'dir; bu eşleme mock backend ve
 * backend seviyeyi göndermediğinde devreye giren yedek yoldur.
 */
export function riskLevelForScore(score: number): RiskLevel {
  if (score < RISK_THRESHOLD.review) return 'DUSUK';
  if (score < 0.7) return 'ORTA';
  if (score <= RISK_THRESHOLD.block) return 'YUKSEK';
  return 'KRITIK';
}

export const RISK_LEVEL_LABEL: Record<RiskLevel, string> = {
  DUSUK: 'Düşük',
  ORTA: 'Orta',
  YUKSEK: 'Yüksek',
  KRITIK: 'Kritik',
};

export const DECISION_LABEL: Record<Decision, string> = {
  ONAY: 'Onay',
  INCELEME: 'İnceleme',
  BLOK: 'Blok',
};

/** Değerlendirme tamamlanmadığında arayüzde gösterilen etiket (doküman §2). */
export const UNKNOWN_RISK_LABEL = 'BELİRSİZ';

export interface RiskTone {
  /** Rozet/çip dolgusu. */
  chip: string;
  /** Vurgu metni ve ikon rengi. */
  text: string;
  /** İlerleme çubuğu / halka dolgusu. */
  bar: string;
  /** Kart sol kenar şeridi. */
  rail: string;
}

const TONES: Record<RiskLevel | 'UNKNOWN', RiskTone> = {
  DUSUK: {
    chip: 'bg-success-100 text-success-700',
    text: 'text-success-700',
    bar: 'bg-success-500',
    rail: 'bg-success-500',
  },
  ORTA: {
    chip: 'bg-warning-100 text-warning-700',
    text: 'text-warning-700',
    bar: 'bg-warning-500',
    rail: 'bg-warning-500',
  },
  YUKSEK: {
    chip: 'bg-danger-100 text-danger-700',
    text: 'text-danger-700',
    bar: 'bg-danger-500',
    rail: 'bg-danger-500',
  },
  KRITIK: {
    chip: 'bg-critical-100 text-critical-700',
    text: 'text-critical-700',
    bar: 'bg-critical-500',
    rail: 'bg-critical-500',
  },
  UNKNOWN: {
    chip: 'bg-ink-100 text-ink-500',
    text: 'text-ink-500',
    bar: 'bg-ink-400',
    rail: 'bg-ink-400',
  },
};

export function riskTone(level: RiskLevel | null | undefined): RiskTone {
  return TONES[level ?? 'UNKNOWN'];
}

/**
 * Ekranda gösterilecek risk etiketi. Değerlendirme bitmemişse gerçek enum'a
 * yeni bir değer eklemek yerine "BELİRSİZ" gösteririz — domain modeli temiz kalır.
 */
export function displayRiskLabel(
  status: AssessmentStatus,
  level: RiskLevel | null | undefined,
): string {
  if (status !== 'COMPLETED' || !level) return UNKNOWN_RISK_LABEL;
  return RISK_LEVEL_LABEL[level];
}

/** AI kapalıyken karar yedeği INCELEME olur (doküman §21). */
export function displayDecision(
  status: AssessmentStatus,
  decision: Decision | null | undefined,
): Decision {
  if (status !== 'COMPLETED' || !decision) return 'INCELEME';
  return decision;
}

export const IMPACT_LABEL = {
  HIGH: 'Yüksek etki',
  MEDIUM: 'Orta etki',
  LOW: 'Düşük etki',
} as const;

export const IMPACT_TONE = {
  HIGH: 'bg-danger-100 text-danger-700',
  MEDIUM: 'bg-warning-100 text-warning-700',
  LOW: 'bg-ink-100 text-ink-500',
} as const;
