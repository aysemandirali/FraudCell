# Backend Completion Plan

Bu dokuman, `docs/00-START-HERE.md` ile baslayan hedef mimariyi mevcut repo
durumuyla eslestiren calisma planidir. Amac backend'i frontend'in gercek API ile
calisabilecegi, demo edilebilir ve docs ile uyumlu hale getirmektir.

## Mevcut Durum

Calisan Docker parcasi:

- Edge Gateway: Docker'da calisiyor, public API girisi `http://localhost:8080`.
- Identity Service: Docker'da calisiyor, health endpointleri mevcut.
- Transaction Service: Docker'da calisiyor, health endpointleri mevcut.
- Gamification Service: Docker'da calisiyor, health endpointleri mevcut.
- PostgreSQL: Identity, Transaction ve Gamification icin ayri DB containerlari mevcut.
- RabbitMQ: Docker'da calisiyor.
- Local scriptler: `scripts/start-backend.bat`, `scripts/status.bat`, `scripts/rebuild-backend.bat` mevcut.

Docs'a gore eksik kalan final parcasi:

- Python/FastAPI AI Service kodu var, fakat Docker Compose'a servis olarak bagli
  degil.
- AI icin ayri PostgreSQL containeri ve compose health kontrolu yok.
- Uctan uca transaction -> AI -> case -> gamification -> notification akisi
  otomatik olarak dogrulanmiyor.
- Gateway uzerinden smoke otomasyonu var; auth, OTP, refresh ve transaction
  idempotency kontrol ediliyor.
- Notification/SSE relay henuz gateway uzerinden yok.

## Faz 0 - Docker Tabanini Stabilize Et

Durum: Tamamlandi.

Kontrol:

- `docker compose up -d --build` calisiyor.
- Identity, Transaction ve Gamification `Healthy` donuyor.
- PostgreSQL volume mount sorunu giderildi.
- Outbox SQL schema sorunu giderildi.
- EF SQL log gurultusu azaltildi.
- Baslatma/durdurma/status scriptleri eklendi.

## Faz 1 - Backend Kontratini ve Smoke Kontrolunu Sabitle

Durum: Tamamlandi.

Yapilacaklar:

- Endpoint envanterini docs ile eslestir.
- Frontend icin gecici servis portlarini ve final gateway portunu netlestir.
- Development admin girisini smoke testine ekle.
- Identity tokeninin Transaction ve Gamification tarafinda dogrulandigini kontrol et.
- Faz kapatma kriterini tek komuta indir: `scripts/smoke-backend.bat`.

Kapanis kriteri:

- `scripts/start-backend.bat` servisleri ayaga kaldirir.
- `scripts/smoke-backend.bat` health, admin login, `/auth/me`, Transaction auth
  ve Gamification auth kontrollerini basariyla gecer.

## Faz 2 - Edge Gateway Ekle

Durum: Tamamlandi.

Yapilacaklar:

- `FraudCell.Edge.Gateway` ASP.NET Core/YARP projesi olustur.
- Gateway'i `FraudCell.sln` icine ekle.
- Dockerfile ekle.
- Compose'a `edge-gateway` servisini ekle.
- Sadece gateway public port acsin: `127.0.0.1:8080:8080`.
- Route'lar:
  - `/api/v1/auth/*` -> Identity
  - `/api/v1/staff/*` -> Identity
  - `/api/v1/reference/*` -> Identity
  - `/api/v1/audit-logs*` -> Identity
  - `/api/v1/transactions*` -> Transaction
  - `/api/v1/cases*` -> Transaction
  - `/api/v1/customer/verifications*` -> Transaction
  - `/api/v1/game/*` -> Gamification
  - `/api/v1/ai/*` -> AI eklendikten sonra AI
- JWT validation, correlation id, forwarded headers ve rate limit ekle.
- Gateway hazir olunca smoke scriptini `8080` uzerinden calisacak sekilde genislet.

