import { useMemo, useState } from 'react';
import { ReceiptText, Search } from 'lucide-react';
import { LargeTitleBar } from '@/components/layout/AppBar';
import { Card, ChipGroup, EmptyState, SkeletonList } from '@/components/ui';
import { TransactionRow } from '@/components/domain/TransactionRow';
import { useTransactions } from '@/hooks/queries';
import { formatCurrency } from '@/lib/format';

type Filter = 'ALL' | 'PENDING' | 'REVIEW' | 'BLOCKED';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'Tümü' },
  { value: 'PENDING', label: 'Değerlendiriliyor' },
  { value: 'REVIEW', label: 'İncelemede' },
  { value: 'BLOCKED', label: 'Bloklu' },
];

export default function Transactions() {
  const [filter, setFilter] = useState<Filter>('ALL');
  const [search, setSearch] = useState('');
  const { data, isLoading } = useTransactions({ pageSize: 50 });

  const items = data?.items ?? [];

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('tr-TR');

    return items.filter((transaction) => {
      if (query) {
        const haystack =
          `${transaction.recipient} ${transaction.transactionNo}`.toLocaleLowerCase('tr-TR');
        if (!haystack.includes(query)) return false;
      }

      switch (filter) {
        case 'PENDING':
          return transaction.assessmentStatus !== 'COMPLETED';
        case 'REVIEW':
          return transaction.decision === 'INCELEME';
        case 'BLOCKED':
          return transaction.temporaryBlock;
        default:
          return true;
      }
    });
  }, [items, filter, search]);

  const total = filtered.reduce((sum, transaction) => sum + transaction.amount, 0);

  return (
    <>
      <LargeTitleBar title="İşlemlerim" />

      <div className="mx-auto max-w-3xl space-y-4 px-4 pt-4">
        <div className="flex items-center gap-2 rounded-tile border border-ink-200 bg-white px-3.5 py-2.5">
          <Search className="size-5 shrink-0 text-ink-400" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Alıcı veya işlem numarası ara"
            aria-label="İşlemlerde ara"
            className="w-full bg-transparent text-[15px] text-ink-900 placeholder:text-ink-400 focus:outline-none"
          />
        </div>

        <ChipGroup items={FILTERS} value={filter} onChange={setFilter} />

        {!isLoading && filtered.length > 0 && (
          <div className="flex items-baseline justify-between px-1">
            <span className="text-sm text-ink-500">{filtered.length} işlem</span>
            <span className="text-sm font-semibold text-ink-700 tabular">
              Toplam {formatCurrency(total)}
            </span>
          </div>
        )}

        {isLoading ? (
          <SkeletonList rows={5} />
        ) : filtered.length === 0 ? (
          <Card>
            <EmptyState
              icon={<ReceiptText />}
              title={search || filter !== 'ALL' ? 'Sonuç bulunamadı' : 'Henüz işlemin yok'}
              description={
                search || filter !== 'ALL'
                  ? 'Farklı bir arama veya filtre dene.'
                  : 'İlk işlemini oluşturduğunda burada listelenecek.'
              }
            />
          </Card>
        ) : (
          <Card flush>
            <div className="[&>*+*]:border-t [&>*+*]:border-ink-100">
              {filtered.map((transaction) => (
                <TransactionRow key={transaction.id} transaction={transaction} />
              ))}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
