import * as RadixTabs from '@radix-ui/react-tabs';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export interface TabItem<T extends string> {
  value: T;
  label: string;
  /** Sekme etiketinin yanındaki sayaç — "Vakalarım 4" gibi. */
  count?: number;
}

/**
 * Sekme çubuğu.
 *
 * URL'e bağlı sekmelerde (vaka kuyruğu durumu gibi) `value`/`onValueChange`
 * TanStack Router'ın typed search param'ına bağlanmalıdır; sekme seçimi
 * bileşen state'inde tutulursa sayfa yenilenince kaybolur ve paylaşılan link
 * yanlış sekmeyi açar.
 */
export function Tabs<T extends string>({
  items,
  value,
  onValueChange,
  children,
  className,
}: {
  items: TabItem<T>[];
  value: T;
  onValueChange: (value: T) => void;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <RadixTabs.Root
      value={value}
      onValueChange={(next) => onValueChange(next as T)}
      className={className}
    >
      <RadixTabs.List
        className={cn(
          'flex gap-1 overflow-x-auto border-b border-ink-100',
          // Yatay kaydırmada çubuk görünmesin.
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        )}
      >
        {items.map((item) => (
          <RadixTabs.Trigger
            key={item.value}
            value={item.value}
            className={cn(
              'relative shrink-0 px-4 py-3 text-sm font-semibold whitespace-nowrap',
              'text-ink-500 transition-colors hover:text-ink-700',
              'data-[state=active]:text-brand-700',
              // Aktif sekmenin altındaki camgöbeği çizgi.
              'after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full',
              'after:bg-transparent data-[state=active]:after:bg-aqua-500',
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span
                className={cn(
                  'ml-1.5 rounded-pill px-1.5 py-0.5 text-[11px] tabular',
                  'bg-ink-100 text-ink-500',
                )}
              >
                {item.count}
              </span>
            )}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {children}
    </RadixTabs.Root>
  );
}

export const TabPanel = RadixTabs.Content;
