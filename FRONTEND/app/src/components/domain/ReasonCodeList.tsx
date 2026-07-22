import { cn } from '@/lib/cn';
import { IMPACT_LABEL, IMPACT_TONE } from '@/domain/risk';
import type { ReasonCode } from '@/domain/types';

/**
 * AI'ın kararına gerekçe olan operasyonel sinyaller.
 *
 * Bunlar model açıklaması değil, engineered feature ve kural değerlendirme
 * katmanının çıktısıdır (doküman §12) — arayüzde de böyle etiketlenir.
 */
export function ReasonCodeList({
  reasonCodes,
  className,
}: {
  reasonCodes: ReasonCode[];
  className?: string;
}) {
  if (reasonCodes.length === 0) return null;

  return (
    <ul className={cn('space-y-2', className)}>
      {reasonCodes.map((reason) => (
        <li
          key={reason.code}
          className="flex items-start gap-3 rounded-tile border border-ink-100 bg-canvas px-3 py-2.5"
        >
          <span
            className={cn(
              'mt-0.5 shrink-0 rounded-pill px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase',
              IMPACT_TONE[reason.impact],
            )}
          >
            {IMPACT_LABEL[reason.impact]}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-ink-900">{reason.label}</span>
            <span className="mt-0.5 block font-mono text-[11px] text-ink-400">{reason.code}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
