# Bence yanlış olan React değil, kararın eksik bırakılması

Önceki kararda frontend yalnızca **“React + TypeScript + Vite”** olarak tanımlanmış. Bu temel doğru; fakat routing, API sözleşmesi, server-state, authentication, realtime, tablo, grafik, form ve test stratejisi açık bırakılmış.

FraudCell sıradan bir CRUD arayüzü değil. Dört rol, yoğun filtrelenen vaka listeleri, SLA sayaçları, gerçek zamanlı bildirimler, operasyon dashboard’u, 409/422 gibi domain hataları ve güvenlik testleri var. Case ayrıca responsive tasarım ile loading/error/empty state’leri açıkça puanlıyor. Mevcut gereksinim matrisinde frontend hâlâ `NOT_STARTED`, yani kararları değiştirmek için en doğru noktadayız.

## Kilitleyeceğim yeni frontend stack’i

| Alan                | Seçim                                             |
| ------------------- | ------------------------------------------------- |
| Uygulama            | **React 19.x + TypeScript strict + Vite**         |
| Routing             | **TanStack Router**                               |
| Server state        | **TanStack Query**                                |
| API sözleşmesi      | **OpenAPI TypeScript + openapi-fetch**            |
| UI katmanı          | **Tailwind CSS 4 + shadcn/ui**                    |
| Primitive altyapısı | **Radix seçilip sabitlenecek**                    |
| Form                | **React Hook Form + Zod 4**                       |
| Vaka tabloları      | **TanStack Table v8 stable**                      |
| Grafik              | **Recharts**                                      |
| Realtime            | **SSE + tek bağlantı + Query cache invalidation** |
| Global client state | **Başlangıçta hiçbir ek kütüphane yok**           |
| Unit/component test | **Vitest + React Testing Library + MSW**          |
| E2E                 | **Playwright**                                    |
| Paket yöneticisi    | **pnpm + kilitli sürümler**                       |
| Deployment          | **Static SPA, Gateway ile aynı origin**           |

## Neleri değiştirmem, neleri değiştiririm?

### React + Vite kalmalı

Bu uygulamada SEO, public içerik, server-side rendering veya React Server Components ihtiyacı yok. Kullanıcı giriş yaptıktan sonra çalışan operasyonel bir SPA geliştiriyoruz. Next.js eklemek ikinci bir backend/runtime, SSR authentication sorunları ve daha karmaşık Docker deployment getirir; jüri puanına karşılık anlamlı bir fayda sağlamaz.

React’in kendi dokümantasyonu, framework gerektirmeyen özel uygulamalarda Vite gibi bir build tool ile başlanabileceğini açıkça destekliyor; Vite de React ve TypeScript için resmi şablon sağlıyor. ([React][1])

Dolayısıyla:

> **Next.js’e geçmezdim. React + Vite kararını korurdum.**

### React Router yerine TanStack Router seçerdim

FraudCell ekranlarında URL aslında önemli bir state kaynağı:

```text
/cases?risk=KRITIK&status=ATANDI&page=2&sort=slaDeadline
```

Filtrelerin URL’de olması şu avantajları sağlar:

- Sayfa yenilenince filtre kaybolmaz.
- Süpervizör filtrelenmiş ekranı paylaşabilir.
- Geri/ileri tuşları doğru çalışır.
- Pagination ve sorting global store’a taşınmaz.
- Search parametreleri Zod ile doğrulanabilir.

TanStack Router search parametrelerini typed, validated ve paylaşılabilir state olarak ele alıyor. Bu uygulamanın dashboard ve vaka listesi yapısına React Router’dan daha iyi oturuyor. ([TanStack][2])

### Redux veya Zustand ile başlamazdım

Uygulamadaki verinin büyük kısmı client state değil, **server state**:

- Atanan vakalar
- Vaka detayları
- SLA durumu
- Dashboard metrikleri
- Liderlik tablosu
- Bildirimler
- Kullanıcı profili

Bunları Redux store’a kopyalamak iki farklı doğruluk kaynağı yaratır. TanStack Query fetching, caching, invalidation ve server-state senkronizasyonu için tasarlanmış durumda. ([TanStack][3])

State dağılımı şöyle olmalı:

```text
Server state      → TanStack Query
Filtre/sıralama   → URL / TanStack Router
Form state        → React Hook Form
Modal, dropdown   → local useState
Auth token        → memory
Gerçek global UI  → İhtiyaç doğarsa Zustand
```

