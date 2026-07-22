import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';
import { seed } from './db';

export const worker = setupWorker(...handlers);

/**
 * Mock backend'i başlatır. Yalnızca VITE_API_MODE=mock iken çağrılır.
 *
 * Backend ayağa kalktığında `.env` içinde VITE_API_MODE=live yapmak yeterli;
 * uygulama kodunda hiçbir değişiklik gerekmez — istekler aynı yollara,
 * bu kez Edge Gateway'e gider.
 */
export async function startMockBackend(): Promise<void> {
  seed();
  await worker.start({
    // Uygulamanın kendi varlıkları (js, css, ikon) uyarı üretmesin.
    onUnhandledRequest: 'bypass',
    quiet: true,
    serviceWorker: { url: '/mockServiceWorker.js' },
  });
}
