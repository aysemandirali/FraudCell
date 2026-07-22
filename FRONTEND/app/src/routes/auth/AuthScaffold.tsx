import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, BrainCircuit, ShieldCheck, Zap } from 'lucide-react';
import { LogoWordmark } from '@/shared/ui/Logo';

/**
 * Kimlik akışı iskeleti — masaüstünde iki sütun.
 *
 * Sol: marka paneli (gradient + ürün vaadi), yalnızca lg ve üzeri görünür.
 * Sağ: form alanı. Mobilde sol panel gizlenir, üstte ince marka çubuğu kalır;
 * böylece küçük ekranda form tüm alanı alır (referans ekran 1'in ruhu).
 */

const HIGHLIGHTS = [
  { icon: BrainCircuit, title: 'Yapay zekâ destekli tespit', desc: 'Her işlem saniyeler içinde skorlanır.' },
  { icon: ShieldCheck, title: 'Uçtan uca güvenlik', desc: 'Şüpheli işlemler anında doğrulamaya alınır.' },
  { icon: Zap, title: 'Gerçek zamanlı operasyon', desc: 'Vakalar canlı akışla ekibe düşer.' },
];

export function AuthScaffold({
  children,
  backTo,
}: {
  children: ReactNode;
  backTo?: '/auth';
}) {
  return (
    <div className="flex min-h-dvh bg-canvas">
      {/* Sol marka paneli — masaüstü */}
      <aside className="relative hidden w-[44%] max-w-xl shrink-0 overflow-hidden gradient-splash lg:flex lg:flex-col">
        <div className="hero-mesh absolute inset-0" aria-hidden />
        <div className="relative z-10 flex h-full flex-col justify-between p-10 text-white xl:p-14">
          <LogoWordmark tone="white" />

          <div className="max-w-md">
            <h2 className="text-display leading-tight font-bold">
              Dolandırıcılığı işlem gerçekleşmeden yakala.
            </h2>
            <p className="mt-4 text-lg text-white/80">
              FraudCell, Paycell işlemlerini yapay zekâ ile izleyen uçtan uca dolandırıcılık
              tespit ve vaka yönetim platformudur.
            </p>

            <ul className="mt-10 space-y-5">
              {HIGHLIGHTS.map(({ icon: Icon, title, desc }) => (
                <li key={title} className="flex items-start gap-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-tile bg-white/12 ring-1 ring-white/20">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div>
                    <p className="font-semibold">{title}</p>
                    <p className="text-sm text-white/70">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-sm text-white/60">Turkcell · Paycell güvencesiyle</p>
        </div>
      </aside>

      {/* Sağ form alanı */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center px-4 sm:px-8 lg:hidden">
          {backTo ? (
            <Link
              to={backTo}
              aria-label="Giriş seçeneklerine dön"
              className="mr-3 rounded-full p-2 text-ink-500 transition-colors hover:bg-ink-100"
            >
              <ArrowLeft className="size-5" aria-hidden />
            </Link>
          ) : null}
          <LogoWordmark />
        </header>

        {backTo ? (
          <div className="hidden px-8 pt-8 lg:block">
            <Link
              to={backTo}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 transition-colors hover:text-brand-700"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Giriş seçenekleri
            </Link>
          </div>
        ) : null}

        <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8 sm:py-12">
          {children}
        </main>
      </div>
    </div>
  );
}
