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
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('surface-card p-4', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-ink-500">{label}</p>
        {icon && <span className="shrink-0 text-ink-400">{icon}</span>}
      </div>
      <p className={cn('mt-2 text-2xl font-bold tabular', tone)}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </div>
  );
}
