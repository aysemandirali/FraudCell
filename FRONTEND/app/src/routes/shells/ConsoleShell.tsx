import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Bell,
  ClipboardList,
  LogOut,
  Menu,
  Settings2,
  ShieldAlert,
  Trophy,
  UserCog,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';
import { LogoWordmark } from '@/components/brand/Logo';
import { DegradedBanner } from '@/components/system/DegradedBanner';
import { NotificationBell } from '@/components/system/NotificationBell';
import { useRealtime } from '@/hooks/useRealtime';
import { useAuth } from '@/stores/auth';
import { ROLE_LABEL } from '@/domain/types';
import type { Role } from '@/domain/types';

interface ConsoleLink {
  to: string;
  label: string;
  icon: typeof ClipboardList;
  roles: Role[];
  end?: boolean;
}

const LINKS: ConsoleLink[] = [
  { to: '/konsol', label: 'Vaka Kuyruğu', icon: ClipboardList, roles: ['ANALYST', 'SUPERVISOR', 'ADMIN'], end: true },
  { to: '/konsol/puanlarim', label: 'Puanlarım', icon: Trophy, roles: ['ANALYST', 'SUPERVISOR'] },
  { to: '/konsol/liderlik', label: 'Liderlik', icon: Trophy, roles: ['ANALYST', 'SUPERVISOR', 'ADMIN'] },
  { to: '/konsol/supervizor', label: 'Süpervizör', icon: ShieldAlert, roles: ['SUPERVISOR', 'ADMIN'] },
  { to: '/konsol/yonetim', label: 'Yönetim', icon: UserCog, roles: ['ADMIN', 'SUPERVISOR'] },
];

/** Personel konsolu: masaüstünde sabit kenar çubuğu, mobilde açılır menü. */
export function ConsoleShell() {
  useRealtime();

  const user = useAuth((state) => state.user);
  const signOut = useAuth((state) => state.signOut);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = LINKS.filter((link) => user && link.roles.includes(user.role));

  async function handleSignOut() {
    await signOut();
    navigate('/giris', { replace: true });
  }

  return (
    <div className="min-h-dvh bg-canvas lg:flex">
      {/* Mobil menü örtüsü */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink-900/40 lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-ink-200 bg-white',
          'transition-transform duration-200 lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0',
          menuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-ink-100 px-5">
          <LogoWordmark />
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Menüyü kapat"
            className="rounded-full p-1.5 text-ink-500 hover:bg-ink-100 lg:hidden"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-tile px-3 py-2.5 text-sm font-medium',
                    'transition-colors duration-150',
                    isActive
                      ? 'bg-brand-100 text-brand-800'
                      : 'text-ink-700 hover:bg-ink-100 hover:text-ink-900',
                  )
                }
              >
                <Icon className="size-5" />
                {link.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-ink-100 p-3">
          <NavLink
            to="/demo"
            className="mb-2 flex items-center gap-3 rounded-tile px-3 py-2.5 text-sm font-medium text-ink-500 transition-colors hover:bg-ink-100"
          >
            <Settings2 className="size-5" />
            Demo Kontrolü
          </NavLink>

          <div className="flex items-center gap-3 rounded-tile bg-canvas px-3 py-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-800 text-sm font-semibold text-white">
              {initials(user?.fullName ?? '')}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink-900">{user?.fullName}</p>
              <p className="text-xs text-ink-500">{user ? ROLE_LABEL[user.role] : ''}</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Çıkış yap"
              className="rounded-full p-1.5 text-ink-400 transition-colors hover:bg-danger-100 hover:text-danger-500"
            >
              <LogOut className="size-4.5" />
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink-100 bg-white px-4 lg:px-8">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Menüyü aç"
            className="rounded-full p-2 text-ink-700 hover:bg-ink-100 lg:hidden"
          >
            <Menu className="size-5" />
          </button>

          <div className="flex-1" />

          <NotificationBell icon={Bell} />
        </header>

        <DegradedBanner />

        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
