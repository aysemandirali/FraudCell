import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** İç boşluğu kaldırır — liste satırları kendi padding'ini yönetsin diye. */
  flush?: boolean;
  /** Sol kenarda renkli şerit (risk seviyesi vurgusu için). */
  rail?: string;
}

export function Card({ flush = false, rail, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'surface-card relative overflow-hidden',
        !flush && 'p-4',
        rail && 'pl-5',
        className,
      )}
      {...rest}
    >
      {rail && <span className={cn('absolute inset-y-0 left-0 w-1', rail)} aria-hidden />}
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold text-ink-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Bölüm başlığı — "Kazandıklarım", "Kodlar ve Pinler" gibi. */
export function SectionTitle({
  children,
  action,
  className,
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-3 flex items-center justify-between gap-3', className)}>
      <h2 className="text-[17px] font-semibold text-ink-700">{children}</h2>
      {action}
    </div>
  );
}

/**
 * Dashboard sayı kartı. DESIGN.MD kural 2 gereği değer backend'den gelen
 * aggregate'tir; bu bileşen hesap yapmaz, yalnızca gösterir.
 */
export function StatTile({
  label,
  value,
  hint,
  tone = 'text-ink-900',
  icon,
  trend,
  footer,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: string;
  icon?: ReactNode;
  /** Küçük değişim rozeti — yön ve renk anlamlıdır. */
  trend?: { value: string; direction: 'up' | 'down' | 'flat'; good?: boolean };
  /** Kartın altına gelen serbest içerik — sparkline vb. */
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('surface-panel p-4', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-ink-500">{label}</p>
        {icon && (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-tile bg-brand-50 text-brand-600">
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <p className={cn('text-2xl font-bold tabular', tone)}>{value}</p>
        {trend && (
          <span
            className={cn(
              'text-caption font-semibold',
              trend.direction === 'flat'
                ? 'text-ink-400'
                : trend.good
                  ? 'text-success-600'
                  : 'text-danger-600',
            )}
          >
            {trend.direction === 'up' ? '▲' : trend.direction === 'down' ? '▼' : '—'} {trend.value}
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );
}
