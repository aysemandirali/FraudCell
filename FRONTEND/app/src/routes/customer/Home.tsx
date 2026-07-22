import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronRight,
  Globe,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { formatCurrency, initials } from '@/lib/format';
import { GlassCard, GradientHeader, QuickAction } from '@/components/layout/GradientHeader';
import { Card, IconTile, ListGroup, ListRow, SectionTitle, SkeletonList } from '@/components/ui';
import { TransactionRow } from '@/components/domain/TransactionRow';
import { useCases, useNotifications, useTransactions } from '@/hooks/queries';
import { useAuth } from '@/stores/auth';

const WALLET_BALANCE = 4_250.75;

/** Müşteri ana sayfası — Paycell ana ekranının FraudCell karşılığı. */
export default function Home() {
  const navigate = useNavigate();
  const user = useAuth((state) => state.user);

  const { data: transactions, isLoading } = useTransactions({ pageSize: 4 });
  const { data: notifications = [] } = useNotifications();
  const { data: verificationCases } = useCases({ status: 'MUSTERI_DOGRULAMA' });

  const unread = notifications.filter((notification) => !notification.read).length;
  const needsVerification = verificationCases?.totalItems ?? 0;
  const recent = transactions?.items.slice(0, 4) ?? [];

  return (
    <div className="pb-4">
      <GradientHeader overlap={40}>
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-full bg-white/95 text-[15px] font-bold text-brand-800">
            {initials(user?.fullName ?? '')}
          </span>
          <p className="flex-1 text-lg font-semibold">
            Merhaba {user?.fullName.split(' ')[0]?.toLocaleUpperCase('tr-TR')}!
          </p>

          <button
            type="button"
            aria-label="Ara"
            className="rounded-full p-2 transition-colors hover:bg-white/15"
          >
            <Search className="size-5.5" />
          </button>
          <Link
            to="/bildirimler"
            aria-label={unread > 0 ? `Bildirimler, ${unread} okunmamış` : 'Bildirimler'}
            className="relative rounded-full p-2 transition-colors hover:bg-white/15"
          >
            <Bell className="size-5.5" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 min-w-4 rounded-full bg-danger-500 px-1 text-center text-[10px] leading-4 font-bold tabular">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>
        </div>

        <div className="mt-5 text-center">
          <p className="text-[15px] text-white/85">Toplam Kart Bakiyem</p>
          <p className="mt-1 text-[40px] leading-none font-bold tabular">
            {formatCurrency(WALLET_BALANCE)}
          </p>
        </div>

        {/* Müşteriden yanıt bekleyen doğrulama varsa en görünür yere koy. */}
        {needsVerification > 0 ? (
          <Link to="/guvenlik" className="mt-5 block">
            <GlassCard className="flex items-center gap-3 border-white/40 bg-white/25">
              <ShieldCheck className="size-6 shrink-0" />
              <span className="flex-1 text-[15px] font-medium">
                {needsVerification} işlemin için doğrulaman bekleniyor
              </span>
              <ChevronRight className="size-5 shrink-0" />
            </GlassCard>
          </Link>
        ) : (
          <GlassCard className="mt-5 flex items-center gap-3">
            <ShieldCheck className="size-6 shrink-0" />
            <span className="flex-1 text-[15px]">
              İşlemlerin yapay zekâ ile anlık korunuyor.
            </span>
          </GlassCard>
        )}

        <div className="mt-6 flex justify-around">
          <QuickAction icon={<Send />} label="Para Gönder" onClick={() => navigate('/yeni-islem')} />
          <QuickAction icon={<Plus />} label="Para Yükle" onClick={() => navigate('/yeni-islem')} />
          <QuickAction
            icon={<Globe />}
            label="Yurt Dışı Transfer"
            onClick={() => navigate('/yeni-islem')}
          />
        </div>
      </GradientHeader>

      {/* Gradient bloğun üzerine binen içerik. */}
      <div className="relative -mt-10 space-y-6 px-4">
        <Card flush>
          <div className="flex items-center justify-between px-4 pt-4 pb-1">
            <h2 className="text-[15px] font-semibold text-ink-900">Son Hareketler</h2>
            <Link
              to="/islemlerim"
              className="text-sm font-semibold text-aqua-700 hover:text-aqua-600"
            >
              Tümünü Gör
            </Link>
          </div>

          {isLoading ? (
            <div className="p-4">
              <SkeletonList rows={3} />
            </div>
          ) : recent.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-400">Henüz işlemin yok.</p>
          ) : (
            <div className="[&>*+*]:border-t [&>*+*]:border-ink-100">
              {recent.map((transaction) => (
                <TransactionRow key={transaction.id} transaction={transaction} />
              ))}
            </div>
          )}
        </Card>

        <section>
          <SectionTitle>Güvenlik Merkezi</SectionTitle>
          <ListGroup>
            <ListRow
              icon={
                <IconTile tone="success">
                  <ShieldCheck />
                </IconTile>
              }
              title="İşlem Güvenliği"
              subtitle="Risk durumu ve doğrulama talepleri"
              to="/guvenlik"
            />
            <ListRow
              icon={
                <IconTile tone="brand">
                  <Sparkles />
                </IconTile>
              }
              title="Yapay Zekâ Koruması"
              subtitle="Her işlem risk skorlaması ile değerlendirilir"
              to="/guvenlik"
            />
            <ListRow
              icon={
                <IconTile tone="aqua">
                  <TrendingUp />
                </IconTile>
              }
              title="Harcama Analizi"
              subtitle="Alışkanlıkların risk modelini besler"
              to="/islemlerim"
            />
          </ListGroup>
        </section>
      </div>
    </div>
  );
}
