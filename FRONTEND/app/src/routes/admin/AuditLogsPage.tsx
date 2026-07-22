import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { ChevronDown, ChevronRight, ChevronUp, ScrollText, Search } from 'lucide-react';
import { listAuditLogs } from '@/features/staff/api';
import { queryKeys } from '@/shared/api/query-keys';
import { formatDateTime } from '@/shared/lib/format';
import { Button, EmptyState, ErrorState, Field, SkeletonList, ToneBadge } from '@/shared/ui';

export function AuditLogsPage({ action, cursor }: { action?: string; cursor?: string }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState(action ?? '');
  const [expanded, setExpanded] = useState<string | null>(null);
  const logs = useQuery({
    queryKey: queryKeys.auditLogs({ action, cursor }),
    queryFn: () => listAuditLogs({ action, cursor }),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = search.trim() || undefined;
    void navigate({ to: '/admin/audit', search: { action: next } });
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Denetim kayıtları</h1>
          <p className="mt-1 text-sm text-ink-500">Kimlik ve yönetim işlemlerinin değiştirilemez izi.</p>
        </div>
        <form onSubmit={submit} className="flex w-full gap-2 sm:w-auto">
          <Field label="Aksiyon kodu" value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-56" />
          <Button type="submit" aria-label="Ara" leadingIcon={<Search className="size-4" />}>Ara</Button>
        </form>
      </header>

      <section className="mt-6">
        {logs.isPending ? <SkeletonList rows={7} /> : null}
        {logs.isError ? <ErrorState error={logs.error} onRetry={() => void logs.refetch()} /> : null}
        {logs.data?.items.length === 0 ? <EmptyState icon={<ScrollText />} title="Denetim kaydı bulunamadı" /> : null}
        <div className="space-y-2">
          {logs.data?.items.map((entry) => {
            const isExpanded = expanded === entry.id;
            return (
              <article key={entry.id} className="border-b border-ink-100 bg-surface px-4 py-3">
                <button type="button" onClick={() => setExpanded(isExpanded ? null : entry.id)} className="grid w-full grid-cols-[1fr_auto] items-start gap-4 text-left sm:grid-cols-[minmax(12rem,1fr)_minmax(9rem,0.6fr)_minmax(8rem,0.5fr)_auto]">
                  <div className="min-w-0"><p className="truncate font-semibold text-ink-900">{entry.action}</p><p className="mt-1 text-xs text-ink-400">{formatDateTime(entry.occurredAt)}</p></div>
                  <div className="hidden min-w-0 sm:block"><p className="truncate text-sm text-ink-700">{entry.actorRole ?? 'Sistem'}</p><p className="mt-1 truncate text-xs text-ink-400">{entry.actorId ?? entry.sourceService}</p></div>
                  <div className="hidden sm:block"><ToneBadge toneClass={entry.result === 'SUCCESS' ? 'bg-success-100 text-success-700' : 'bg-danger-100 text-danger-700'}>{entry.result === 'SUCCESS' ? 'Başarılı' : 'Başarısız'}</ToneBadge></div>
                  <span className="flex items-center gap-2"><span className="sm:hidden"><ToneBadge toneClass={entry.result === 'SUCCESS' ? 'bg-success-100 text-success-700' : 'bg-danger-100 text-danger-700'}>{entry.result === 'SUCCESS' ? 'Başarılı' : 'Başarısız'}</ToneBadge></span>{isExpanded ? <ChevronUp className="size-4 text-ink-400" /> : <ChevronDown className="size-4 text-ink-400" />}</span>
                </button>
                {isExpanded ? (
                  <div className="mt-3 border-t border-ink-100 pt-3">
                    <dl className="grid gap-2 text-sm sm:grid-cols-3">
                      <div><dt className="text-xs text-ink-400">Kaynak</dt><dd className="mt-1 text-ink-700">{entry.sourceService}</dd></div>
                      <div><dt className="text-xs text-ink-400">Kaynak nesne</dt><dd className="mt-1 break-words text-ink-700">{entry.resourceType ?? '—'} / {entry.resourceId ?? '—'}</dd></div>
                      <div><dt className="text-xs text-ink-400">IP</dt><dd className="mt-1 text-ink-700">{entry.ipAddress ?? '—'}</dd></div>
                    </dl>
                    {entry.detailsJson ? <pre className="mt-3 max-h-48 overflow-auto rounded-md bg-ink-900 p-3 text-xs whitespace-pre-wrap text-white">{entry.detailsJson}</pre> : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
        {logs.data?.page.hasMore && logs.data.page.nextCursor ? (
          <div className="mt-6 flex justify-center">
            <Button
              variant="secondary"
              trailingIcon={<ChevronRight className="size-4" />}
              onClick={() => void navigate({
                to: '/admin/audit',
                search: { action, cursor: logs.data?.page.nextCursor ?? undefined },
              })}
            >
              Daha fazla göster
            </Button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
