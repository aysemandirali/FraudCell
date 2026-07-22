import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import { Bell, CreditCard, Home, ShieldCheck, User } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

/**
 * Müşteri kabuğu — mobil öncelikli, alt navigasyonlu.
 *
 * Sahibi: A tarafı. Faz 0'da yalnızca gezinme iskeleti var; gradient başlık ve
 * bildirim rozeti A tarafında eklenecek.
 */

const NAV = [
  { to: '/customer', label: 'Ana Sayfa', icon: Home, exact: true },
  { to: '/customer/transactions', label: 'İşlemler', icon: CreditCard, exact: false },
  { to: '/customer/verifications', label: 'Doğrulama', icon: ShieldCheck, exact: false },
  { to: '/customer/notifications', label: 'Bildirim', icon: Bell, exact: false },
  { to: '/customer/profile', label: 'Profil', icon: User, exact: false },
] as const;

export function CustomerShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <main className="flex-1 pb-20">
        <Outlet />
      </main>

      <nav
        aria-label="Ana gezinme"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-surface shadow-nav safe-bottom"
      >
        <ul className="mx-auto flex max-w-lg">
          {NAV.map(({ to, label, icon: Icon, exact }) => {
            const active = exact ? pathname === to : pathname.startsWith(to);
            return (
              <li key={to} className="flex-1">
                <Link
                  to={to}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
                    active ? 'text-brand-700' : 'text-ink-400 hover:text-ink-500',
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
