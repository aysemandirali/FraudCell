import { useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, MapPin, Send, UserRound } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { createTransaction } from '@/features/transactions/api';
import { newIdempotencyKey } from '@/shared/api/client';
import { TRANSACTION_TYPES, TRANSACTION_TYPE_LABEL } from '@/shared/api/enums';
import { messageFor } from '@/shared/api/errors';
import { Banner, Button, Field } from '@/shared/ui';

const schema = z.object({
  amount: z.string().trim().refine((value) => Number(value) > 0, 'Sıfırdan büyük bir tutar gir.'),
  transactionType: z.enum(TRANSACTION_TYPES),
  recipientReference: z.string().trim().min(2, 'Alıcı referansı zorunludur.'),
  city: z.string().trim().min(2, 'Şehir zorunludur.'),
  countryCode: z.string().trim().length(2, 'İki harfli ülke kodu gir.'),
});

type FormValues = z.infer<typeof schema>;

function getDeviceFingerprint(): string {
  const storageKey = 'fraudcell-device-fingerprint';
  const existing = window.localStorage.getItem(storageKey);
  if (existing) return existing;
  const created = `web-${crypto.randomUUID()}`;
  window.localStorage.setItem(storageKey, created);
  return created;
}

export function NewTransactionPage() {
  const navigate = useNavigate();
  const idempotencyKey = useRef(newIdempotencyKey());
  const [requestError, setRequestError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: '',
      transactionType: 'TRANSFER',
      recipientReference: '',
      city: 'İstanbul',
      countryCode: 'TR',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setRequestError(null);
    try {
      const transaction = await createTransaction(
        {
          amount: Number(values.amount),
          currency: 'TRY',
          transactionType: values.transactionType,
          recipient: { reference: values.recipientReference },
          device: { fingerprint: getDeviceFingerprint() },
          location: { city: values.city, countryCode: values.countryCode.toUpperCase() },
          occurredAt: new Date().toISOString(),
        },
        idempotencyKey.current,
      );
      await navigate({
        to: '/customer/transactions/$transactionId',
        params: { transactionId: transaction.transactionId },
        replace: true,
      });
    } catch (error) {
      setRequestError(messageFor(error));
    }
  });

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <header className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => window.history.back()}
          aria-label="Geri"
          className="flex size-10 items-center justify-center rounded-full bg-surface text-ink-700 shadow-card"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div>
          <h1 className="text-h1 text-ink-900">Yeni işlem</h1>
          <p className="text-body text-ink-500">İşlem AI tarafından arka planda değerlendirilecek.</p>
        </div>
      </header>

      <form onSubmit={onSubmit} className="surface-card space-y-4 p-5" noValidate>
        {requestError ? <Banner tone="danger">{requestError}</Banner> : null}
        <Field
          label="Tutar (TRY)"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          error={errors.amount?.message}
          {...register('amount')}
        />

        <label className="block rounded-tile border border-ink-200 bg-white px-4 py-2.5 focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-600/20">
          <span className="block text-xs font-medium text-ink-500">İşlem türü</span>
          <select
            className="mt-1 w-full bg-transparent text-[17px] text-ink-900 focus:outline-none"
            {...register('transactionType')}
          >
            {TRANSACTION_TYPES.map((type) => (
              <option key={type} value={type}>{TRANSACTION_TYPE_LABEL[type]}</option>
            ))}
          </select>
        </label>

        <Field
          label="Alıcı referansı"
          placeholder="TR00 0000 veya kullanıcı referansı"
          leadingIcon={<UserRound className="size-5" />}
          error={errors.recipientReference?.message}
          {...register('recipientReference')}
        />
        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <Field
            label="Şehir"
            leadingIcon={<MapPin className="size-5" />}
            error={errors.city?.message}
            {...register('city')}
          />
          <Field
            label="Ülke"
            maxLength={2}
            error={errors.countryCode?.message}
            {...register('countryCode')}
          />
        </div>

        <Button
          type="submit"
          fullWidth
          loading={isSubmitting}
          leadingIcon={<Send className="size-4" />}
        >
          İşlemi gönder
        </Button>
      </form>
    </div>
  );
}
