import { cn } from '@/shared/lib/cn';

/** Turkcell sinyalini güvenlik kalkanıyla birleştiren ürün işareti. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn('size-10', className)} role="img" aria-label="Turkcell FraudCell">
      <path
        d="M24 2.8 41.5 9v13.8c0 10.8-7.1 19-17.5 22-10.4-3-17.5-11.2-17.5-22V9L24 2.8Z"
        fill="currentColor"
      />
      <path
        d="M15.8 25.4c3.6-5.7 12.8-8.8 19.1-4.6M17.8 30.2c3-3.9 8.8-5.7 13.3-3.5"
        fill="none"
        stroke="white"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <circle cx="23.4" cy="33.3" r="3.4" className="fill-tc-500" />
    </svg>
  );
}

export function LogoWordmark({
  className,
  tone = 'brand',
}: {
  className?: string;
  tone?: 'brand' | 'white';
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className={cn('size-9', tone === 'white' ? 'text-white' : 'text-brand-900')} />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            'text-[9px] font-bold tracking-[0.24em] uppercase',
            tone === 'white' ? 'text-white/65' : 'text-brand-600',
          )}
        >
          Turkcell
        </span>
        <span
          className={cn(
            'mt-1 text-lg font-bold tracking-[-0.035em]',
            tone === 'white' ? 'text-white' : 'text-brand-950',
          )}
        >
          Fraud<span className={cn('font-medium', tone === 'white' ? 'text-aqua-300' : 'text-aqua-700')}>Cell</span>
        </span>
      </span>
    </span>
  );
}
