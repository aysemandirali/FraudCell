import { Link } from 'react-router-dom';
import { useSystemHealth } from '@/hooks/queries';

/**
 * Servis kapatma demosunun arayüz karşılığı (doküman §21).
 * Bir servis düştüğünde kullanıcıya *işin kaybolmadığını* açıkça söyler —
 * jüriye anlatılan resilience iddiasının görünür kanıtıdır.
 */
const MESSAGES: Record<string, string> = {
  ai: 'Risk değerlendirmesi şu anda yapılamıyor. İşlemlerin kaydediliyor ve servis döndüğünde otomatik değerlendirilecek.',
  gamification: 'Puan servisi kapalı. Kararların kaydediliyor, puanların servis dönünce işlenecek.',
  rabbitmq: 'Mesaj kuyruğu kapalı. Olaylar outbox’ta bekliyor, veri kaybı yok.',
  identity: 'Kimlik servisi kapalı. Yeni giriş yapılamıyor; mevcut oturumun çalışmaya devam ediyor.',
  transaction: 'İşlem servisi kapalı. Yeni işlem oluşturulamıyor.',
};

export function DegradedBanner() {
  const { data: health } = useSystemHealth();
  const down = health?.filter((service) => service.status !== 'UP') ?? [];

  if (down.length === 0) return null;

  return (
    <div role="status" className="border-b border-warning-500/30 bg-warning-100">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 lg:px-8">
        <span className="flex items-center gap-2 text-sm font-semibold text-warning-700">
          <span className="relative flex size-2" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-warning-500 opacity-70" />
            <span className="relative inline-flex size-2 rounded-full bg-warning-500" />
          </span>
          Sınırlı mod
        </span>

        <span className="text-sm text-warning-700">
          {down.map((service) => MESSAGES[service.name] ?? `${service.displayName} kapalı.`).join(' ')}
        </span>

        <Link
          to="/demo"
          className="ml-auto text-sm font-semibold text-warning-700 underline underline-offset-2"
        >
          Servis durumu
        </Link>
      </div>
    </div>
  );
}
