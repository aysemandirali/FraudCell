import { useEffect, useState, type ComponentType } from 'react';
import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import * as Dialog from '@radix-ui/react-dialog';
import {
  BarChart3,
  Bell,
  ClipboardList,
  FolderKanban,
  Gavel,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  ScrollText,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { fullName } from '@/shared/lib/format';
import { ROLE_LABEL, type Role } from '@/shared/api/enums';
import { LogoWordmark } from '@/shared/ui/Logo';
import { Avatar, StatusDot } from '@/shared/ui';
import { logout } from '@/features/authentication/session';
import { useSession } from '@/features/authentication/useSession';

/**
 * Operasyon konsolu kabuğu — masaüstü öncelikli, koyu kenar çubuklu "kokpit".
 *
 * Menü rolüne göre filtrelenir; bu bir GÜVENLİK KONTROLÜ DEĞİLDİR
 * (DESIGN.MD kural 3), yalnızca ilgisiz bağlantıları gizler. Gerçek yetki
 * kontrolü route guard'larında ve backend'dedir.
 *
 * Kenar çubuğu koyu (gradient-console), çalışma alanı açık: grafikler ve risk
 * renkleri açık zeminde net okunur, kenar çubuğu ise operasyon merkezi hissini
 * verir.
 */

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  roles: readonly Role[];
  /** Kök öğe alt sayfalarda aktif SAYILMAZ (yalnızca tam eşleşme). */
  root?: boolean;
}

interface NavGroup {
  heading: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    heading: 'Analiz',
    items: [
      { to: '/analyst', label: 'Vakalarım', icon: FolderKanban, roles: ['ANALYST'], root: true },
      { to: '/analyst/points', label: 'Puanlarım', icon: Trophy, roles: ['ANALYST'] },
    ],
  },
  {
    heading: 'Operasyon',
    items: [
      { to: '/supervisor', label: 'Panel', icon: LayoutDashboard, roles: ['SUPERVISOR', 'ADMIN'], root: true },
      { to: '/supervisor/cases', label: 'Tüm Vakalar', icon: ClipboardList, roles: ['SUPERVISOR', 'ADMIN'] },
      { to: '/supervisor/queue', label: 'Atama Kuyruğu', icon: ListChecks, roles: ['SUPERVISOR', 'ADMIN'] },
      { to: '/supervisor/leaderboard', label: 'Liderlik', icon: BarChart3, roles: ['SUPERVISOR', 'ADMIN'] },
    ],
  },
  {
    heading: 'Yönetim',
    items: [
      { to: '/admin', label: 'Personel', icon: Users, roles: ['ADMIN'], root: true },
      { to: '/admin/audit', label: 'Denetim', icon: ScrollText, roles: ['ADMIN'] },
    ],
  },
];