Kapanis kriteri:

- Frontend `VITE_GATEWAY_URL=http://localhost:8080` ile gercek API'ye baglanabilir.
- Servis portlari final modda disari acik olmak zorunda kalmaz.

## Faz 3 - Identity/Auth Akisini Sertlestir

Durum: Tamamlandi.

Yapilacaklar:

- Staff login, refresh, logout, `/auth/me` akisini test et.
- Customer OTP register/login akisini test et.
- Role bazli yetkileri smoke testine ekle.
- Admin staff create/update/role/specialty/region akisini dogrula.
- Audit eventlerinin kaydedildigini kontrol et.

Kapanis kriteri:

- Frontend login/register/session ekranlari gercek backend ile yazilabilir.

## Faz 4 - Transaction ve Case Core Akisini Bitir

Durum: Devam ediyor.

Tamamlananlar:

- Customer token ile transaction create smoke testi eklendi.
- `Idempotency-Key` replay davranisi gateway uzerinden dogrulandi.
- Transaction Service JWT validation gateway uzerinden dogrulandi.

Yapilacaklar:

- Farkli payload ile ayni `Idempotency-Key` conflict davranisini test et.
- Case list/detail/history endpointlerini dogrula.
- Start review, verification request/response, decision akisini dogrula.
- Kritik mutate endpointlerde ETag/If-Match davranisini test et.

Kapanis kriteri:

- AI olmasa bile transaction/case ekranlari frontend tarafinda gercek API ile
  gelistirilebilir.

## Faz 5 - AI Service'i Docker Sistemine Bagla

Durum: Bekliyor.

Yapilacaklar:

- AI Service icin Dockerfile ekle.
- AI icin PostgreSQL container ve volume ekle.
- Compose'a `ai-service` ve `ai-db` ekle.
- AI health endpointlerini compose healthcheck'e bagla.
- Model bootstrap ve migration akisini container icinde dogrula.
- RabbitMQ consume: transaction created.
- RabbitMQ publish: AI assessment completed/failed.
- Transaction Service'in AI sonucunu alip case urettigini dogrula.

Kapanis kriteri:

- Transaction create sonrasinda AI assessment ve case olusumu otomatik ilerler.

## Faz 6 - Gamification Event Zincirini Bitir

Durum: Bekliyor.

Yapilacaklar:

- Case decision eventinden points/profile update akisini dogrula.
- Badge ve leaderboard hesaplarini test et.
- Duplicate event idempotency testi ekle.
- Gamification down/up recovery senaryosunu dogrula.

Kapanis kriteri:

- Analyst kararindan sonra gamification ekranlari gercek veriyle beslenir.

## Faz 7 - Notification/SSE

Durum: Bekliyor.

Yapilacaklar:

- Gateway uzerinden notification stream endpointi ekle.
- Event consumer ile user notification eventlerini gateway'e tasima modelini kur.
- Frontend icin SSE kontratini sabitle.

Kapanis kriteri:

- Frontend canli bildirimleri gateway uzerinden alabilir.

## Faz 8 - Final Demo ve Recovery Testleri

Durum: Bekliyor.

Yapilacaklar:

- Tek komut demo flow scripti ekle.
- AI down/up recovery testi.
- RabbitMQ down/up outbox recovery testi.
- Gamification down/up recovery testi.
- OpenAPI/export veya endpoint matrix dokumanini guncelle.
- Frontend `.env` live mode ayarlarini dogrula.

Kapanis kriteri:

- Backend tek komutla ayaga kalkar, smoke testten gecer ve docs'taki final
  demo senaryolari calisir.

## Frontend'e Ne Zaman Baslanmali?

- Mock frontend: hemen baslanabilir.
- Gercek auth frontend: Faz 2 + Faz 3 bittikten sonra.
- Transaction/case frontend: Faz 4 bittikten sonra.
- AI/gamification ekranlari: Faz 5 + Faz 6 bittikten sonra.
