import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bell, CreditCard, ShieldCheck } from 'lucide-react';
import {
  Badge,
  Banner,
  Button,
  Card,
  ChipGroup,
  EmptyState,
  Field,
  IconTile,
  ListGroup,
  ListRow,
  PasswordField,
  PulseDot,
  RiskBar,
  RiskGauge,
  RuleList,
  SectionTitle,
  Sheet,
  SkeletonList,
  SlaCountdown,
  Tabs,
  useToast,
} from '@/components/ui';
import { RISK_LEVEL_LABEL } from '@/domain/risk';
import type { RiskLevel } from '@/domain/types';

const RISK_LEVELS: RiskLevel[] = ['DUSUK', 'ORTA', 'YUKSEK', 'KRITIK'];

const SCORE_BY_LEVEL: Record<RiskLevel, number> = {
  DUSUK: 0.22,
  ORTA: 0.55,
  YUKSEK: 0.82,
  KRITIK: 0.94,
};

/**
 * Bileşen galerisi.
 *
 * Tasarım sistemini tek ekranda görünür kılar: yeni bir ekran yazarken hangi
 * bileşenin var olduğunu aramak yerine buradan seçilir. Ürün akışının parçası
 * değildir, yalnızca geliştirme aracıdır.
 */
export default function DesignSystem() {
  const toast = useToast();
  const [tab, setTab] = useState('one');
  const [chip, setChip] = useState('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [text, setText] = useState('');

  const inTenMinutes = new Date(Date.now() + 10 * 60_000).toISOString();
  const overdue = new Date(Date.now() - 60_000).toISOString();

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 lg:px-8">
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
        >
          <ArrowLeft className="size-4" />
          Uygulamaya dön
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-ink-900">Tasarım Sistemi</h1>
        <p className="mt-1 text-sm text-ink-500">
          Tokenlar <code className="font-mono">src/styles/globals.css</code> içinde tanımlıdır.
        </p>
      </div>

      {/* ------------------------------------------------------------ Renk -- */}
      <Section title="Renk Rampaları">
        <div className="space-y-4">
          <Ramp label="brand" steps={['50', '100', '200', '400', '600', '700', '800', '900']} prefix="bg-brand-" />
          <Ramp label="aqua" steps={['50', '100', '300', '500', '600', '700']} prefix="bg-aqua-" />
          <Ramp label="ink" steps={['100', '200', '400', '500', '700', '900']} prefix="bg-ink-" />
          <Ramp label="durum" steps={['success-500', 'warning-500', 'danger-500', 'critical-500']} prefix="bg-" />
        </div>
        <p className="mt-4 text-xs leading-relaxed text-ink-400">
          Durum renkleri ayrılmıştır: kategori serisi olarak yeniden kullanılmaz. Grafiklerde
          kimlik her zaman etiketle taşınır, renk yalnızca pekiştirir.
        </p>
      </Section>

      {/* --------------------------------------------------------- Butonlar -- */}
      <Section title="Butonlar">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Birincil</Button>
          <Button variant="secondary">İkincil</Button>
          <Button variant="ghost">Hayalet</Button>
          <Button variant="danger">Tehlikeli</Button>
          <Button loading>Yükleniyor</Button>
          <Button disabled>Devre dışı</Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button size="sm">Küçük</Button>
          <Button size="md">Orta</Button>
          <Button size="lg">Büyük</Button>
        </div>
      </Section>

      {/* ----------------------------------------------------------- Rozet -- */}
      <Section title="Rozet ve Durum">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand">Marka</Badge>
          <Badge tone="aqua">Aqua</Badge>
          <Badge tone="success">Başarılı</Badge>
          <Badge tone="warning">Uyarı</Badge>
          <Badge tone="danger">Tehlike</Badge>
          <Badge tone="critical">Kritik</Badge>
          <Badge tone="neutral">Nötr</Badge>
          <Badge solid>Yeni</Badge>
          <span className="inline-flex items-center gap-1.5 text-sm text-danger-500">
            <PulseDot />
            Canlı
          </span>
        </div>
      </Section>

      {/* ------------------------------------------------------------ Risk -- */}
      <Section title="Risk Göstergeleri">
        <div className="flex flex-wrap items-end gap-6">
          {RISK_LEVELS.map((level) => (
            <div key={level} className="text-center">
              <RiskGauge
                score={SCORE_BY_LEVEL[level]}
                level={level}
                status="COMPLETED"
                size="md"
              />
              <p className="mt-1 text-xs text-ink-500">{RISK_LEVEL_LABEL[level]}</p>
            </div>
          ))}
          <div className="text-center">
            <RiskGauge score={null} level={null} status="PENDING" size="md" />
            <p className="mt-1 text-xs text-ink-500">Değerlendirme bekliyor</p>
          </div>
        </div>

        <div className="mt-6 max-w-sm space-y-3">
          {RISK_LEVELS.map((level) => (
            <RiskBar
              key={level}
              score={SCORE_BY_LEVEL[level]}
              level={level}
              status="COMPLETED"
            />
          ))}
          <RiskBar score={null} level={null} status="PENDING" />
        </div>
      </Section>

      {/* ------------------------------------------------------------- SLA -- */}
      <Section title="SLA Geri Sayımı">
        <div className="flex flex-wrap gap-3">
          <SlaCountdown dueAt={inTenMinutes} />
          <SlaCountdown dueAt={new Date(Date.now() + 90_000).toISOString()} />
          <SlaCountdown dueAt={overdue} breached />
          <SlaCountdown dueAt={null} />
        </div>
      </Section>

      {/* ------------------------------------------------------ Form alanı -- */}
      <Section title="Form Alanları">
        <div className="max-w-md space-y-4">
          <Field label="Ad Soyad" placeholder="Ayşe Yılmaz" />
          <Field
            label="Tutar"
            value={text}
            onChange={(event) => setText(event.target.value)}
            hint="İşlem tutarını TL cinsinden gir."
          />
          <Field label="E-posta" error="Geçerli bir e-posta adresi gir." defaultValue="hatalı" />
          <PasswordField label="Şifre" />
          <RuleList
            rules={[
              { text: 'En az 8 karakter', met: text.length >= 8 },
              { text: 'En az bir büyük harf', met: /[A-ZĞÜŞİÖÇ]/.test(text) },
              { text: 'En az bir rakam', met: /\d/.test(text) },
              { text: 'En az bir özel karakter', met: /[^\w\s]/.test(text) },
            ]}
          />
        </div>
      </Section>

      {/* ------------------------------------------------------- Gezinme -- */}
      <Section title="Sekme ve Çip">
        <Tabs
          items={[
            { value: 'one', label: 'Vakalarım', count: 4 },
            { value: 'two', label: 'Tümü', count: 27 },
          ]}
          value={tab}
          onChange={setTab}
        />
        <ChipGroup
          className="mt-4"
          items={[
            { value: 'all', label: 'Tümü' },
            { value: 'critical', label: 'Kritik', count: 3 },
            { value: 'high', label: 'Yüksek', count: 8 },
          ]}
          value={chip}
          onChange={setChip}
        />
      </Section>

      {/* ---------------------------------------------------------- Liste -- */}
      <Section title="Liste Satırları">
        <ListGroup className="max-w-md">
          <ListRow
            icon={<IconTile><CreditCard /></IconTile>}
            title="Kartlarım"
            subtitle="3 aktif kart"
            to="/design-system"
          />
          <ListRow
            icon={<IconTile tone="success"><ShieldCheck /></IconTile>}
            title="Güvenlik"
            subtitle="Son giriş: bugün 14:32"
            trailing={<Badge tone="success">Güvenli</Badge>}
            to="/design-system"
          />
          <ListRow
            icon={<IconTile tone="warning"><Bell /></IconTile>}
            title="Bildirimler"
            trailing={<Badge tone="danger">2</Badge>}
            onClick={() => toast.info('Bildirim satırı tıklandı.')}
          />
        </ListGroup>
      </Section>

      {/* ------------------------------------------------------ Geri bildirim -- */}
      <Section title="Geri Bildirim">
        <div className="space-y-3">
          <Banner tone="info">Bilgilendirme mesajı.</Banner>
          <Banner tone="success">İşlem başarıyla tamamlandı.</Banner>
          <Banner tone="warning">AI Service yanıt vermiyor, metrikler gösterilemiyor.</Banner>
          <Banner tone="danger">Vaka başka bir kullanıcı tarafından güncellendi.</Banner>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => toast.success('Kaydedildi', 'Değişiklikler uygulandı.')}>
            Başarı toast
          </Button>
          <Button variant="secondary" onClick={() => toast.error('Hata', 'İşlem tamamlanamadı.')}>
            Hata toast
          </Button>
          <Button variant="secondary" onClick={() => setSheetOpen(true)}>
            Panel aç
          </Button>
        </div>

        <div className="mt-6 max-w-md">
          <SkeletonList rows={2} />
        </div>

        <EmptyState
          icon={<Bell />}
          title="Burada henüz bir şey yok"
          description="Bir işlem oluşturduğunda bu alan dolacak."
          action={<Button size="sm">İşlem Oluştur</Button>}
        />
      </Section>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Örnek Panel"
        description="Mobilde alttan açılır, masaüstünde ortalanmış diyalog olur."
        footer={
          <Button fullWidth onClick={() => setSheetOpen(false)}>
            Anladım
          </Button>
        }
      >
        <p className="text-sm leading-relaxed text-ink-700">
          Panel açıkken arka plan kaydırması kilitlenir, Escape ile kapanır ve odak kapanışta
          tetikleyen öğeye geri döner.
        </p>
      </Sheet>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <SectionTitle>{title}</SectionTitle>
      <Card>{children}</Card>
    </section>
  );
}

function Ramp({ label, steps, prefix }: { label: string; steps: string[]; prefix: string }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-ink-500">{label}</p>
      <div className="flex gap-1 overflow-hidden rounded-tile">
        {steps.map((step) => (
          <div key={step} className="flex-1">
            <div className={`h-12 ${prefix}${step}`} />
            <p className="mt-1 text-center text-[10px] text-ink-400">{step}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
