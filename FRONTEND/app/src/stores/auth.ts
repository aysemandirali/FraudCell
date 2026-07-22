import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setAccessToken, setUnauthorizedHandler } from '@/api/client';
import { authApi } from '@/api/endpoints';
import type { CurrentUser, Role } from '@/domain/types';

interface AuthState {
  user: CurrentUser | null;
  /**
   * Access token. Üretimde yalnızca bellekte tutulur; burada demo sırasında
   * sayfa yenilenince oturumun düşmemesi için sessionStorage'a yazılır.
   * Refresh token her koşulda HttpOnly cookie'dedir ve JS'e açılmaz.
   */
  token: string | null;
  /** İlk açılışta oturum geri yükleniyor mu. */
  hydrating: boolean;

  signIn: (token: string, user: CurrentUser) => void;
  signOut: () => Promise<void>;
  setHydrated: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      hydrating: true,

      signIn: (token, user) => {
        setAccessToken(token);
        set({ token, user, hydrating: false });
      },

      signOut: async () => {
        try {
          await authApi.logout();
        } catch {
          // Sunucuya ulaşılamasa bile yerel oturumu her hâlükârda düşürürüz.
        }
        setAccessToken(null);
        set({ token: null, user: null });
      },

      setHydrated: () => set({ hydrating: false }),
    }),
    {
      name: 'fraudcell.auth',
      storage: {
        getItem: (name) => {
          const value = sessionStorage.getItem(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: (name, value) => sessionStorage.setItem(name, JSON.stringify(value)),
        removeItem: (name) => sessionStorage.removeItem(name),
      },
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => {
        // Depodan gelen token'ı API istemcisine geri bağla.
        if (state?.token) setAccessToken(state.token);
        state?.setHydrated();
      },
    },
  ),
);

/** 401 sonrası refresh de başarısız olursa oturumu düşür. */
setUnauthorizedHandler(() => {
  setAccessToken(null);
  useAuth.setState({ token: null, user: null });
});

/* ------------------------------------------------------------ Seçiciler -- */

export function useCurrentUser(): CurrentUser | null {
  return useAuth((state) => state.user);
}

export function useRole(): Role | null {
  return useAuth((state) => state.user?.role ?? null);
}

/** Personel rolleri konsol arayüzünü, müşteri mobil arayüzü görür. */
export function isStaffRole(role: Role | null | undefined): boolean {
  return role === 'ANALYST' || role === 'SUPERVISOR' || role === 'ADMIN';
}

/** Rolüne göre kullanıcının açılış sayfası. */
export function homePathFor(role: Role | null | undefined): string {
  switch (role) {
    case 'ANALYST':
      return '/konsol';
    case 'SUPERVISOR':
      return '/konsol/supervizor';
    case 'ADMIN':
      return '/konsol/yonetim';
    case 'MUSTERI':
      return '/';
    default:
      return '/giris';
  }
}
