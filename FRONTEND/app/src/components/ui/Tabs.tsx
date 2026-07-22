import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
  count?: number;
}

/**
 * Alt çizgili sekme — tasarımdaki "Kartlarım / Diğer Hesaplarım".
 * Aktif sekme mavi metin + 3px mavi alt çizgi.
 */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={cn('flex border-b border-ink-200 bg-white', className)}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              'relative flex flex-1 items-center justify-center gap-2 px-3 py-3.5',
              'text-[15px] font-medium transition-colors duration-150',
              active ? 'text-brand-700' : 'text-ink-500 hover:text-ink-700',
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span
                className={cn(
                  'rounded-pill px-1.5 py-0.5 text-xs font-semibold tabular',
                  active ? 'bg-brand-100 text-brand-800' : 'bg-ink-100 text-ink-500',
                )}
              >
                {item.count}
              </span>
            )}
            {active && (
              <span
                aria-hidden
                className="absolute inset-x-0 -bottom-px h-[3px] rounded-t-full bg-brand-700"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Yuvarlak filtre çipleri — tasarımdaki "Nakit İade / Hediye Para / Puan".
 * Seçili olan camgöbeği dolgulu.
 */
export function ChipGroup<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: { value: T; label: ReactNode; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex gap-2 overflow-x-auto pb-1', className)}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item.value)}
            className={cn(
              'shrink-0 rounded-pill border px-4 py-2 text-sm font-medium',
              'transition-colors duration-150',
              active
                ? 'border-aqua-500 bg-aqua-500 text-white'
                : 'border-ink-200 bg-white text-ink-700 hover:border-ink-400',
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span className={cn('ml-1.5 tabular', active ? 'text-white/80' : 'text-ink-400')}>
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
