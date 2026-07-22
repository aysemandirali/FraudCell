import { Outlet } from 'react-router-dom';
import { Home, ReceiptText, ShieldCheck, User, Send } from 'lucide-react';
import { BottomNav, type NavItem } from '@/components/layout/BottomNav';
import { DegradedBanner } from '@/components/system/DegradedBanner';
import { useRealtime } from '@/hooks/useRealtime';
import { useCases } from '@/hooks/queries';

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Ana Sayfa', icon: Home },
  { to: '/islemlerim', label: 'İşlemlerim', icon: ReceiptText },
  { to: '/guvenlik', label: 'Güvenlik', icon: ShieldCheck },
  { to: '/profil', label: 'Profil', icon: User },
];

/**
 * Müşteri arayüzünün kabuğu — Paycell mobil kalıbı.
 * `chrome=false` tam ekran akışlarda (işlem oluşturma, detay) alt çubuğu kaldırır.
 */
export function MobileShell({ chrome = true }: { chrome?: boolean }) {
  // SSE kanalı kabukta bir kez açılır; tüm alt sayfalar tazelenmeden faydalanır.
  useRealtime();

  // Müşteriden yanıt bekleyen doğrulama varsa Güvenlik sekmesinde rozet göster.
  const { data: cases } = useCases({ status: 'MUSTERI_DOGRULAMA' });
  const pendingCount = cases?.totalItems ?? 0;

  const items = NAV_ITEMS.map((item) =>
    item.to === '/guvenlik' && pendingCount > 0 ? { ...item, badge: pendingCount } : item,
  );

  return (
    <div className="min-h-dvh bg-canvas">
      <DegradedBanner />

      <main className={chrome ? 'pb-24' : 'pb-8'}>
        <Outlet />
      </main>

      {chrome && (
        <BottomNav items={items} fab={{ to: '/yeni-islem', label: 'Para Gönder', icon: Send }} />
      )}
    </div>
  );
}
