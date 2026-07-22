import { X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

export interface ChipOption<T extends string> {
  value: T;
  label: string;
}

/**
 * Tekli-seçim çip filtresi.
 *
 * Seçili değer üst bileşenden gelir ve URL search param'ına bağlanmalıdır
 * (DESIGN.MD "URL bir state kaynağı"): `undefined` → "Tümü". Bileşen kendi
 * state'ini tutmaz; seçimi `onChange` ile yukarı bildirir.
 */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  allLabel = 'Tümü',
  className,
}: {
  options: ChipOption<T>[];
  value: T | undefined;
  onChange: (value: T | undefined) => void;
  allLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)} role="group">
      <Chip active={value === undefined} onClick={() => onChange(undefined)}>
        {allLabel}
      </Chip>
      {options.map((option) => {
        const active = value === option.value;
        return (
          <Chip
            key={option.value}
            active={active}
            onClick={() => onChange(active ? undefined : option.value)}
          >
            {option.label}
            {active && <X className="size-3.5" aria-hidden />}
          </Chip>
        );
      })}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1 rounded-pill border px-3.5 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'border-brand-600 bg-brand-600 text-white'
          : 'border-ink-200 bg-surface text-ink-600 hover:border-brand-300 hover:text-brand-700',
      )}
    >
      {children}
    </button>
  );
}
