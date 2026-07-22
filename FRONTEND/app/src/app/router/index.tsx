import { createRouter, ErrorComponent } from '@tanstack/react-router';
import { AlertCircle } from 'lucide-react';
import { EmptyState } from '@/shared/ui';
import { sessionStore } from '@/features/authentication/session';
import { routeTree } from './routes';

/**
 * Router örneği.
 *
 * `context.getSession` bir FONKSİYON: router context'i oluşturulduğu anda
 * dondurulur, oturum ise sonradan değişir. Değeri doğrudan koysaydık guard'lar
 * ilk render'daki (anonim) oturumu sonsuza dek görürdü.
 */
export const router = createRouter({
  routeTree,
  context: {
    getSession: () => sessionStore.getSnapshot(),
  },
  defaultPreload: 'intent',
  /** Preload edilen veri 10 sn taze sayılır; TanStack Query zaten kendi cache'ini tutuyor. */
  defaultPreloadStaleTime: 10_000,
  defaultNotFoundComponent: () => (
    <div className="flex min-h-dvh items-center justify-center bg-canvas">
      <EmptyState
        icon={<AlertCircle />}
        title="Sayfa bulunamadı"
        description="Aradığın sayfa taşınmış ya da hiç var olmamış olabilir."
      />
    </div>
  ),
  defaultErrorComponent: ErrorComponent,
});

/**
 * `Link`, `useSearch`, `useParams` gibi kancaların tip çıkarımı bu bildirime
 * dayanır. Olmadan tüm route tipleri `any`ye düşer.
 */
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
