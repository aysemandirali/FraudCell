import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

/**
 * Mock backend'i başlatır.
 *
 * `onUnhandledRequest: 'warn'`: karşılığı olmayan bir uç çağrıldığında konsola
 * uyarı düşer. Sessizce geçirmek, backend'i henüz yazılmamış bir ucu fark
 * etmeden "çalışıyor" sanmamıza yol açardı; hata fırlatmak ise statik dosya
 * isteklerini de kırardı.
 */
export async function startMockWorker(): Promise<void> {
  await worker.start({
    onUnhandledRequest(request, print) {
      // Vite'ın kendi kaynak/HMR istekleri gürültü yapmasın.
      const url = new URL(request.url);
      if (!url.pathname.startsWith('/api')) return;
      print.warning();
    },
    serviceWorker: { url: '/mockServiceWorker.js' },
    quiet: false,
  });

  console.info(
    '%c[FraudCell] Mock backend devrede.',
    'color:#0f6fd1;font-weight:600',
    '\nGerçek Gateway için: VITE_API_MODE=live',
  );
}
