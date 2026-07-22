import { useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@/shared/ui';
import { createQueryClient } from './queryClient';

/**
 * Uygulama genelindeki sağlayıcılar.
 *
 * Sıra önemli: `ToastProvider` en içte olmalı ki `useRealtime` gibi query
 * client'a bağlı olan kodlar toast'a da erişebilsin.
 *
 * QueryClient `useState` başlatıcısı içinde kuruluyor — modül seviyesinde
 * oluşturulsaydı testlerde iki test aynı cache'i paylaşırdı.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
