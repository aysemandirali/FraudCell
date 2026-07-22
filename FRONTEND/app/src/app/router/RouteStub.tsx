import { Construction } from 'lucide-react';
import { EmptyState } from '@/shared/ui';

/**
 * Faz 0 yer tutucusu.
 *
 * Temel katman (sözleşme, client, router, tasarım sistemi) tek elden yazılıp
 * merge edildikten sonra ekranlar iki paralel branch'te doldurulur. Bu bileşen
 * hangi ekranın kimde olduğunu ekranda görünür kılar; boş beyaz sayfa yerine
 * sahibini söyler.
 *
 * Ekran yazıldığında bu bileşen o route'tan KALDIRILIR.
 */
export function RouteStub({
  screen,
  owner,
  endpoints = [],
}: {
  screen: string;
  /** Görev dağılımındaki taraf. */
  owner: 'A — Müşteri & Kimlik & Admin' | 'B — Operasyon Konsolu';
  /** Bu ekranın bağlanacağı uçlar; yazacak kişiye hatırlatma. */
  endpoints?: string[];
}) {
  return (
    <EmptyState
      icon={<Construction />}
      title={screen}
      description={`Bu ekran henüz yazılmadı. Sahibi: ${owner}`}
      action={
        endpoints.length > 0 && (
          <div className="rounded-card bg-ink-100 px-4 py-3 text-left">
            <p className="mb-1.5 text-xs font-semibold text-ink-500">Bağlanacağı uçlar</p>
            <ul className="space-y-1">
              {endpoints.map((endpoint) => (
                <li key={endpoint} className="font-mono text-xs text-ink-700">
                  {endpoint}
                </li>
              ))}
            </ul>
          </div>
        )
      }
    />
  );
}
