import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/stores/auth';
import { queryKeys } from '@/hooks/queryKeys';

const IS_MOCK = import.meta.env.VITE_API_MODE !== 'live';
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

export interface RealtimeEvent {
  type: string;
  payload: unknown;
}

/**
 * SSE bildirim kanalı (doküman §16).
 *
 * Gateway'deki NotificationRelay, RabbitMQ'dan gelen user.notification.requested
 * olaylarını tarayıcıya iletir. Mock modda aynı olaylar bellek içi yayıncıdan gelir,
 * böylece arayüz davranışı iki modda da özdeş olur.
 */
export function useRealtime(onEvent?: (event: RealtimeEvent) => void): void {
  const queryClient = useQueryClient();
  const token = useAuth((state) => state.token);

  useEffect(() => {
    if (!token) return;

    function handle(event: RealtimeEvent) {
      // Olay tipine göre yalnızca ilgili sorguları tazele — tam refetch yapma.
      switch (event.type) {
        case 'notification':
          void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
          break;
        case 'transaction.created':
        case 'transaction.updated':
          void queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
          break;
        case 'case.created':
        case 'case.updated':
          void queryClient.invalidateQueries({ queryKey: queryKeys.cases });
          void queryClient.invalidateQueries({ queryKey: queryKeys.gamification });
          break;
      }
      onEvent?.(event);
    }

    if (IS_MOCK) {
      // Mock modda EventSource yerine bellek içi yayıncıya bağlanırız.
      let unsubscribe: (() => void) | undefined;
      let cancelled = false;

      void import('@/mocks/db').then((module) => {
        if (cancelled) return;
        unsubscribe = module.subscribe(handle);
      });

      return () => {
        cancelled = true;
        unsubscribe?.();
      };
    }

    const source = new EventSource(`${BASE_URL}/notifications/stream`, {
      withCredentials: true,
    });

    source.onmessage = (message) => {
      try {
        handle(JSON.parse(message.data) as RealtimeEvent);
      } catch {
        // Bozuk mesaj akışı kesmemeli.
      }
    };

    // Bağlantı koptuğunda EventSource kendiliğinden yeniden dener.
    source.onerror = () => {};

    return () => source.close();
  }, [token, queryClient, onEvent]);
}