/** Kök öğe yalnızca tam eşleşmede aktif; diğerleri alt yollarda da aktif. */
function isActive(pathname: string, item: NavItem): boolean {
  if (item.root) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

function NavLinks({
  groups,
  pathname,
  onNavigate,
}: {
  groups: NavGroup[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav
      aria-label="Konsol gezinme"
      className="flex-1 space-y-6 overflow-y-auto px-3 py-4 scroll-slim"
    >
      {groups.map((group) => (
        <div key={group.heading}>
          <p className="px-3 pb-1.5 text-micro font-semibold tracking-wide text-console-muted/80 uppercase">
            {group.heading}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item);
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group relative flex items-center gap-3 rounded-tile px-3 py-2.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-white/10 text-white'
                        : 'text-console-muted hover:bg-white/5 hover:text-console-text',
                    )}
                  >
                    {active && (
                      <span
                        className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-tc-500"
                        aria-hidden
                      />
                    )}
                    <Icon
                      className={cn(
                        'size-5 shrink-0 transition-colors',
                        active ? 'text-white' : 'text-console-muted group-hover:text-console-text',
                      )}
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SidebarInner({
  groups,
  pathname,
  name,
  role,
  onNavigate,
  onLogout,
}: {
  groups: NavGroup[];
  pathname: string;
  name: string;
  role: Role;
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="on-console flex h-full flex-col gradient-console text-console-text">
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-console-border px-5">
        <LogoWordmark tone="white" />
      </div>

      <NavLinks groups={groups} pathname={pathname} onNavigate={onNavigate} />

      <div className="shrink-0 border-t border-console-border p-3">
        <div className="flex items-center gap-3 rounded-tile bg-white/5 px-3 py-2.5">
          <Avatar name={name} size="sm" onDark />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-console-text">{name}</p>
            <p className="text-micro text-console-muted">{ROLE_LABEL[role]}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Çıkış yap"
            className="rounded-full p-2 text-console-muted transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConsoleShell() {
  const { user } = useSession();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!user) void navigate({ to: '/auth', replace: true });
  }, [navigate, user]);

  // Yol değişince mobil çekmeceyi kapat.
  useEffect(() => setDrawerOpen(false), [pathname]);

  if (!user) return null;

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(user.role)),
  })).filter((group) => group.items.length > 0);

  const handleLogout = () => {
    void logout().then(() => navigate({ to: '/auth', replace: true }));
  };

  const name = fullName(user.firstName, user.lastName) || 'Kullanıcı';

  // Aktif üst başlık — bağlam çubuğunda gösterilir.
  const activeLabel =
    groups.flatMap((g) => g.items).find((item) => isActive(pathname, item))?.label ?? 'Konsol';

  return (
    <div className="flex min-h-dvh bg-canvas">
      {/* Masaüstü sabit kenar çubuğu */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <SidebarInner
          groups={groups}
          pathname={pathname}
          name={name}
          role={user.role}
          onLogout={handleLogout}
        />
      </aside>

      {/* Mobil çekmece */}
      <Dialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 animate-fade-in bg-ink-900/50 lg:hidden" />
          <Dialog.Content
            className="fixed inset-y-0 left-0 z-50 w-72 animate-slide-up outline-none lg:hidden"
            aria-describedby={undefined}
          >
            <Dialog.Title className="sr-only">Gezinme menüsü</Dialog.Title>
            <div className="relative h-full">
              <Dialog.Close
                className="absolute top-4 right-3 z-10 rounded-full p-2 text-console-muted hover:bg-white/10 hover:text-white"
                aria-label="Menüyü kapat"
              >
                <X className="size-5" />
              </Dialog.Close>
              <SidebarInner
                groups={groups}
                pathname={pathname}
                name={name}
                role={user.role}
                onNavigate={() => setDrawerOpen(false)}
                onLogout={handleLogout}
              />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        {/* Bağlam çubuğu */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-ink-100 bg-surface/85 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Menüyü aç"
            className="rounded-full p-2 text-ink-500 transition-colors hover:bg-ink-100 lg:hidden"
          >
            <Menu className="size-5" />
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Gavel className="hidden size-5 text-brand-700 sm:block" aria-hidden />
            <span className="truncate text-h3 text-ink-900">{activeLabel}</span>
          </div>

          <StatusDot tone="live" label="Canlı" className="hidden sm:inline-flex" />

          <button
            type="button"
            aria-label="Bildirimler"
            className="relative rounded-full p-2 text-ink-500 transition-colors hover:bg-ink-100"
          >
            <Bell className="size-5" />
          </button>

          <Dropdown.Root>
            <Dropdown.Trigger asChild>
              <button
                type="button"
                className="rounded-full outline-none focus-visible:focus-ring"
                aria-label="Kullanıcı menüsü"
              >
                <Avatar name={name} size="sm" />
              </button>
            </Dropdown.Trigger>
            <Dropdown.Portal>
              <Dropdown.Content
                align="end"
                sideOffset={8}
                className="z-50 min-w-52 animate-scale-in rounded-card bg-surface p-1.5 shadow-overlay"
              >
                <div className="px-3 py-2">
                  <p className="text-sm font-semibold text-ink-900">{name}</p>
                  <p className="text-caption text-ink-500">{ROLE_LABEL[user.role]}</p>
                </div>
                <Dropdown.Separator className="my-1 h-px bg-ink-100" />
                <Dropdown.Item
                  onSelect={handleLogout}
                  className="flex cursor-pointer items-center gap-2 rounded-tile px-3 py-2 text-sm text-danger-700 outline-none data-highlighted:bg-danger-100"
                >
                  <LogOut className="size-4" />
                  Çıkış yap
                </Dropdown.Item>
              </Dropdown.Content>
            </Dropdown.Portal>
          </Dropdown.Root>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
