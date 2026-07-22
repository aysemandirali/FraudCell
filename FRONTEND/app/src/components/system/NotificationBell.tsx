import { useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellOff, Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatRelative } from '@/lib/format';
import { Sheet, EmptyState, IconTile } from '@/components/ui';
import { useMarkNotificationsRead, useNotifications } from '@/hooks/queries';
import type { NotificationKind } from '@/domain/types';

const KIND_TONE: Record<NotificationKind, 'brand' | 'success' | 'warning' | 'danger' | 'aqua'> = {
  AI_ASSESSMENT_COMPLETED: 'brand',
  CASE_ASSIGNED: 'aqua',
  VERIFICATION_REQUESTED: 'warning',
  POINTS_EARNED: 'success',
  BADGE_EARNED: 'success',
  SLA_CRITICAL: 'danger',
  CASE_CLOSED: 'brand',
};

const KIND_GLYPH: Record<NotificationKind, string> = {
  AI_ASSESSMENT_COMPLETED: '🤖',
  CASE_ASSIGNED: '📋',
  VERIFICATION_REQUESTED: '❓',
  POINTS_EARNED: '⭐',
  BADGE_EARNED: '🏅',
  SLA_CRITICAL: '⏱',
  CASE_CLOSED: '✅',
};

/** Zil ikonu + okunmamış sayacı + açılır bildirim listesi. SSE ile canlı beslenir. */
export function NotificationBell({ icon: Icon }: { icon: ComponentType<{ className?: string }> }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: notifications = [] } = useNotifications();
  const markAllRead = useMarkNotificationsRead();

  const unread = notifications.filter((notification) => !notification.read).length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={unread > 0 ? `Bildirimler, ${unread} okunmamış` : 'Bildirimler'}
        className="relative rounded-full p-2 text-ink-700 transition-colors hover:bg-ink-100"
      >
        <Icon className="size-5.5" />
        {unread > 0 && (
          <span
            className={cn(
              'absolute top-1 right-1 min-w-4 rounded-full bg-danger-500 px-1',
              'text-center text-[10px] leading-4 font-bold text-white tabular',
            )}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Bildirimler"
        description={unread > 0 ? `${unread} okunmamış bildirim` : 'Tümü okundu'}
        footer={
          notifications.length > 0 ? (
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              className="flex w-full items-center justify-center gap-2 text-sm font-semibold text-brand-700"
            >
              <Check className="size-4" />
              Tümünü okundu işaretle
            </button>
          ) : undefined
        }
      >
        {notifications.length === 0 ? (
          <EmptyState
            icon={<BellOff />}
            title="Henüz bildirim yok"
            description="Vaka atamaları, risk sonuçları ve puan kazanımların burada görünecek."
          />
        ) : (
          <ul className="-mx-2 space-y-1">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    if (notification.link) navigate(notification.link);
                  }}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-tile px-2 py-3 text-left',
                    'transition-colors hover:bg-canvas',
                    !notification.read && 'bg-brand-50',
                  )}
                >
                  <IconTile tone={KIND_TONE[notification.kind]} size="sm">
                    <span className="text-sm">{KIND_GLYPH[notification.kind]}</span>
                  </IconTile>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink-900">
                      {notification.title}
                    </span>
                    <span className="mt-0.5 block text-sm text-ink-500">{notification.body}</span>
                    <span className="mt-1 block text-xs text-ink-400">
                      {formatRelative(notification.createdAt)}
                    </span>
                  </span>
                  {!notification.read && (
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-600" aria-hidden />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </>
  );
}
