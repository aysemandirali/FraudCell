import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

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
