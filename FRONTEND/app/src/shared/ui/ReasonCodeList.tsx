import { cn } from '@/shared/lib/cn';
import type { ReasonCodeResponse } from '@/shared/api/contract';
import type { ReasonImpact } from '@/shared/api/enums';

/**
 * AI reason code listesi — kararın gerekçeleri.
 *
 * DESIGN.MD §12: bunlar model açıklaması DEĞİL, rule/feature katmanından gelen
 * gerekçelerdir. Etki (impact) rengi ile ağırlığı gösterilir; hem müşteri işlem
 * detayında hem analist vaka tezgâhında aynı görünür.
 */

const IMPACT: Record<ReasonImpact, { label: string; dot: string; chip: string; weight: number }> = {
  HIGH: { label: 'Yüksek etki', dot: 'bg-danger-500', chip: 'bg-danger-100 text-danger-700', weight: 100 },
  MEDIUM: { label: 'Orta etki', dot: 'bg-warning-500', chip: 'bg-warning-100 text-warning-700', weight: 62 },
  LOW: { label: 'Düşük etki', dot: 'bg-brand-400', chip: 'bg-brand-100 text-brand-700', weight: 32 },
};

const ORDER: Record<ReasonImpact, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

export function ReasonCodeList({
  reasons,
  className,
}: {
  reasons: ReasonCodeResponse[];
  className?: string;
}) {
  if (reasons.length === 0) {
    return <p className={cn('text-sm text-ink-400', className)}>Gerekçe kaydı yok.</p>;
  }

  const sorted = [...reasons].sort((a, b) => ORDER[a.impact] - ORDER[b.impact]);

  return (
    <ul className={cn('space-y-2.5', className)}>
      {sorted.map((reason) => {
        const spec = IMPACT[reason.impact];
        return (
          <li key={reason.code} className="rounded-tile bg-canvas px-3.5 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className={cn('size-2 shrink-0 rounded-full', spec.dot)} aria-hidden />
                <span className="min-w-0 truncate text-sm font-medium text-ink-800">
                  {reason.label}
                </span>
              </div>
              <span
                className={cn(
                  'shrink-0 rounded-pill px-2 py-0.5 text-micro font-semibold',
                  spec.chip,
                )}
              >
                {spec.label}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100">
              <div
                className={cn('h-full rounded-full', spec.dot)}
                style={{ width: `${spec.weight}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
