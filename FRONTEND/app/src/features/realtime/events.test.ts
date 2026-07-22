import { describe, expect, it, vi } from 'vitest';
import { parseRealtimeEvent } from './events';

describe('realtime event parser', () => {
  it('accepts a notification with its single-use event id', () => {
    const event = parseRealtimeEvent(JSON.stringify({
      id: 'event-1',
      type: 'notification.received',
      data: {
        notificationType: 'ASSESSMENT_COMPLETED',
        title: 'Assessment completed',
        message: 'Review the transaction',
        resourceType: 'transaction',
        resourceId: 'tx-1',
        occurredAt: '2026-07-22T20:00:00Z',
      },
    }));

    expect(event).toMatchObject({ id: 'event-1', type: 'notification.received' });
  });

  it('rejects malformed notifications without throwing', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(parseRealtimeEvent('{"type":"notification.received","data":{}}')).toBeNull();
    expect(warning).toHaveBeenCalledOnce();
    warning.mockRestore();
  });
});
