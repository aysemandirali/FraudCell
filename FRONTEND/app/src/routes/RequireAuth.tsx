import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { homePathFor, useAuth } from '@/stores/auth';
import type { Role } from '@/domain/types';

/**
 * Rota koruması. Bu yalnızca arayüz kolaylığıdır — asıl yetkilendirme
 * Gateway (coarse-grained) ve servis (fine-grained, ownership) katmanlarındadır
 * (doküman §7). İstemciyi atlatan biri yine de veriye erişemez.
 */
export function RequireAuth({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const user = useAuth((state) => state.user);
  const location = useLocation();

  if (!user) {
    // Giriş sonrası kullanıcıyı geldiği sayfaya döndürebilmek için yolu taşı.
    return <Navigate to="/giris" replace state={{ from: location.pathname }} />;
  }

  if (!allow.includes(user.role)) {
    return <Navigate to={homePathFor(user.role)} replace />;
  }

  return <>{children}</>;
}
