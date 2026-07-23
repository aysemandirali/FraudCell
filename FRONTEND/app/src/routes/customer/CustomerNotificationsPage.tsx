import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { CheckCheck, ChevronRight } from 'lucide-react';
import type { LiveNotification } from '@/features/notifications/model';
import { queryKeys } from '@/shared/api/query-keys';
import { formatRelative } from '@/shared/lib/format';
import { Button, EmptyState } from '@/shared/ui';

export function CustomerNotificationsPage() {
  const queryClient = useQueryClient();
  const notifications = useQuery<LiveNotification[]>({
    queryKey: queryKeys.notifications,
    queryFn: async () => [],
    initialData: [],
    staleTime: Number.POSITIVE_INFINITY,
  });

  const update = (map: (item: LiveNotification) => LiveNotification) => {
    queryClient.setQueryData<LiveNotification[]>(queryKeys.notifications, (current = []) =>
      current.map(map),
    );
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-6 lg:max-w-5xl lg:px-6 lg:py-8 xl:px-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 text-ink-900">Bildirimler</h1>
          <p className="mt-1 text-body text-ink-500">Bu oturumdaki güvenlik güncellemeleri.</p>
        </div>
        {notifications.data.length > 0 ? (
          <Button
            size="sm"
            variant="ghost"
            aria-label="Tümünü okundu işaretle"
            leadingIcon={<CheckCheck className="size-4" />}
            onClick={() => update((item) => ({ ...item, read: true }))}
          >
            Okundu
          </Button>
        ) : null}
      </header>

      {notifications.data.length === 0 ? (
        <EmptyState
          illustration="inbox"
          title="Yeni bildirim yok"
          description="İşlemlerinle ilgili güncellemeler burada canlı olarak görünecek."
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {notifications.data.map((item) => {
            const content = (
              <article
                className={`surface-card flex items-start gap-3 p-4 ${item.read ? '' : 'border-brand-200 bg-brand-100/30'}`}
              >
                <span
                  className={`mt-1 size-2 shrink-0 rounded-full ${item.read ? 'bg-ink-200' : 'bg-brand-600'}`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink-900">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-600">{item.message}</p>
                  <p className="mt-2 text-xs text-ink-400">{formatRelative(item.occurredAt)}</p>
                </div>
                {item.resourceType === 'TRANSACTION' && item.resourceId ? (
                  <ChevronRight className="mt-1 size-5 shrink-0 text-ink-400" aria-hidden />
                ) : null}
              </article>
            );

            return item.resourceType === 'TRANSACTION' && item.resourceId ? (
              <Link
                key={item.id}
                to="/customer/transactions/$transactionId"
                params={{ transactionId: item.resourceId }}
                onClick={() =>
                  update((entry) => (entry.id === item.id ? { ...entry, read: true } : entry))
                }
              >
                {content}
              </Link>
            ) : (
              <div key={item.id}>{content}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
