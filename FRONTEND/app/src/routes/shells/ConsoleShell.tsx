import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import { LogOut } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { fullName } from '@/shared/lib/format';
import { ROLE_LABEL } from '@/shared/api/enums';
import { LogoWordmark } from '@/shared/ui/Logo';
import { logout } from '@/features/authentication/session';
import { useCurrentUser } from '@/features/authentication/useSession';

/**
 * Operasyon konsolu kabuğu — masaüstü öncelikli, üst navigasyonlu.
 *
 * Sahibi: B tarafı. Menü rolüne göre filtrelenir; bu bir GÜVENLİK KONTROLÜ
 * DEĞİLDİR (DESIGN.MD kural 3), yalnızca ilgisiz bağlantıları gizler.
 */

interface NavItem {
  to: string;
  label: string;
  roles: readonly string[];
}

const NAV: NavItem[] = [
  { to: '/analyst', label: 'Vakalarım', roles: ['ANALYST'] },
  { to: '/analyst/points', label: 'Puanlarım', roles: ['ANALYST'] },
  { to: '/supervisor', label: 'Panel', roles: ['SUPERVISOR', 'ADMIN'] },
  { to: '/supervisor/cases', label: 'Tüm Vakalar', roles: ['SUPERVISOR', 'ADMIN'] },
  { to: '/supervisor/queue', label: 'Atama Kuyruğu', roles: ['SUPERVISOR', 'ADMIN'] },
  { to: '/supervisor/leaderboard', label: 'Liderlik', roles: ['SUPERVISOR', 'ADMIN'] },
  { to: '/admin', label: 'Personel', roles: ['ADMIN'] },
  { to: '/admin/audit', label: 'Denetim', roles: ['ADMIN'] },
];

export function ConsoleShell() {
  const user = useCurrentUser();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items = NAV.filter((item) => item.roles.includes(user.role));

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="sticky top-0 z-40 border-b border-ink-100 bg-surface">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4">
          <LogoWordmark className="shrink-0" />

          <nav aria-label="Konsol gezinme" className="flex-1 overflow-x-auto">
            <ul className="flex gap-1">
              {items.map((item) => {
                // En uzun eşleşen yol aktif sayılır; aksi hâlde "/analyst"
                // alt sayfalardayken de aktif görünürdü.
                const active =
                  pathname === item.to ||
                  (item.to !== '/analyst' &&
                    item.to !== '/supervisor' &&
                    item.to !== '/admin' &&
                    pathname.startsWith(item.to));

                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'inline-block rounded-pill px-3.5 py-2 text-sm font-semibold whitespace-nowrap',
                        'transition-colors',
                        active
                          ? 'bg-brand-100 text-brand-800'
                          : 'text-ink-500 hover:bg-ink-100 hover:text-ink-700',
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-ink-900">
                {fullName(user.firstName, user.lastName) || 'Kullanıcı'}
              </p>
              <p className="text-xs text-ink-500">{ROLE_LABEL[user.role]}</p>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              aria-label="Çıkış yap"
              className="rounded-full p-2 text-ink-400 transition-colors hover:bg-danger-100 hover:text-danger-500"
            >
              <LogOut className="size-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
