import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export interface TimelineEntry {
  id: string;
  title: ReactNode;
  meta?: ReactNode;
  description?: ReactNode;
  /** Nokta rengi sınıfı — örn. durum tonundan. Varsayılan marka. */
  dotClass?: string;
  icon?: ReactNode;
}

/**
 * Dikey zaman çizelgesi — vaka durum geçişleri ve aktivite akışı.
 *
 * Bağlayıcı çizgi son öğede kesilir. Sıralama çağıran tarafın işi (en yeni
 * üstte ya da altta); bileşen geleni olduğu gibi çizer.
 */
export function Timeline({
  entries,
  className,
}: {
  entries: TimelineEntry[];
  className?: string;
}) {
  return (
    <ol className={cn('relative', className)}>
      {entries.map((entry, index) => {
        const last = index === entries.length - 1;
        return (
          <li key={entry.id} className="relative flex gap-3.5 pb-5 last:pb-0">
            {!last && (
              <span
                className="absolute top-6 bottom-0 left-[11px] w-px bg-ink-200"
                aria-hidden
              />
            )}
            <span
              className={cn(
                'relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ring-4 ring-surface',
                entry.dotClass ?? 'bg-brand-100 text-brand-700',
              )}
            >
              {entry.icon ?? <span className="size-2 rounded-full bg-current" />}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="text-sm font-semibold text-ink-900">{entry.title}</p>
                {entry.meta && <span className="text-caption text-ink-400">{entry.meta}</span>}
              </div>
              {entry.description && (
                <div className="mt-0.5 text-sm text-ink-500">{entry.description}</div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
