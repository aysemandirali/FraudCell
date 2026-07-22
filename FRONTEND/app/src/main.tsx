import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';

import '@/app/styles/globals.css';
import { AppProviders } from '@/app/providers/AppProviders';
import { router } from '@/app/router';
import { bootstrapSession, installAuthBridge } from '@/features/authentication/session';
import { env } from '@/shared/config/env';

/**
 * Açılış sırası kritik:
 *
 *   1. MSW — mock modda, İLK istekten önce worker ayakta olmalı
 *   2. Auth köprüsü — HTTP client'ın token'a erişmesi için
 *   3. Oturum tazeleme — refresh cookie'sinden access token alınır
 *   4. Render
 *
 * (3) render'dan ÖNCE bekleniyor: yoksa router guard'ları henüz "anonim" olan
 * oturumu görüp kullanıcıyı giriş ekranına atar, refresh dönünce geri fırlatır.
 * Burada beklemek ilk boyamanın doğru ekranla yapılmasını garantiler.
 */
async function start(): Promise<void> {
  if (env.isMock) {
    const { startMockWorker } = await import('@/mocks/browser');
    await startMockWorker();
  }

  installAuthBridge();
  await bootstrapSession();

  const container = document.getElementById('root');
  if (!container) throw new Error('#root bulunamadı — index.html bozulmuş olabilir.');

  createRoot(container).render(
    <StrictMode>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </StrictMode>,
  );
}

void start();
