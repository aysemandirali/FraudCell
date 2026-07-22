import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Banner, Button, Field } from '@/components/ui';
import { AppBar } from '@/components/layout/AppBar';
import { useCreateTransaction } from '@/hooks/queries';
import { ApiError } from '@/api/client';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/format';
import { TRANSACTION_TYPE_LABEL, type TransactionType } from '@/domain/types';

const TYPES: TransactionType[] = [
  'PARA_GONDERME',
  'PARA_YUKLEME',
  'YURT_DISI_TRANSFER',
  'FATURA_ODEME',
  'ALISVERIS',
];

const CITIES = ['İstanbul', 'Ankara', 'İzmir', 'Antalya', 'Kocaeli', 'Berlin', 'Londra', 'Dubai'];

/** Farklı risk profilleri üretmek için hazır senaryolar — demo hızlandırıcı. */
const SCENARIOS = [
  {
    label: 'Normal işlem',
    hint: 'Düşük risk bekleniyor',
    values: {
      amount: '750',
      recipient: 'Mehmet Kaya',
      city: 'İstanbul',
      country: 'TR',
      transactionType: 'PARA_GONDERME' as TransactionType,
      sourceDevice: 'Xiaomi Redmi Note 12',
    },
  },
  {
    label: 'Şüpheli işlem',
    hint: 'İnceleme bekleniyor',
    values: {
      amount: '7500',
      recipient: 'Volkan Tez',
      city: 'Antalya',
      country: 'TR',
      transactionType: 'PARA_GONDERME' as TransactionType,
      sourceDevice: 'iPhone 15 Pro',
    },
  },
  {
    label: 'Yüksek riskli',
    hint: 'Blok bekleniyor',
    values: {
      amount: '24000',
      recipient: 'Global Trade Ltd',
      city: 'Berlin',
      country: 'DE',
      transactionType: 'YURT_DISI_TRANSFER' as TransactionType,
      sourceDevice: 'Chrome / Linux',
    },
  },
];

export default function NewTransaction() {
  const navigate = useNavigate();
  const createTransaction = useCreateTransaction();

  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [transactionType, setTransactionType] = useState<TransactionType>('PARA_GONDERME');
  const [city, setCity] = useState('İstanbul');
  const [country, setCountry] = useState('TR');
  const [sourceDevice, setSourceDevice] = useState('Xiaomi Redmi Note 12');
  const [error, setError] = useState<string | null>(null);

  const numericAmount = Number(amount.replace(',', '.'));
  const isValid = numericAmount > 0 && recipient.trim().length > 1;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isValid || createTransaction.isPending) return;

    setError(null);
    try {
      const transaction = await createTransaction.mutateAsync({
        amount: numericAmount,
        transactionType,
        recipient: recipient.trim(),
        city,
        country,
        sourceDevice,
      });
      // İşlem 201 ile döner; risk sonucu detay ekranında canlı olarak düşer.
      navigate(`/islem/${transaction.id}`, { replace: true });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'İşlem oluşturulamadı.');
    }
  }

  function applyScenario(values: (typeof SCENARIOS)[number]['values']) {
    setAmount(values.amount);
    setRecipient(values.recipient);
    setCity(values.city);
    setCountry(values.country);
    setTransactionType(values.transactionType);
    setSourceDevice(values.sourceDevice);
    setError(null);
  }

  return (
    <>
      <AppBar title="Yeni İşlem" back="/" />

      <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-5 px-4 pt-5">
        <div className="surface-card p-5 text-center">
          <label htmlFor="amount-input" className="text-sm font-medium text-ink-500">
            Tutar
          </label>
          <div className="mt-2 flex items-center justify-center gap-1">
            <span className="text-3xl font-bold text-ink-400">₺</span>
            <input
              id="amount-input"
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(event) => setAmount(event.target.value.replace(/[^\d.,]/g, ''))}
              autoFocus
              className="w-40 bg-transparent text-center text-4xl font-bold text-ink-900 tabular placeholder:text-ink-200 focus:outline-none"
            />
          </div>
          {numericAmount > 0 && (
            <p className="mt-2 text-sm text-ink-400">{formatCurrency(numericAmount)}</p>
          )}
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink-500">İşlem Tipi</legend>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((type) => (
              <button
                key={type}
                type="button"
                aria-pressed={type === transactionType}
                onClick={() => setTransactionType(type)}
                className={cn(
                  'rounded-pill border px-3.5 py-2 text-sm font-medium transition-colors',
                  type === transactionType
                    ? 'border-brand-700 bg-brand-700 text-white'
                    : 'border-ink-200 bg-white text-ink-700 hover:border-brand-400',
                )}
              >
                {TRANSACTION_TYPE_LABEL[type]}
              </button>
            ))}
          </div>
        </fieldset>

        <Field
          label="Alıcı"
          placeholder="Ad Soyad veya kurum"
          autoComplete="off"
          value={recipient}
          onChange={(event) => setRecipient(event.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="city-select"
              className="mb-1.5 block px-1 text-xs font-medium text-ink-500"
            >
              Şehir
            </label>
            <select
              id="city-select"
              value={city}
              onChange={(event) => {
                setCity(event.target.value);
                // Yurt dışı şehir seçildiğinde ülkeyi de güncelle.
                const foreign: Record<string, string> = {
                  Berlin: 'DE',
                  Londra: 'GB',
                  Dubai: 'AE',
                };
                setCountry(foreign[event.target.value] ?? 'TR');
              }}
              className="h-12 w-full rounded-tile border border-ink-200 bg-white px-3 text-[15px] text-ink-900"
            >
              {CITIES.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="device-select"
              className="mb-1.5 block px-1 text-xs font-medium text-ink-500"
            >
              Cihaz
            </label>
            <select
              id="device-select"
              value={sourceDevice}
              onChange={(event) => setSourceDevice(event.target.value)}
              className="h-12 w-full rounded-tile border border-ink-200 bg-white px-3 text-[15px] text-ink-900"
            >
              <option>Xiaomi Redmi Note 12</option>
              <option>iPhone 15 Pro</option>
              <option>Chrome / Windows</option>
              <option>Chrome / Linux</option>
            </select>
          </div>
        </div>

        <Banner tone="info">
          İşlemin önce güvenli şekilde kaydedilir, risk değerlendirmesi hemen ardından yapılır.
          Değerlendirme tamamlanana kadar risk durumu <strong>BELİRSİZ</strong> görünür.
        </Banner>

        {error && <Banner tone="danger">{error}</Banner>}

        {import.meta.env.VITE_API_MODE !== 'live' && (
          <div>
            <p className="mb-2 text-sm font-semibold text-ink-500">Demo senaryoları</p>
            <div className="grid grid-cols-3 gap-2">
              {SCENARIOS.map((scenario) => (
                <button
                  key={scenario.label}
                  type="button"
                  onClick={() => applyScenario(scenario.values)}
                  className="rounded-tile border border-ink-200 bg-white px-2 py-2.5 text-left transition-colors hover:border-brand-600"
                >
                  <span className="block text-sm font-semibold text-ink-900">{scenario.label}</span>
                  <span className="mt-0.5 block text-xs text-ink-400">{scenario.hint}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="safe-bottom sticky bottom-0 -mx-4 bg-canvas/95 px-4 py-4 backdrop-blur">
          <Button
            type="submit"
            size="lg"
            fullWidth
            disabled={!isValid}
            loading={createTransaction.isPending}
          >
            İşlemi Gönder
          </Button>
        </div>
      </form>
    </>
  );
}