Zustand’ı başlangıç dependency’si yapmazdım. Gerçek bir kullanım oluşursa sonradan eklemek kolay.

## API katmanını elle yazmazdım

Backend için Swagger/OpenAPI zaten zorunlu. Frontend’de tekrar elle DTO, response type ve endpoint yolu yazmak gereksiz hata yüzeyi oluşturur.

Akış şu olur:

```text
Backend OpenAPI
      ↓
openapi-typescript
      ↓
Generated TypeScript types
      ↓
openapi-fetch
      ↓
Feature seviyesinde TanStack Query hooks
```

`openapi-typescript` OpenAPI şemasından TypeScript tipleri üretiyor; `openapi-fetch` ise bu tipleri kullanan küçük bir fetch client sağlıyor. Böylece backend sözleşmesi değiştiğinde frontend build aşamasında kırılır. ([OpenAPI TypeScript][4])

**Axios kullanmazdım.** Native `fetch`, typed client ve TanStack Query yeterli.

## UI kütüphanesi tercihim

### Tailwind CSS 4 + shadcn/ui

MUI veya Ant Design ile çok hızlı admin ekranı çıkarılabilir; fakat ortaya çoğunlukla jenerik bir dashboard çıkar. Turkcell’e özgü risk renkleri, SLA göstergeleri, vaka kartları ve gamification görünümü için daha fazla görsel kontrol gerekiyor.

Tailwind CSS 4’ün resmi Vite entegrasyonu bulunuyor ve runtime CSS-in-JS maliyeti oluşturmuyor. ([Tailwind CSS][5])

shadcn/ui’yi klasik bir npm component library olarak değil, projenin sahip olduğu component kaynak kodu olarak kullanırdım. Ancak önemli bir ayrıntı var: shadcn 2026’da hem Base UI hem Radix desteğine geçti ve Temmuz 2026’da varsayılanı Base UI yaptı. Yarışma projesinde değişken bir CLI varsayılanına güvenmek yerine primitive altyapısını ve sürümleri açıkça sabitlerdim; burada daha oturmuş olan **Radix seçimini** korurdum. ([Shadcn UI][6])

### Formlar

React Hook Form + Zod 4:

- Login
- Personel oluşturma
- İşlem oluşturma
- Analist karar notu
- Manuel atama
- Müşteri doğrulama
- Feedback

Zod hem runtime doğrulama hem TypeScript type inference sağlıyor ve Zod 4 stable durumda. ([Zod][7])

### Tablo ve grafik

Vaka listeleri için **TanStack Table v8 stable** kullanırdım. Sorting, filtering, pagination, row selection ve column visibility sağlıyor; görünümü tamamen bize bırakıyor. v9 şu anda beta olduğundan yarışma projesine almazdım. ([TanStack][8])

Grafikler için Recharts yeterli. Case’te pasta, bar ve trend grafikleri isteniyor; Apache ECharts gibi daha ağır bir çözümün kabiliyetlerine ihtiyaç yok. ([Recharts][9])

## Realtime mimarisini de netleştirmeliyiz

Tek kullanıcı için tek SSE bağlantısı kurulmalı:

```text
Gateway SSE
    ↓
Realtime adapter
    ↓
Event schema validation
    ↓
TanStack Query invalidate/setQueryData
    ↓
Ekranların güncellenmesi
```

SSE event’leri ikinci bir global store oluşturmayacak. Örneğin:

```text
case.assigned       → cases ve case-detail query invalidate
case.updated        → ilgili case-detail invalidate
badge.earned        → profile ve leaderboard invalidate + toast
sla.breached        → active-cases ve dashboard invalidate
```

Native `EventSource` arbitrary `Authorization` header gönderemediği için uzun ömürlü JWT’yi query string’e koymak yanlış olur. Bu projede access token memory’de tutulmalı, refresh token Secure/HttpOnly cookie olmalı ve SSE bağlantısı için kısa ömürlü, tek kullanımlık stream ticket üretilmeli. ([GitHub][10])

## Production topolojisini de değiştirirdim

Frontend ve API’yi farklı origin’lerde yayınlamazdım.

```text
http://localhost:8080/
├── /                  React SPA
├── /api/**            YARP routes
└── /events/**         SSE
```

Production Gateway Docker image’ı multi-stage build sırasında React uygulamasını build eder ve çıkan `dist` dosyalarını Gateway’in static dosya dizinine kopyalar.

