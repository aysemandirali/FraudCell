import { Link } from 'react-router-dom';
import { ArrowLeft, Play, Power, RotateCcw, Server } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Badge, Button, Card, CardHeader, SectionTitle, Skeleton, useToast } from '@/components/ui';
import { useSystemHealth, useToggleService } from '@/hooks/queries';
import type { ServiceHealth } from '@/api/endpoints';

/** Jüri önünde oynanacak demo perdeleri (doküman §45). */
const DEMO_SCRIPT = [
  {
    title: 'Perde 1 — Normal akış',
    steps: [
      'Müşteri GSM + OTP ile giriş yapar.',
      'Gece saatinde, yurt dışına, yüksek tutarlı işlem oluşturur.',
      'İşlem önce PENDING görünür; AI değerlendirmesi asenkron gelir.',
      'Risk skoru, fraud türü ve reason code’lar SSE ile ekrana düşer.',
      'Uygun uzmanlıktaki analiste otomatik atanır.',
      'Analist inceler, müşteri “ben yapmadım” der, analist bloklar.',
      'Puan ve rozet leaderboard’a yansır.',
    ],
  },
  {
    title: 'Perde 2 — Servis arızası',
    steps: [
      'AI Service durdurulur.',
      'Yeni işlem oluşturulur: kayıt başarılı, risk BELİRSİZ, karar İNCELEME.',
      'Vaka manuel inceleme kuyruğuna düşer; sistem 500 vermez.',
      'AI Service yeniden başlatılır.',
      'Kuyrukta bekleyen event işlenir, sonuç ekrana gelir.',
    ],
  },
  {
    title: 'Perde 3 — Güvenlik',
    steps: [
      'Müşteri token’ıyla süpervizör ucu → 403.',
      'Başka müşterinin işlem ID’si → 404.',
      'Manipüle edilmiş / süresi dolmuş JWT → 401.',
      'Revoke edilmiş refresh token tekrar kullanılır → tüm oturumlar düşer.',
      'SQL injection ve XSS girdileri → sızıntı yok, script çalışmaz.',
      'Ardışık hatalı giriş → rate limit + 15 dakika hesap kilidi.',
    ],
  },
];

/**
 * Demo kontrol paneli.
 *
 * Jüri önünde servis kapatıp açmayı tek ekrana indirir — terminale geçmeden
 * "docker compose stop ai-service" etkisini gösterir. Yalnızca demo profilinde
 * açıktır; üretim yapılandırmasında bu route derlemeye girmez.
 */
export default function DemoControl() {
  const { data: services, isPending } = useSystemHealth();
  const toggle = useToggleService();
  const toast = useToast();

  function setStatus(service: ServiceHealth, status: 'UP' | 'DOWN') {
    toggle.mutate(
      { name: service.name, status },
      {
        onSuccess: () =>
          toast.success(
            status === 'DOWN'
              ? `${service.displayName} durduruldu`
              : `${service.displayName} yeniden başlatıldı`,
            status === 'DOWN'
              ? 'Bekleyen işler outbox ve kuyrukta birikecek.'
              : 'Kuyrukta bekleyen event’ler işlenmeye başladı.',
          ),
        onError: () => toast.error('Servis durumu değiştirilemedi.'),
      },
    );
  }

  const anyDown = services?.some((service) => service.status === 'DOWN') ?? false;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
      >
        <ArrowLeft className="size-4" />
        Uygulamaya dön
      </Link>

      <div className="mt-4 space-y-6">
        <SectionTitle
          action={
            anyDown && (
              <Button
                size="sm"
                variant="secondary"
                leadingIcon={<RotateCcw className="size-4" />}
                onClick={() => {
                  for (const service of services ?? []) {
                    if (service.status === 'DOWN') setStatus(service, 'UP');
                  }
                }}
              >
                Hepsini başlat
              </Button>
            )
          }
        >
          Demo Kontrolü
        </SectionTitle>

        {/* ------------------------------------------------------ Servisler -- */}
        <Card>
          <CardHeader
            title="Servisler"
            subtitle="Bir servisi durdurup sistemin ayakta kaldığını göster"
          />

          {isPending ? (
            <Skeleton className="mt-4 h-40 w-full" />
          ) : (
            <ul className="mt-4 space-y-2">
              {(services ?? []).map((service) => {
                const down = service.status === 'DOWN';
                return (
                  <li
                    key={service.name}
                    className={cn(
                      'flex flex-wrap items-center justify-between gap-3 rounded-tile border px-3.5 py-3',
                      down
                        ? 'border-critical-500/30 bg-critical-100/40'
                        : 'border-ink-100 bg-canvas',
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Server
                        className={cn('size-5 shrink-0', down ? 'text-critical-700' : 'text-success-500')}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink-900">
                          {service.displayName}
                        </p>
                        <p className="truncate text-xs text-ink-500">{service.detail}</p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Badge tone={down ? 'critical' : 'success'}>
                        {down ? 'Kapalı' : 'Çalışıyor'}
                      </Badge>
                      <Button
                        size="sm"
                        variant={down ? 'primary' : 'danger'}
                        leadingIcon={
                          down ? <Play className="size-4" /> : <Power className="size-4" />
                        }
                        onClick={() => setStatus(service, down ? 'UP' : 'DOWN')}
                      >
                        {down ? 'Başlat' : 'Durdur'}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <p className="mt-4 text-xs leading-relaxed text-ink-400">
            Servis kapatıldığında işlemler kaybolmaz: business verisi commit edilir, event outbox’ta
            bekler ve servis döndüğünde işlenir. Bu panel, gerçek ortamda
            <code className="mx-1 font-mono">docker compose stop ai-service</code>
            komutunun yerine geçer.
          </p>
        </Card>

        {/* --------------------------------------------------- Demo script -- */}
        <div className="grid gap-4 md:grid-cols-3">
          {DEMO_SCRIPT.map((act) => (
            <Card key={act.title}>
              <h3 className="text-[15px] font-semibold text-ink-900">{act.title}</h3>
              <ol className="mt-3 space-y-2">
                {act.steps.map((step, index) => (
                  <li key={step} className="flex gap-2 text-sm text-ink-700">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-800">
                      {index + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
