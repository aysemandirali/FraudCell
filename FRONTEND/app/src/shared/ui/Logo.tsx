import { cn } from '@/shared/lib/cn';

/**
 * FraudCell işareti — Paycell'in "p + sarı nokta" formunu kalkan siluetiyle
 * birleştirir. Tek renk kullanır, arkaplandan `currentColor` alır.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn('size-10', className)} role="img" aria-label="FraudCell">
      {/* Kalkan gövdesi */}
      <path
        d="M24 3.5 41 9.8v13.4c0 10.4-6.9 18.6-17 21.3-10.1-2.7-17-10.9-17-21.3V9.8L24 3.5Z"
        fill="currentColor"
      />
      {/* Paycell "p" formundaki iç boşluk */}
      <path
        d="M18.6 34.4V15.2c0-.5.4-.9.9-.9h5.9c4.4 0 7.6 2.9 7.6 7.1s-3.2 7.2-7.6 7.2h-2.6v5.8c0 .5-.4.9-.9.9h-2.4c-.5 0-.9-.4-.9-.9Z"
        className="fill-white"
      />
      {/* Turkcell sarısı nokta */}
      <circle cx="25.4" cy="21.4" r="3.1" className="fill-tc-500" />
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
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark className={cn('size-8', tone === 'white' ? 'text-white' : 'text-brand-800')} />
      <span
        className={cn(
          'text-xl font-bold tracking-tight',
          tone === 'white' ? 'text-white' : 'text-brand-900',
        )}
      >
        Fraud<span className="font-medium opacity-80">Cell</span>
      </span>
    </span>
  );
}
