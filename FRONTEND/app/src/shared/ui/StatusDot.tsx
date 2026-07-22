import { cn } from '@/shared/lib/cn';

type DotTone = 'live' | 'idle' | 'warning' | 'danger';

const TONE: Record<DotTone, string> = {
  live: 'text-success-500',
  idle: 'text-ink-400',
  warning: 'text-warning-500',
  danger: 'text-danger-500',
};

/**
 * Canlı durum noktası — bağlantı/nabız göstergesi.
 *
 * `live` ve `danger` tonları yanıp söner (dikkat çeker); `idle` sabittir.
 * PulseDot'tan farkı: etiket taşır ve ton semantiktir.
 */
export function StatusDot({
  tone = 'live',
  label,
  className,
}: {
  tone?: DotTone;
  label?: string;
  className?: string;
}) {
  const pulsing = tone === 'live' || tone === 'danger';
  return (
    <span className={cn('inline-flex items-center gap-2', TONE[tone], className)}>
      <span className="relative flex size-2" aria-hidden>
        {pulsing && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />
        )}
        <span className="relative inline-flex size-2 rounded-full bg-current" />
      </span>
      {label && <span className="text-xs font-medium">{label}</span>}
    </span>
  );
}
