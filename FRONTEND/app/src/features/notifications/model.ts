import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';

export interface LiveNotification {
  id: string;
  notificationType: string;
  title: string;
  message: string;
  resourceType: string | null;
  resourceId: string | null;
  occurredAt: string;
  read: boolean;
}

export function recordLiveNotification(
  queryClient: QueryClient,
  notification: Omit<LiveNotification, 'read'>,
): void {
  queryClient.setQueryData<LiveNotification[]>(queryKeys.notifications, (current = []) => {
    if (current.some((item) => item.id === notification.id)) return current;
    return [{ ...notification, read: false }, ...current].slice(0, 50);
  });
}

