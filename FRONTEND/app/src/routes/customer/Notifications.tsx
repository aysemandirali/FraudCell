import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  BellOff,
  CheckCheck,
  ClipboardCheck,
  Cpu,
  ShieldQuestion,
  Timer,
  Trophy,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { cn } from '@/lib/cn';
import { formatRelative } from '@/lib/format';
import { Button, Card, EmptyState, IconTile, SkeletonList } from '@/components/ui';
import { useMarkNotificationsRead, useNotifications } from '@/hooks/queries';
import type { AppNotification, NotificationKind } from '@/domain/types';

type Tone = 'brand' | 'aqua' | 'success' | 'warning' | 'danger' | 'neutral';

/** Bildirim türünden ikon ve renk — SSE ile gelen her tür burada karşılanır. */
const KIND_SPEC: Record<NotificationKind, { icon: ComponentType<{ className?: string }>; tone: Tone }> = {
  AI_ASSESSMENT_COMPLETED: { icon: Cpu, tone: 'brand' },
  CASE_ASSIGNED: { icon: ClipboardCheck, tone: 'aqua' },
  VERIFICATION_REQUESTED: { icon: ShieldQuestion, tone: 'warning' },
  POINTS_EARNED: { icon: Trophy, tone: 'success' },
  BADGE_EARNED: { icon: Award, tone: 'success' },
  SLA_CRITICAL: { icon: Timer, tone: 'danger' },
  CASE_CLOSED: { icon: ClipboardCheck, tone: 'neutral' },
};

/**
 * Bildirim merkezi. Liste HTTP'den gelir; canlı güncellemeler SSE üzerinden
 * gelen event'lerle sorgu geçersizleştirilerek yansır (doküman §29).
 */
export default function Notifications() {
  const navigate = useNavigate();
  const { data, isPending } = useNotifications();
  const markAllRead = useMarkNotificationsRead();

  const notifications = data ?? [];
  const unreadCount = notifications.filter((item) => !item.read).length;

  return (
    <div className="space-y-4 px-4 py-5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700"
        >
          <ArrowLeft className="size-4" />
          Geri
        </button>

        {unreadCount > 0 && (
          <Button
            size="sm"
            variant="ghost"
            loading={markAllRead.isPending}
            leadingIcon={<CheckCheck className="size-4" />}
            onClick={() => markAllRead.mutate()}
          >
            Tümünü okundu işaretle
          </Button>
        )}
      </div>

      <h1 className="text-xl font-semibold text-ink-900">
        Bildirimler
        {unreadCount > 0 && <span className="ml-2 text-sm text-ink-500">{unreadCount} yeni</span>}
      </h1>

      {isPending ? (
        <SkeletonList rows={4} />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<BellOff />}
          title="Bildirim yok"
          description="Şüpheli bir işlem tespit edildiğinde ya da vakan güncellendiğinde burada göreceksin."
        />
      ) : (
        <Card flush>
          <ul className="divide-y divide-ink-100">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <NotificationRow notification={notification} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function NotificationRow({ notification }: { notification: AppNotification }) {
  const spec = KIND_SPEC[notification.kind];
  const Icon = spec.icon;

  const content = (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3.5',
        !notification.read && 'bg-brand-50/60',
      )}
    >
      <IconTile tone={spec.tone} size="sm">
        <Icon />
      </IconTile>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-[15px] font-semibold text-ink-900">
          <span className="truncate">{notification.title}</span>
          {!notification.read && (
            <span className="size-2 shrink-0 rounded-full bg-brand-600" aria-label="Okunmadı" />
          )}
        </p>
        <p className="mt-0.5 text-sm text-ink-500">{notification.body}</p>
        <p className="mt-1 text-xs text-ink-400">{formatRelative(notification.createdAt)}</p>
      </div>
    </div>
  );

  return notification.link ? (
    <Link to={notification.link} className="block transition-colors hover:bg-ink-100/50">
      {content}
    </Link>
  ) : (
    content
  );
}
