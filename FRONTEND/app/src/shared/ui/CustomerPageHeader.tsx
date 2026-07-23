import type { ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

export function CustomerPageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'surface-elevated relative mb-6 overflow-hidden px-5 py-5 sm:px-6 sm:py-6',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-2/5 canvas-grid opacity-60 sm:block" aria-hidden />
      <div className="pointer-events-none absolute -top-20 right-4 size-48 rounded-full bg-aqua-100/70 blur-3xl" aria-hidden />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[10px] font-bold tracking-[0.15em] text-brand-600 uppercase">
            <span className="flex size-6 items-center justify-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-100">
              <ShieldCheck className="size-3.5" aria-hidden />
            </span>
            Güvenlik merkezi
          </p>
          <h1 className="mt-3 text-[1.7rem] leading-tight font-bold tracking-[-0.035em] text-brand-950 sm:text-[1.9rem]">
            {title}
          </h1>
          {description ? (
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-500 sm:text-body">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
