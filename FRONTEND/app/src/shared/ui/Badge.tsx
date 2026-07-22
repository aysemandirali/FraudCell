import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

type Tone = 'brand' | 'aqua' | 'success' | 'warning' | 'danger' | 'critical' | 'neutral';

const TONES: Record<Tone, string> = {
  brand: 'bg-brand-100 text-brand-800',
  aqua: 'bg-aqua-50 text-aqua-700',
  success: 'bg-success-100 text-success-700',
  warning: 'bg-warning-100 text-warning-700',
  danger: 'bg-danger-100 text-danger-700',
  critical: 'bg-critical-100 text-critical-700',
  neutral: 'bg-ink-100 text-ink-500',
};

export function Badge({
  children,
  tone = 'neutral',
  solid = false,
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  /** Tasarımdaki dolu yeşil "Yeni" rozeti gibi. */
  solid?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-pill px-2.5 py-1',
        'text-xs font-semibold whitespace-nowrap',
        solid ? 'bg-success-500 text-white' : TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Hazır token sınıfı taşıyan rozet — risk seviyesi ve SLA durumu gibi
 * rengi `shared/lib/risk` sözlüğünden gelen yerlerde kullanılır.
 */
export function ToneBadge({
  children,
  className,
  toneClass,
}: {
  children: ReactNode;
  /** `riskTone(...).chip` ya da `SLA_TONE[...].chip` */
  toneClass: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-pill px-2.5 py-1',
        'text-xs font-semibold whitespace-nowrap',
        toneClass,
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Yanıp sönen noktalı canlı durum göstergesi — SLA kritik, bağlantı vs. */
export function PulseDot({ className }: { className?: string }) {
  return (
    <span className={cn('relative flex size-2', className)} aria-hidden>
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />
      <span className="relative inline-flex size-2 rounded-full bg-current" />
    </span>
  );
}
