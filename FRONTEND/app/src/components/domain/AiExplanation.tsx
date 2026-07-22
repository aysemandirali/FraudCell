import { Cpu, Info } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui';
import { IMPACT_LABEL, IMPACT_TONE } from '@/domain/risk';
import { FRAUD_TYPE_LABEL, type AiAssessment } from '@/domain/types';

/**
 * AI açıklama katmanı (doküman §12).
 *
 * Jüriye yalnızca "%94" göstermeyiz. Ancak reason code'ları model açıklaması
 * gibi de sunmayız: skorun ML modelinden, açıklamaların engineered feature ve
 * kural değerlendirmesinden geldiğini ekranda açıkça yazarız.
 */
export function AiExplanation({
  assessment,
  className,
}: {
  assessment: AiAssessment;
  className?: string;
}) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="brand" className="gap-1.5">
          <Cpu className="size-3.5" />
          {assessment.modelVersion}
        </Badge>
        {assessment.fraudType !== 'TEMIZ' && (
          <Badge tone="warning">{FRAUD_TYPE_LABEL[assessment.fraudType]}</Badge>
        )}
      </div>

      <ul className="space-y-2">
        {assessment.reasonCodes.map((reason) => (
          <li
            key={reason.code}
            className="flex items-start gap-3 rounded-tile border border-ink-100 bg-canvas px-3.5 py-3"
          >
            <span
              className={cn(
                'mt-0.5 shrink-0 rounded-pill px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase',
                IMPACT_TONE[reason.impact],
              )}
            >
              {IMPACT_LABEL[reason.impact]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink-900">{reason.label}</p>
              <p className="mt-0.5 font-mono text-xs text-ink-400">{reason.code}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-400">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Risk skoru ML modelinden, buradaki operasyonel açıklamalar engineered feature ve kural
        değerlendirme katmanından üretilir.
      </p>
    </div>
  );
}