Bunun getirileri:

- Tek public port
- CORS problemi yok
- Cookie ve SSE daha sade
- Jüri demosunda daha az container/network riski
- Browser yalnızca Gateway ile konuşuyor
- `docker compose up` sonrası tek URL

Development sırasında Vite çalışır ve `/api` ile `/events` isteklerini Gateway’e proxy eder.

## Frontend klasör yapısı

```text
src/Web/
├── src/
│   ├── app/
│   │   ├── router/
│   │   ├── providers/
│   │   └── styles/
│   ├── routes/
│   │   ├── auth/
│   │   ├── customer/
│   │   ├── analyst/
│   │   ├── supervisor/
│   │   └── admin/
│   ├── features/
│   │   ├── authentication/
│   │   ├── transactions/
│   │   ├── cases/
│   │   ├── dashboard/
│   │   ├── gamification/
│   │   └── realtime/
│   ├── shared/
│   │   ├── api/
│   │   │   └── generated/
│   │   ├── ui/
│   │   ├── lib/
│   │   ├── config/
│   │   └── types/
│   └── main.tsx
├── e2e/
├── package.json
├── vite.config.ts
└── tsconfig.json
```

Full Feature-Sliced Design, atomic design veya ayrı design-system package oluşturmazdım. Üç kişilik takım için bunlar hız değil organizasyon maliyeti getirir.

## Özellikle uygulayacağım dört kural

1. **Approve/block işlemleri optimistic olmayacak.** Backend cevabı beklenir; `409 Conflict` ve `422 Unprocessable Entity` gerçek kullanıcı durumları olarak gösterilir.

2. **Dashboard metrikleri frontend’de hesaplanmayacak.** Servisler aggregate endpoint döndürür; frontend yalnızca görselleştirir.

3. **Route guard güvenlik değildir.** Menü ve route’ları role göre gizleriz ancak gerçek authorization her zaman Gateway ve servistedir.

4. **Loading/error/empty state sonradan eklenmeyecek.** Her query kullanan ekran bu üç durumu ilk implementasyondan itibaren taşır.

## Nihai kararım

> **React + TypeScript + Vite kararını koruyalım; ancak frontend’i TanStack Router, TanStack Query, OpenAPI tabanlı typed client, Tailwind 4, shadcn/ui, React Hook Form, Zod, TanStack Table, Recharts, SSE ve Playwright ile tamamlanmış bir mimariye çevirelim.**

Çıkarmamız gerekenler:

```text
Next.js
Redux Toolkit
Başlangıçta Zustand
Axios
MUI / Ant Design
Microfrontend
Nx / Turborepo
Frontend BFF olarak ayrı Node.js sunucusu
JWT localStorage
Elle yazılmış API DTO’ları
```

Bir sonraki mimari dokümanın adı **`docs/ADR/ADR-00X-FRONTEND-ARCHITECTURE.md`** olmalı ve önceki genel “React + TypeScript + Vite” kararını bu ayrıntılı kararla değiştirmeli.

[1]: https://react.dev/learn/creating-a-react-app?utm_source=chatgpt.com 'Creating a React App – React'
[2]: https://tanstack.com/router/latest/docs/framework/react/guide/search-params?utm_source=chatgpt.com 'Search Params | TanStack Router React Docs'
[3]: https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults?utm_source=chatgpt.com 'Important Defaults | TanStack Query React Docs'
[4]: https://openapi-ts.dev/openapi-fetch/?utm_source=chatgpt.com 'openapi-fetch | OpenAPI TypeScript'
[5]: https://tailwindcss.com/docs/installation/using-vite?rewritestatus=3&utm_source=chatgpt.com 'Installing Tailwind CSS with Vite - Tailwind CSS'
[6]: https://ui.shadcn.com/docs/changelog/2026-01-base-ui?utm_source=chatgpt.com 'January 2026 - Base UI Documentation - shadcn/ui'
[7]: https://zod.dev/?utm_source=chatgpt.com 'Intro | Zod'
[8]: https://tanstack.com/table/latest/docs/overview?utm_source=chatgpt.com 'Overview | TanStack Table Docs'
[9]: https://recharts.org/?utm_source=chatgpt.com 'Recharts'
[10]: https://github.com/whatwg/html/issues/2177?utm_source=chatgpt.com 'Setting headers for EventSource · Issue #2177 · whatwg/html · GitHub'
