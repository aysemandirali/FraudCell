import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { queryKeys } from '@/shared/api/query-keys';
import { recordLiveNotification, type LiveNotification } from './model';

function notification(id: string) {
  return {
    id,
    notificationType: 'ASSESSMENT_COMPLETED',
    title: `Notification ${id}`,
    message: 'Completed',
    resourceType: 'transaction',
    resourceId: id,
    occurredAt: '2026-07-22T20:00:00Z',
  };
}

describe('live notification cache', () => {
  it('deduplicates by event id and keeps only the newest 50 items', () => {
    const queryClient = new QueryClient();
    for (let index = 0; index < 51; index += 1) {
      recordLiveNotification(queryClient, notification(`event-${index}`));
    }
    recordLiveNotification(queryClient, { ...notification('event-50'), title: 'Duplicate' });

    const items = queryClient.getQueryData<LiveNotification[]>(queryKeys.notifications);
    expect(items).toHaveLength(50);
    expect(items?.[0]).toMatchObject({ id: 'event-50', title: 'Notification event-50', read: false });
    expect(items?.some((item) => item.id === 'event-0')).toBe(false);
  });
});
