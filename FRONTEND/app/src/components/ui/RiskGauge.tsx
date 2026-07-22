import { cn } from '@/lib/cn';
import { formatRiskPercent } from '@/lib/format';
import { RISK_LEVEL_LABEL, UNKNOWN_RISK_LABEL, riskTone } from '@/domain/risk';
import type { AssessmentStatus, RiskLevel } from '@/domain/types';

const SIZES = {
  sm: { box: 64, stroke: 6, value: 'text-sm', label: 'text-[10px]' },
  md: { box: 96, stroke: 8, value: 'text-xl', label: 'text-[11px]' },
  lg: { box: 132, stroke: 10, value: 'text-3xl', label: 'text-xs' },
} as const;

const STROKE_BY_LEVEL: Record<RiskLevel, string> = {
  DUSUK: 'stroke-success-500',
  ORTA: 'stroke-warning-500',
  YUKSEK: 'stroke-danger-500',
  KRITIK: 'stroke-critical-500',
};

export interface RiskGaugeProps {
  score: number | null;
  level: RiskLevel | null;
  status: AssessmentStatus;
  size?: keyof typeof SIZES;
  className?: string;
}

/**
 * Risk skorunu halka olarak gösterir.
 * Değerlendirme tamamlanmadığında (AI kapalı / kuyrukta) halka gri ve
 * "BELİRSİZ" yazar — sahte bir skor uydurmaz (doküman §2, §21).
 */
export function RiskGauge({ score, level, status, size = 'md', className }: RiskGaugeProps) {
  const spec = SIZES[size];
  const pending = status !== 'COMPLETED' || score === null || level === null;

  const radius = (spec.box - spec.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = pending ? 0 : Math.max(0, Math.min(1, score));

  const tone = riskTone(level);

  return (
    <div
      className={cn('relative inline-flex shrink-0', className)}
      style={{ width: spec.box, height: spec.box }}
      role="img"
      aria-label={
        pending
          ? 'Risk skoru henüz belirlenmedi'
          : `Risk skoru ${formatRiskPercent(score)}, seviye ${RISK_LEVEL_LABEL[level]}`
      }
    >
      <svg width={spec.box} height={spec.box} className="-rotate-90" aria-hidden>
        <circle
          cx={spec.box / 2}
          cy={spec.box / 2}
          r={radius}
          fill="none"
          strokeWidth={spec.stroke}
          className="stroke-ink-100"
        />
        {!pending && (
          <circle
            cx={spec.box / 2}
            cy={spec.box / 2}
            r={radius}
            fill="none"
            strokeWidth={spec.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - filled)}
            className={cn('transition-[stroke-dashoffset] duration-700', STROKE_BY_LEVEL[level])}
          />
        )}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {pending ? (
          <>
            {/* Bekleyen değerlendirme: nokta animasyonu + BELİRSİZ etiketi. */}
            <span
              className={cn('animate-pulse-ring font-bold text-ink-400', spec.value)}
              aria-hidden
            >
              ?
            </span>
            <span className={cn('mt-0.5 font-semibold text-ink-400', spec.label)}>
              {UNKNOWN_RISK_LABEL}
            </span>
          </>
        ) : (
          <>
            <span className={cn('font-bold tabular', spec.value, tone.text)}>
              {formatRiskPercent(score)}
            </span>
            <span className={cn('mt-0.5 font-semibold tracking-wide uppercase', spec.label, tone.text)}>
              {RISK_LEVEL_LABEL[level]}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/** Yatay risk çubuğu — liste satırlarında halka yerine daha kompakt. */
export function RiskBar({
  score,
  level,
  status,
  className,
}: Omit<RiskGaugeProps, 'size'> & { className?: string }) {
  const pending = status !== 'COMPLETED' || score === null || level === null;
  const tone = riskTone(level);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
        <div
          className={cn('h-full rounded-full transition-[width] duration-700', tone.bar)}
          style={{ width: pending ? '100%' : `${Math.round((score ?? 0) * 100)}%` }}
        />
      </div>
      <span className={cn('shrink-0 text-xs font-semibold tabular', tone.text)}>
        {pending ? UNKNOWN_RISK_LABEL : formatRiskPercent(score)}
      </span>
    </div>
  );
}
