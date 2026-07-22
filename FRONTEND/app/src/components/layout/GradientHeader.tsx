import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Ana sayfanın gradient üst bloğu. İçerik kartı bloğun altına taşarak
 * üst üste biner — tasarımdaki "Son Hareketler" kartının davranışı.
 */
export function GradientHeader({
  children,
  /** Alt kenarda kartın binmesi için bırakılan taşma payı (px). */
  overlap = 0,
  className,
}: {
  children: ReactNode;
  overlap?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'gradient-header safe-top relative rounded-b-[28px] px-5 pt-3 text-white',
        className,
      )}
      style={{ paddingBottom: overlap ? overlap + 16 : 20 }}
    >
      <div className="mx-auto max-w-3xl">{children}</div>
    </div>
  );
}

/** Gradient bloğun içindeki yarı saydam cam kart — "Faturana Yansıt" şeridi. */
export function GlassCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-card border border-white/25 bg-white/15 px-4 py-3.5 backdrop-blur-sm',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Gradient blokta duran hızlı aksiyon — beyaz kutu içinde ikon, altında etiket. */
export function QuickAction({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 transition-transform duration-150 active:scale-95"
    >
      <span className="flex size-14 items-center justify-center rounded-tile bg-white/95 text-brand-700 shadow-raised [&>svg]:size-6">
        {icon}
      </span>
      <span className="text-[13px] font-medium text-white">{label}</span>
    </button>
  );
}
