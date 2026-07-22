import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { ToastProvider } from '@/components/ui';
import { ApiError } from '@/api/client';
import './styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Yetki, doğrulama ve domain hatalarını yeniden denemek anlamsız.
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
        return failureCount < 2;
      },
    },
    mutations: { retry: false },
  },
});

async function bootstrap() {
  // Backend henüz ayakta değilken tarayıcı içi mock servis devreye girer.
  if (import.meta.env.VITE_API_MODE !== 'live') {
    const { startMockBackend } = await import('./mocks/browser');
    await startMockBackend();
  }

  const container = document.getElementById('root');
  if (!container) throw new Error('#root bulunamadı.');

  createRoot(container).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ToastProvider>
            <App />
          </ToastProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </StrictMode>,
  );
}

void bootstrap();
