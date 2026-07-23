import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

export interface Breadcrumb {
  label: string;
  to?: string;
}

/**
 * Konsol sayfa başlığı — tüm operasyon ekranlarının ortak tepesi.
 *
 * Önceden her sayfa kendi `<header><h1>` bloğunu yazıyordu; başlık boyutu ve
 * boşluğu ekrandan ekrana kayıyordu. Burada tek yerde toplanır: başlık, açıklama,
 * kırıntı yolu ve sağ aksiyon slotu. `text-h1` token'ı ölçeği sabitler.
 */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  breadcrumbs?: Breadcrumb[];
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'relative mb-6 overflow-hidden rounded-[1.5rem] border border-brand-100/80 bg-white/84 px-5 py-5 shadow-[0_20px_45px_-36px_rgba(0,31,77,.5)] backdrop-blur-xl sm:px-6 sm:py-6',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -top-20 right-0 h-48 w-72 bg-[radial-gradient(circle,rgba(0,194,222,.13),transparent_68%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/3 canvas-grid opacity-60 md:block"
        aria-hidden
      />
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Kırıntı yolu" className="mb-2">
          <ol className="flex flex-wrap items-center gap-1 text-caption text-ink-500">
            {breadcrumbs.map((crumb, index) => {
              const last = index === breadcrumbs.length - 1;
              return (
                <li key={`${crumb.label}-${index}`} className="inline-flex items-center gap-1">
                  {crumb.to && !last ? (
                    <Link to={crumb.to} className="hover:text-brand-700">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className={cn(last && 'font-medium text-ink-700')}>{crumb.label}</span>
                  )}
                  {!last && <ChevronRight className="size-3.5 text-ink-400" aria-hidden />}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold tracking-[0.16em] text-brand-600 uppercase">
            <span className="h-1.5 w-6 rounded-full bg-tc-500" aria-hidden />
            Turkcell güvenlik operasyonu
          </div>
          <h1 className="text-[1.7rem] leading-tight font-bold tracking-[-0.035em] text-brand-950 sm:text-[1.9rem]">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-500 sm:text-body">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
