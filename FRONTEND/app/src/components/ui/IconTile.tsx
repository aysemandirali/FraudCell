import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'brand' | 'aqua' | 'success' | 'warning' | 'danger' | 'turkcell' | 'neutral';

/**
 * Paycell'in her yerde kullandığı açık mavi zeminli ikon kutusu.
 * Liste satırlarında yuvarlak, hızlı-aksiyon ızgarasında yuvarlatılmış kare.
 */
const TONES: Record<Tone, string> = {
  brand: 'bg-brand-100 text-brand-700',
  aqua: 'bg-aqua-50 text-aqua-700',
  success: 'bg-success-100 text-success-700',
  warning: 'bg-warning-100 text-warning-700',
  danger: 'bg-danger-100 text-danger-700',
  turkcell: 'bg-tc-100 text-[#b38c00]',
  neutral: 'bg-ink-100 text-ink-500',
};

const SIZES = {
  sm: 'size-9 [&>svg]:size-4.5',
  md: 'size-12 [&>svg]:size-6',
  lg: 'size-14 [&>svg]:size-7',
} as const;

export function IconTile({
  children,
  tone = 'brand',
  size = 'md',
  shape = 'circle',
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  size?: keyof typeof SIZES;
  shape?: 'circle' | 'squircle';
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center',
        shape === 'circle' ? 'rounded-full' : 'rounded-tile',
        TONES[tone],
        SIZES[size],
        className,
      )}
    >
      {children}
    </span>
  );
}
