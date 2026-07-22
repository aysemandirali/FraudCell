import { Link } from 'react-router-dom';
import { ArrowUpRight, Ban, Globe, Plus, Receipt, ShoppingBag, ShieldQuestion } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { Badge, IconTile } from '@/components/ui';
import { RISK_LEVEL_LABEL, UNKNOWN_RISK_LABEL, riskTone } from '@/domain/risk';
import { TRANSACTION_TYPE_LABEL, type Transaction, type TransactionType } from '@/domain/types';

const TYPE_ICON: Record<TransactionType, typeof ArrowUpRight> = {
  PARA_GONDERME: ArrowUpRight,
  PARA_YUKLEME: Plus,
  YURT_DISI_TRANSFER: Globe,
  FATURA_ODEME: Receipt,
  ALISVERIS: ShoppingBag,
};

/**
 * İşlem listesi satırı. Risk durumu her zaman görünür:
 * değerlendirme bitmemişse sahte skor yerine "BELİRSİZ" gösterilir.
 */
export function TransactionRow({ transaction }: { transaction: Transaction }) {
  const Icon = TYPE_ICON[transaction.transactionType];
  const pending = transaction.assessmentStatus !== 'COMPLETED';
  const tone = riskTone(transaction.riskLevel);

  return (
    <Link
      to={`/islem/${transaction.id}`}
      className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-brand-50 active:bg-brand-100"
    >
      <IconTile tone={transaction.temporaryBlock ? 'danger' : 'brand'} size="md">
        {transaction.temporaryBlock ? <Ban /> : <Icon />}
      </IconTile>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium text-ink-900">{transaction.recipient}</p>
        <p className="mt-0.5 truncate text-sm text-ink-500">
          {TRANSACTION_TYPE_LABEL[transaction.transactionType]} ·{' '}
          {formatDateTime(transaction.occurredAt)}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <span
          className={cn(
            'text-[15px] font-semibold tabular',
            transaction.temporaryBlock ? 'text-danger-500 line-through' : 'text-ink-900',
          )}
        >
          −{formatCurrency(transaction.amount)}
        </span>

        {pending ? (
          <Badge tone="neutral" className="gap-1.5">
            <ShieldQuestion className="size-3" />
            {UNKNOWN_RISK_LABEL}
          </Badge>
        ) : (
          <span className={cn('rounded-pill px-2.5 py-1 text-xs font-semibold', tone.chip)}>
            {transaction.riskLevel ? RISK_LEVEL_LABEL[transaction.riskLevel] : UNKNOWN_RISK_LABEL}
          </span>
        )}
      </div>
    </Link>
  );
}
