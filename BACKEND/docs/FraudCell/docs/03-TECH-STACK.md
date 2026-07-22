# FraudCell — Teknoloji Yığını ve Teknik Standartlar

**Doküman:** `03-TECH-STACK.md`
**Durum:** Accepted — Architecture Baseline v1.0
**Sistem:** FraudCell — Turkcell Gerçek Zamanlı Dolandırıcılık Tespit Platformu
**Son güncelleme:** YYYY-MM-DD
**Karar sahibi:** FraudCell Takımı
**İlgili dokümanlar:**

- `00-START-HERE.md`
- `01-REQUIREMENTS-TRACEABILITY.md`
- `02-ARCHITECTURE-OVERVIEW.md`
- `04-SERVICE-BOUNDARIES.md`
- `05-DOMAIN-AND-STATE-MACHINE.md`
- `06-DATA-ARCHITECTURE.md`
- `07-API-DESIGN.md`
- `08-EVENT-DRIVEN-ARCHITECTURE.md`
- `09-IDENTITY-SECURITY-AND-AUDIT.md`
- `10-AI-SERVICE-DESIGN.md`
- `11-GAMIFICATION-DESIGN.md`
- `12-RESILIENCE-AND-OBSERVABILITY.md`
- `13-DOCKER-COMPOSE-AND-OPERATIONS.md`
- `14-TEST-STRATEGY.md`
- `15-DEMO-AND-JURY-DEFENSE.md`
- `16-IMPLEMENTATION-ROADMAP-AND-DOD.md`

---

# 1. Dokümanın Amacı

Bu doküman FraudCell sisteminde kullanılacak programlama dillerini, framework’leri, veritabanlarını, mesajlaşma altyapısını, frontend araçlarını, test teknolojilerini, container image’larını ve dependency yönetimi standartlarını kesinleştirir.

Bu dokümanın amacı yalnızca bir teknoloji listesi oluşturmak değildir.

Her seçim için aşağıdaki sorular cevaplanır:

- Bu teknoloji hangi problemi çözüyor?
- Neden diğer alternatiflerden daha uygundur?
- Sisteme hangi riskleri ekler?
- Demo sırasında nasıl davranır?
- Hangi sürüm hattı kullanılacaktır?
- Dependency’ler nasıl sabitlenecektir?
- Hangi teknolojiler bilinçli olarak kullanılmayacaktır?
- Geliştirme ve CI ortamları nasıl aynı tutulacaktır?
- Lisans, güvenlik ve bakım riskleri nasıl yönetilecektir?

Bu dokümanda `Accepted` olarak işaretlenmiş kararlar mimari baseline’ın parçasıdır.

Bir teknoloji değişikliği yalnızca aşağıdaki koşullarda yapılabilir:

1. Seçilen teknoloji zorunlu gereksinimi karşılamıyorsa
2. Kritik güvenlik veya lisans problemi ortaya çıkarsa
3. Docker Compose veya CI ortamında kararlı çalışmıyorsa
4. Alternatif teknoloji somut şekilde daha düşük risk ve daha yüksek doğrulanabilirlik sağlıyorsa
5. Değişiklik ADR ile belgeleniyorsa

---

# 2. Teknoloji Seçim Prensipleri

FraudCell teknoloji kararları aşağıdaki sırayla değerlendirilir:

1. Zorunlu case gereksinimlerini karşılaması
2. Diskalifiye riskini azaltması
3. Canlı demo güvenilirliği
4. Güvenlik özellikleri
5. Hata sonrası toparlanabilirlik
6. Test edilebilirlik
7. Açıklanabilirlik
8. Operasyonel sadelik
9. Geliştirme hızı
10. Görsel veya teknolojik popülerlik

Bir teknoloji yalnızca “modern”, “havalı” veya “kurumsal” olduğu için sisteme eklenmeyecektir.

Temel karar ilkesi:

> En iyi teknoloji, mevcut gereksinimi en düşük operasyonel riskle karşılayan ve davranışı test veya demo ile kanıtlanabilen teknolojidir.

---

# 3. Nihai Teknoloji Yığını

| Katman                    | Nihai Seçim                            | Sürüm Hattı                           |
| ------------------------- | -------------------------------------- | ------------------------------------- |
| Ana backend runtime       | .NET                                   | `10.x LTS`                            |
| Backend dili              | C#                                     | `.NET 10 ile gelen sürüm`             |
| Edge/API Gateway          | ASP.NET Core + YARP                    | `.NET 10 uyumlu kararlı sürüm`        |
| Identity Service          | ASP.NET Core                           | `10.x`                                |
| Transaction Service       | ASP.NET Core                           | `10.x`                                |
| Gamification Service      | ASP.NET Core                           | `10.x`                                |
| .NET ORM                  | Entity Framework Core                  | `10.x`                                |
| PostgreSQL driver         | Npgsql                                 | `EF Core 10 uyumlu sürüm`             |
| AI runtime                | Python                                 | `3.13.x`                              |
| AI API framework          | FastAPI                                | `lock dosyasında sabit sürüm`         |
| AI ORM                    | SQLAlchemy                             | `2.x`                                 |
| AI migration              | Alembic                                | `lock dosyasında sabit sürüm`         |
| AI validation             | Pydantic                               | `2.x`                                 |
| AI modeli                 | scikit-learn                           | `1.9.x`                               |
| AI artifact               | joblib                                 | `lock dosyasında sabit sürüm`         |
| Veritabanı                | PostgreSQL                             | `18.x`                                |
| Event broker              | RabbitMQ                               | `4.3.x`                               |
| .NET RabbitMQ istemcisi   | RabbitMQ.Client                        | `RabbitMQ 4.3 uyumlu sürüm`           |
| Python RabbitMQ istemcisi | aio-pika                               | `lock dosyasında sabit sürüm`         |
| Frontend                  | React                                  | `19.x`                                |
| Frontend dili             | TypeScript                             | `5.x`                                 |
| Frontend build aracı      | Vite                                   | `lock dosyasında sabit kararlı sürüm` |
| Frontend build runtime    | Node.js                                | `24.x LTS`                            |
| Server state              | TanStack Query                         | `lock dosyasında sabit sürüm`         |
| Form yönetimi             | React Hook Form                        | `lock dosyasında sabit sürüm`         |
| Frontend schema           | Zod                                    | `lock dosyasında sabit sürüm`         |
| Grafikler                 | Recharts                               | `lock dosyasında sabit sürüm`         |
| CSS                       | Tailwind CSS                           | `lock dosyasında sabit sürüm`         |
| UI primitive              | Radix UI                               | `lock dosyasında sabit sürüm`         |
| Gerçek zamanlı bildirim   | Server-Sent Events                     | HTTP standardı                        |
| SSE istemcisi             | Fetch tabanlı SSE client               | Authorization header destekli         |
| API sözleşmesi            | OpenAPI                                | `3.x`                                 |
| Event sözleşmesi          | AsyncAPI + JSON Schema                 | Versioned                             |
| .NET test                 | xUnit                                  | Sabit sürüm                           |
| .NET integration test     | WebApplicationFactory + Testcontainers | Sabit sürüm                           |
| Python test               | Pytest                                 | Sabit sürüm                           |
| Frontend unit test        | Vitest + Testing Library               | Sabit sürüm                           |
| Frontend E2E              | Playwright                             | Sabit sürüm                           |
| CI/CD                     | GitHub Actions                         | Workflow SHA/tag sabit                |
| Container                 | Docker                                 | Güncel kararlı engine                 |
| Orchestration             | Docker Compose                         | Compose v2                            |
| Repository                | Git monorepo                           | Tek repository                        |
| Loglama                   | Structured JSON logging                | Platform-native                       |
| Correlation               | HTTP header + event envelope           | Zorunlu                               |
| CI image registry         | GitHub Container Registry              | Tag/digest bazlı                      |

---

# 4. Sürüm Sabitleme Politikası

## 4.1 Temel Kural

Hiçbir production veya demo dependency’si floating sürümle kullanılmayacaktır.

Aşağıdaki kullanımlar yasaktır:

```text
latest
*
>= herhangi-bir-sürüm
main
master
nightly
preview
rc
canary
```

İstisna yalnızca ayrı bir deney branch’inde yapılabilir.

## 4.2 Major Sürüm ve Patch Sürümü Ayrımı

Mimari dokümanda major sürüm hattı belirtilir:

```text
.NET 10.x
PostgreSQL 18.x
RabbitMQ 4.3.x
Python 3.13.x
React 19.x
Node.js 24.x
```

Repository içinde ise tam sürüm sabitlenir:

```text
10.0.x
18.x.y
4.3.x
3.13.x
19.x.y
24.x.y
```

Finalden önce kullanılan tam sürümler aşağıdaki dosyalarda bulunmalıdır:

```text
global.json
Directory.Packages.props
packages.lock.json
pyproject.toml
uv.lock
package.json
package-lock.json
compose.yml
Dockerfile
```

## 4.3 Docker Image Sabitleme

Development başlangıcında patch tag kullanılabilir.

Final freeze sonrasında image digest sabitlenmelidir.

Örnek:

```yaml
image: postgres:18.4
```

Finale yaklaşırken:

```yaml
image: postgres:18.4@sha256:...
```

şeklinde digest pinning yapılabilir.

## 4.4 Patch Güncelleme Politikası

Patch sürümleri:

- Güvenlik açığı gideriyorsa değerlendirilir.
- Önce CI ortamında çalıştırılır.
- Integration ve Compose smoke testleri geçmeden kabul edilmez.
- Finalden 48 saat önce dependency freeze uygulanır.
- Freeze sonrası yalnızca kritik güvenlik veya build problemi için güncelleme yapılır.

---

# 5. Ana Backend Runtime: .NET 10

## 5.1 Karar

Identity, Transaction ve Gamification servisleri ASP.NET Core üzerinde geliştirilecektir.

Edge Gateway de ASP.NET Core kullanacaktır.

Ana runtime:

```text
.NET 10 LTS
```

## 5.2 .NET Seçilme Nedenleri

FraudCell backend’i basit CRUD işlemlerinden oluşmamaktadır.

Sistemde aşağıdaki ihtiyaçlar bulunmaktadır:

- JWT doğrulama
- Policy-based authorization
- Resource-based authorization
- Account lockout
- Rate limiting
- State machine invariant’ları
- Optimistic concurrency
- Background worker’lar
- Transactional outbox
- RabbitMQ consumer’ları
- Database transaction yönetimi
- Health check
- Structured logging
- OpenAPI
- Dependency injection
- Resilient HTTP client
- Docker uyumluluğu

ASP.NET Core bu ihtiyaçların büyük kısmını platform seviyesinde sağlamaktadır.

Bu nedenle ana backend runtime için farklı framework’leri bir araya getirmek yerine tek, güçlü ve tutarlı bir platform kullanılacaktır.

## 5.3 Kullanılacak ASP.NET Core Özellikleri

- Dependency Injection
- Authentication middleware
- Authorization policies
- Resource-based authorization handlers
- Rate limiting middleware
- Health checks
- BackgroundService
- TimeProvider
- HttpClientFactory
- Resilience pipelines
- OpenAPI generation
- Problem/error handling middleware
- Request size limits
- JSON serialization
- Static file hosting
- Response compression
- Forwarded headers
- Configuration binding
- Options validation

## 5.4 API Stili

.NET servislerinde:

```text
ASP.NET Core Minimal APIs
+
Feature endpoint modules
```

kullanılacaktır.

Bütün endpoint’ler `Program.cs` içine yazılmayacaktır.

Örnek:

```text
Features/
└── Cases/
    └── SubmitDecision/
        ├── Endpoint.cs
        ├── Request.cs
        ├── Response.cs
        ├── Handler.cs
        └── Validator.cs
```

Endpoint yalnızca aşağıdaki görevleri yapmalıdır:

1. HTTP request’i almak
2. Authentication context’i okumak
3. Request modelini doğrulamak
4. Use-case handler çağırmak
5. Sonucu standart HTTP response’a çevirmek

Business logic endpoint içinde yazılmayacaktır.

---

# 6. C# Kod Standartları

## 6.1 Nullable Reference Types

Bütün projelerde:

```xml
<Nullable>enable</Nullable>
```

etkin olacaktır.

Nullability warning’leri görmezden gelinmeyecektir.

## 6.2 Implicit Usings

```xml
<ImplicitUsings>enable</ImplicitUsings>
```

kullanılabilir.

Ancak namespace çakışması veya okunabilirlik problemi oluşursa açık `using` tercih edilir.

## 6.3 Warnings as Errors

CI ortamında:

```xml
<TreatWarningsAsErrors>true</TreatWarningsAsErrors>
```

uygulanacaktır.

Local development sırasında kontrollü istisna tanımlanabilir; ancak `main` branch build’i warning ile geçmemelidir.

## 6.4 Built-in Analyzers

.NET analyzers etkin olacaktır.

Ek olarak:

- `.editorconfig`
- `dotnet format`
- Naming convention
- Async method kontrolleri
- CancellationToken kullanımı
- Disposal kontrolleri

uygulanacaktır.

## 6.5 Async Kullanımı

I/O operasyonları async olacaktır:

- Database sorguları
- HTTP çağrıları
- RabbitMQ işlemleri
- Dosya erişimi
- Stream response
- SSE bağlantıları

Async metotlarda mümkün olduğu sürece `CancellationToken` taşınacaktır.

## 6.6 Yasaklanan C# Kalıpları

Aşağıdaki kalıplar kullanılmayacaktır:

- `.Result`
- `.Wait()`
- `async void`
- Controller/endpoint içinde business logic
- Generic repository
- Her entity için anlamsız repository
- Service locator
- Static mutable global state
- Catch edip hiçbir şey yapmayan exception blokları
- String birleştirmeyle SQL üretimi
- Domain state’ini doğrudan setter ile değiştirme
- Reflection tabanlı gereksiz magic mapping
- Gereksiz inheritance hierarchy

---

# 7. Edge Gateway: ASP.NET Core + YARP

## 7.1 Karar

FraudCell Edge aşağıdaki teknolojilerle geliştirilecektir:

```text
ASP.NET Core 10
YARP Reverse Proxy
```

## 7.2 Edge Sorumlulukları

Edge aşağıdakileri yapar:

- React static dosyalarını sunar.
- API route’larını servislerle eşler.
- JWT access token doğrular.
- Route seviyesinde role policy uygular.
- Rate limiting uygular.
- Security header ekler.
- Request body sınırı uygular.
- Correlation ID yönetir.
- Forwarded header’ları güvenli işler.
- SSE bağlantılarını yönetir.
- Standart edge-level hata cevabı üretir.
- İç servislerin dışarıdan erişimini gizler.

## 7.3 Edge İçinde Bulunmayacaklar

Gateway içinde aşağıdakiler bulunmayacaktır:

- Transaction business logic
- Risk hesaplama
- State transition
- Analyst assignment
- Gamification kuralı
- Database join
- Dashboard business aggregation
- User password logic
- Refresh token persistence
- AI modeli

## 7.4 YARP Seçilme Nedenleri

YARP:

- ASP.NET Core ile aynı runtime üzerinde çalışır.
- JWT ve authorization middleware ile doğal şekilde bütünleşir.
- Ek bir gateway container teknolojisi gerektirmez.
- Configuration tabanlı routing sağlar.
- Custom transform ve middleware kullanımına izin verir.
- Correlation ve security header yönetimini kolaylaştırır.
- Demo ortamında Kong veya benzeri harici gateway’e göre daha az hareketli parça oluşturur.

## 7.5 Kong Kullanılmama Nedeni

Kong güçlü bir gateway’dir ancak bu projede:

- Ayrı database veya declarative config yönetimi
- Ek container
- Ek plugin davranışları
- Ayrı log ve health yüzeyi
- Daha karmaşık debugging

oluşturur.

YARP case gereksinimini daha düşük operasyonel riskle karşılamaktadır.

---

# 8. Identity Service Teknolojileri

## 8.1 Temel Stack

```text
ASP.NET Core 10
ASP.NET Core Identity
Entity Framework Core 10
Npgsql
PostgreSQL 18
RabbitMQ.Client
Argon2id password hasher
RSA JWT signing
```

## 8.2 ASP.NET Core Identity Kullanımı

ASP.NET Core Identity aşağıdaki alanlarda kullanılacaktır:

- Kullanıcı persistence altyapısı
- Role yönetimi
- Password validation entegrasyonu
- Account lockout altyapısı
- Security stamp
- UserManager
- RoleManager

Ancak sistem tamamen varsayılan Identity davranışına bırakılmayacaktır.

Custom geliştirilecek alanlar:

- GSM + OTP authentication
- Personel e-posta + şifre akışı
- Argon2id password hashing
- JWT üretimi
- Refresh token family
- Refresh token rotation
- Reuse detection
- Session revocation
- Uzmanlık ve bölge claim’leri
- Audit event üretimi

## 8.3 Argon2id

Şifre hash algoritması:

```text
Argon2id
```

olacaktır.

Kullanılacak parametreler güvenlik dokümanında tanımlanacaktır:

- Memory cost
- Iteration count
- Parallelism
- Salt length
- Hash length

Hash parametreleri veritabanında hash formatıyla birlikte saklanmalıdır.

Parametreler gelecekte artırıldığında eski kullanıcıların şifreleri başarılı login sonrasında rehash edilebilir.

## 8.4 JWT

Access token:

- RSA ile imzalanır.
- 15 dakika geçerlidir.
- Identity Service private key kullanır.
- Gateway ve servisler public key kullanır.
- `iss`, `aud`, `exp`, `nbf`, `jti`, `sub` doğrulanır.
- İzin verilen algoritma açıkça sabitlenir.

## 8.5 Refresh Token

Refresh token:

- Kriptografik olarak güvenli random veri olur.
- Veritabanında plaintext tutulmaz.
- Yalnızca hash’i saklanır.
- 7 gün geçerlidir.
- Her kullanımda rotate edilir.
- Token family ile takip edilir.
- Reuse durumunda bütün family revoke edilir.

---

# 9. Transaction Service Teknolojileri

## 9.1 Temel Stack

```text
ASP.NET Core 10
Entity Framework Core 10
Npgsql
PostgreSQL 18
RabbitMQ.Client
BackgroundService
TimeProvider
```

## 9.2 Transaction Service İçinde Kullanılacak Özellikler

- Transaction creation
- Idempotency key persistence
- Risk case aggregate
- State machine
- Optimistic concurrency
- Assignment capacity control
- Customer verification
- SLA calculation
- Assessment Watchdog
- SLA Breach Worker
- Case Closure Worker
- Outbox Publisher
- Inbox Consumer
- Audit event producer

## 9.3 Entity Framework Core Kullanımı

EF Core aşağıdaki işler için kullanılacaktır:

- Entity mapping
- Migration
- Transaction yönetimi
- Optimistic concurrency
- Relationship mapping
- Unique constraint
- Check constraint
- Query filtering
- Projection
- Raw SQL gerektiğinde güvenli parametreleme

## 9.4 Generic Repository Kullanılmayacak

EF Core `DbContext` zaten unit-of-work ve repository benzeri davranış sunmaktadır.

Aşağıdaki yapı oluşturulmayacaktır:

```text
IGenericRepository<T>
GenericRepository<T>
BaseService<T>
CrudService<T>
```

Feature handler’lar:

- Doğrudan kendi `DbContext`’ini kullanabilir.
- Gerekirse aggregate’e özel repository oluşturabilir.
- Query ve command için farklı projection kullanabilir.

Repository yalnızca anlamlı domain sınırı sağlıyorsa oluşturulur.

## 9.5 Concurrency

Case ve assignment tablolarında optimistic concurrency kullanılacaktır.

Eşzamanlı kritik işlemlerde gerektiğinde PostgreSQL row lock kullanılabilir.

Örnekler:

- Aynı case’e iki karar
- Aynı analiste aynı anda iki assignment
- Aynı feedback’in iki kere verilmesi
- Aynı idempotency key’in paralel kullanılması

---

# 10. Gamification Service Teknolojileri

## 10.1 Temel Stack

```text
ASP.NET Core 10
Entity Framework Core 10
Npgsql
PostgreSQL 18
RabbitMQ.Client
BackgroundService
```

## 10.2 Temel Veri Modeli

Gamification puanı yalnızca mutable bir `total_points` alanı olarak saklanmayacaktır.

Ana yapı:

```text
Immutable Point Ledger
+
Materialized Score Projection
```

Ledger:

```text
point_ledger
```

Projection:

```text
analyst_score_summary
daily_leaderboard
weekly_leaderboard
```

## 10.3 PostgreSQL ile Leaderboard

İlk sürümde leaderboard için Redis kullanılmayacaktır.

PostgreSQL aşağıdaki ihtiyaçları karşılayabilir:

- Günlük aggregate
- Haftalık aggregate
- Top 10 sıralama
- Window functions
- Indexed date ranges
- Analyst profile metrics

Redis ancak ölçülmüş performans problemi oluşursa değerlendirilir.

## 10.4 Background Worker’lar

Gamification Service içinde:

- Case event consumer
- Point rule evaluator
- Badge evaluator
- Outbox publisher
- Leaderboard projection updater
- Aggregate maintenance worker

bulunacaktır.

---

# 11. AI Runtime: Python 3.13

## 11.1 Karar

AI Service:

```text
Python 3.13
FastAPI
scikit-learn
```

üzerinde geliştirilecektir.

## 11.2 Python 3.13 Seçilme Nedeni

En yeni feature release’i zorunlu olarak seçmek yerine ML dependency uyumluluğu ve binary wheel kararlılığı önceliklendirilmiştir.

Python 3.13:

- Aktif bakım hattındadır.
- scikit-learn ve temel bilimsel paketlerle uyumludur.
- Docker slim image ile çalışabilir.
- Yeni fakat yeterince olgun bir runtime sunar.

Python 3.14 veya daha yeni sürüme yalnızca bütün ML ve database dependency’leri CI ortamında doğrulandıktan sonra geçilebilir.

## 11.3 Python Kod Standartları

- Type hint zorunlu
- Pydantic v2 model kullanımı
- `ruff` lint ve format
- `mypy` type checking
- `pytest`
- UTC-aware datetime
- Explicit dependency injection
- Global mutable state kullanılmaması
- Model artifact’ın startup sırasında doğrulanması
- Structured JSON logging
- Correlation ID propagation

## 11.4 Python Package Yönetimi

Python package yönetimi:

```text
uv
+
pyproject.toml
+
uv.lock
```

üzerinden yapılacaktır.

Kurulum:

```bash
uv sync --frozen
```

CI ve Docker build sırasında lock dosyası dışına çıkılmayacaktır.

---

# 12. AI API: FastAPI

## 12.1 FastAPI Sorumlulukları

FastAPI:

- Health endpoint’leri
- Internal inference endpoint’i
- Model metadata endpoint’i
- AI metric endpoint’leri
- OpenAPI üretimi
- Request/response schema doğrulaması
- Internal diagnostic endpoint’leri

için kullanılacaktır.

Ana transaction değerlendirme akışı HTTP değil RabbitMQ consumer üzerinden çalışır.

## 12.2 FastAPI Seçilme Nedenleri

- Pydantic ile güçlü schema validation
- Otomatik OpenAPI üretimi
- Python ML ekosistemiyle doğal bütünleşme
- Düşük framework ağırlığı
- Container içinde kolay çalıştırma
- Async endpoint ve lifecycle desteği

## 12.3 Inference ve Event Consumer Ayrımı

Aynı AI Service image’ı aşağıdaki modlarda çalışabilir:

```text
api
worker
migrate
train
evaluate
```

İlk sürümde API ve worker aynı process/container içinde çalışabilir.

Gerekirse daha sonra aynı image’dan iki ayrı container çalıştırılabilir:

```text
ai-api
ai-worker
```

Ancak başlangıçta gereksiz container bölünmesi yapılmayacaktır.

---

# 13. AI Veri ve ORM Katmanı

## 13.1 SQLAlchemy

AI Service veritabanı erişimi için:

```text
SQLAlchemy 2.x
```

kullanacaktır.

## 13.2 PostgreSQL Driver

Python PostgreSQL driver’ı:

```text
psycopg 3
```

olacaktır.

## 13.3 Migration

Migration aracı:

```text
Alembic
```

olacaktır.

Migration dosyaları source control içinde tutulacaktır.

AI Service startup sırasında sessizce schema üretmeyecektir.

## 13.4 Saklanacak AI Verileri

- Prediction
- Model version
- Feature snapshot
- Risk score
- Fraud type
- Reason codes
- Override feedback
- Analyst projection
- Accuracy aggregate
- Training metadata
- Dataset version
- Model checksum

---

# 14. Makine Öğrenmesi Stack’i

## 14.1 Temel Paketler

Training ortamında:

```text
scikit-learn
pandas
numpy
joblib
```

kullanılacaktır.

Runtime image’da yalnızca inference için gereken paketler bulunacaktır.

## 14.2 Risk Modeli

Başlangıç modeli:

```text
HistGradientBoostingClassifier
+
CalibratedClassifierCV
```

Amaç:

- Fraud probability üretmek
- `0.40` ve `0.90` threshold’larında kullanılabilir skor sağlamak
- Tabular feature’larda güçlü baseline üretmek

## 14.3 Fraud-Type Modeli

Başlangıç modeli:

```text
RandomForestClassifier
```

Sınıflar:

```text
CALINTI_KART
HESAP_ELE_GECIRME
PARA_AKLAMA
SUPHELI_DAVRANIS
TEMIZ
```

## 14.4 Model Artifact

Model artifact:

```text
joblib
```

ile saklanacaktır.

Kurallar:

- Yalnızca takım tarafından üretilmiş artifact yüklenir.
- Kullanıcıdan gelen artifact yüklenmez.
- Artifact image içine build sırasında alınır.
- SHA-256 checksum saklanır.
- Model metadata ile checksum eşleştirilir.
- Model yüklenemiyorsa AI readiness başarısız olur.
- Training API startup sırasında çalışmaz.

## 14.5 MLflow Kullanılmayacak

MLflow güçlü bir deney takip aracıdır ancak:

- Ek servis
- Ek database/storage
- Ek UI
- Ek container
- Ek demo yüzeyi

oluşturur.

FraudCell için model metadata PostgreSQL ve repository içindeki raporlarla takip edilecektir.

---

# 15. Veritabanı: PostgreSQL 18

## 15.1 Karar

Her business servisi ayrı PostgreSQL 18 container’ına sahip olacaktır.

```text
identity-db
transaction-db
ai-db
gamification-db
```

## 15.2 PostgreSQL Seçilme Nedenleri

FraudCell verileri ağırlıklı olarak ilişkiseldir:

- Kullanıcı ve rol
- Refresh token family
- Transaction
- Risk case
- State transition
- Assignment
- SLA
- Point ledger
- Badge
- Prediction
- Accuracy metrics

PostgreSQL aşağıdaki özellikleri sağlamaktadır:

- ACID transaction
- Unique constraint
- Foreign key
- Check constraint
- Index
- Partial index
- Row-level locking
- JSONB
- Window function
- Aggregate query
- Transaction isolation
- Timestamp with timezone
- Native UUID benzeri kimlik desteği

## 15.3 Dört Ayrı Container Kararı

Tek PostgreSQL container içinde dört database veya schema kullanılmayacaktır.

Her servis için:

- Ayrı container
- Ayrı user
- Ayrı password
- Ayrı volume
- Ayrı network
- Ayrı migration
- Ayrı connection string

bulunacaktır.

Bu karar diskalifiye riskini azaltmak ve database-per-service sınırını fiziksel olarak kanıtlamak için verilmiştir.

## 15.4 PostgreSQL Alpine Kullanılmayacak

Database için Debian tabanlı standart PostgreSQL image tercih edilecektir.

Nedenleri:

- Daha öngörülebilir debugging
- Daha geniş araç uyumluluğu
- Demo sırasında shell ve diagnostic kolaylığı
- Alpine/musl kaynaklı sürprizleri azaltmak

Image boyutu, demo güvenilirliğinden daha yüksek önceliğe sahip değildir.

## 15.5 Database Naming

Örnek:

```text
fraudcell_identity
fraudcell_transaction
fraudcell_ai
fraudcell_gamification
```

Runtime database user’ları:

```text
identity_app
transaction_app
ai_app
gamification_app
```

olarak ayrılacaktır.

---

# 16. Mesajlaşma: RabbitMQ 4.3

## 16.1 Karar

Servisler arası asenkron business event iletişimi:

```text
RabbitMQ 4.3
```

üzerinden sağlanacaktır.

## 16.2 RabbitMQ Seçilme Nedenleri

FraudCell aşağıdaki mesajlaşma özelliklerine ihtiyaç duyar:

- Durable queue
- Topic routing
- Manual acknowledgement
- Publisher confirm
- Retry
- Dead-letter queue
- Consumer isolation
- Docker Compose kolaylığı
- .NET ve Python istemci desteği
- Management UI
- Düşük operasyonel maliyet

RabbitMQ bu ihtiyaçları doğrudan karşılamaktadır.

## 16.3 Ana Exchange

```text
fraudcell.events
```

Özellikler:

```text
type: topic
durable: true
auto-delete: false
```

## 16.4 Queue Tipi

Başlangıçta durable classic queue kullanılacaktır.

Quorum queue yalnızca somut ihtiyaç veya mimari karar sonrasında değerlendirilir.

Tek node demo ortamında quorum queue ek dayanıklılık sağlamaz; yalnızca operasyonel davranışı karmaşıklaştırabilir.

## 16.5 Publisher ve Consumer Davranışı

Publisher:

- Persistent message
- Publisher confirm
- Correlation metadata
- Event version
- Outbox kaynaklı publish

Consumer:

- Manual acknowledgement
- Inbox idempotency
- Local transaction
- Retry
- Dead-letter queue
- Cancellation-safe shutdown

---

# 17. Native RabbitMQ Client Kararı

## 17.1 .NET

.NET servisleri:

```text
RabbitMQ.Client
```

kullanacaktır.

## 17.2 Python

Python AI Service:

```text
aio-pika
```

kullanacaktır.

## 17.3 MassTransit Kullanılmayacak

MassTransit veya benzeri yüksek seviyeli service bus framework’ü baseline’a eklenmeyecektir.

Nedenleri:

- Lisans/sürüm belirsizliği oluşturma riski
- Framework magic
- Jüriye event davranışını açıklama zorluğu
- Outbox/inbox davranışının görünmez hale gelmesi
- Yarışma günü external lisans anahtarı riski
- Gereksiz abstraction

Native client üzerinde ince ve açık bir messaging katmanı yazılacaktır.

Bu katman yalnızca aşağıdaki teknik işleri yapar:

- Connection management
- Channel management
- Publish confirm
- Consumer registration
- Envelope serialization
- Retry headers
- Acknowledgement
- Correlation propagation

Business event kuralları messaging katmanında bulunmaz.

---

# 18. Kafka Kullanılmama Kararı

Kafka aşağıdaki durumlarda güçlüdür:

- Çok yüksek event throughput
- Uzun süreli log retention
- Replay
- Stream processing
- Partition bazlı ölçekleme
- Büyük event platformları

FraudCell’in yarışma kapsamındaki ana problemi bunlar değildir.

Kafka’nın ekleyeceği riskler:

- Daha ağır startup
- Daha karmaşık Compose
- Topic/partition operasyonu
- Consumer group debugging
- Daha yüksek memory kullanımı
- Canlı demo sırasında daha fazla failure point

RabbitMQ gerekli puanı ve mimari davranışı daha düşük operasyonel riskle sağlar.

---

# 19. Redis Kullanılmama Kararı

Redis baseline mimariye eklenmeyecektir.

Muhtemel kullanım alanları:

- Cache
- Leaderboard
- Distributed rate limiting
- Session
- Pub/Sub

Ancak mevcut sistemde:

- Tek Edge instance vardır.
- Leaderboard ölçeği PostgreSQL için küçüktür.
- Refresh token kalıcı ve güvenlik kritik veridir.
- Event iletimi RabbitMQ tarafından sağlanır.
- Cache zorunlu değildir.

Redis yalnızca ölçülmüş performans sorunu sonrasında ADR ile eklenebilir.

---

# 20. Frontend Runtime: React + TypeScript

## 20.1 Karar

Web frontend:

```text
React 19
TypeScript 5
Vite
```

ile geliştirilecektir.

## 20.2 React Seçilme Nedenleri

- Component tabanlı yapı
- Güçlü form ve query ekosistemi
- Dashboard geliştirmeye uygunluk
- Responsive web desteği
- SSE entegrasyonu
- Büyük component ekosistemi
- TypeScript desteği

## 20.3 TypeScript Ayarları

`tsconfig` strict olacaktır.

Aşağıdaki kontroller etkinleştirilecektir:

```text
strict
noUncheckedIndexedAccess
noImplicitOverride
noFallthroughCasesInSwitch
exactOptionalPropertyTypes
```

Uygun olmayan seçenek yalnızca gerekçeli şekilde kapatılabilir.

## 20.4 Node.js

Node.js yalnızca:

- Local frontend development
- Frontend test
- Production frontend build
- AsyncAPI documentation generation

için kullanılır.

Production/demo ortamında ayrı Node.js frontend server çalıştırılmayacaktır.

React build çıktısı Edge image’ına alınacaktır.

---

# 21. Frontend Kütüphaneleri

## 21.1 Server State

```text
TanStack Query
```

kullanılacaktır.

Görevleri:

- Query cache
- Loading/error state
- Retry politikası
- Query invalidation
- Parallel dashboard queries
- Mutation state
- Stale data yönetimi

## 21.2 Routing

```text
React Router
```

kullanılacaktır.

Rol bazlı route erişimi yalnızca frontend güvenliği olarak görülmeyecektir.

Backend authorization her zaman uygulanacaktır.

## 21.3 Form Yönetimi

```text
React Hook Form
+
Zod
```

kullanılacaktır.

Frontend validation kullanıcı deneyimini iyileştirir.

Backend validation’ın yerini almaz.

## 21.4 Grafik

```text
Recharts
```

kullanılacaktır.

Kullanılacak alanlar:

- Fraud türü dağılımı
- Risk seviyesi dağılımı
- Risk trendi
- SLA uyum oranı
- AI kategori doğruluğu
- Analist performansı

## 21.5 CSS ve UI

```text
Tailwind CSS
+
Radix UI primitives
```

kullanılacaktır.

Amaç:

- Hızlı responsive tasarım
- Erişilebilir primitive’ler
- Tasarım kontrolü
- Ağır component framework bağımlılığından kaçınma

## 21.6 Global State

Redux baseline’a eklenmeyecektir.

State kategorileri:

- Server state → TanStack Query
- Form state → React Hook Form
- URL state → React Router/search params
- Küçük UI state → React state/context
- Authentication session state → sınırlı auth context

Redux ancak somut ve çözülemeyen global client-state ihtiyacı ortaya çıkarsa değerlendirilir.

---

# 22. HTTP İstemcisi

Frontend’de Axios zorunlu dependency olarak kullanılmayacaktır.

Native `fetch` üzerinde küçük ve typed bir API client oluşturulacaktır.

API client aşağıdakileri merkezi yönetir:

- Base URL
- Authorization header
- Correlation header
- JSON parsing
- Standard response envelope
- 401 handling
- Token refresh coordination
- AbortSignal
- Error mapping

Bu client business logic içermez.

---

# 23. SSE İstemci Kararı

## 23.1 Problem

Native browser `EventSource` API’si custom `Authorization` header göndermez.

FraudCell access token’ı `Authorization: Bearer` header içinde taşıdığı için standart `EventSource` tek başına yeterli değildir.

## 23.2 Karar

Fetch tabanlı SSE client kullanılacaktır.

Örnek teknoloji:

```text
@microsoft/fetch-event-source
```

veya aynı davranışı sağlayan küçük bir fetch-stream wrapper.

Bu yaklaşım:

- Authorization header gönderebilir.
- AbortController destekler.
- Reconnect politikası uygulanabilir.
- Normal HTTP authentication pipeline’ından geçer.

## 23.3 SSE ve Query Cache

SSE event geldiğinde frontend doğrudan bütün state’i event payload’dan kurmaya çalışmayacaktır.

Örnek:

```text
ai.assessment.completed
```

geldiğinde:

1. İlgili transaction query invalid edilir.
2. Güncel kaynak Transaction Service’ten tekrar alınır.
3. UI authoritative server state ile güncellenir.

Bu davranış event sırası veya eksik payload kaynaklı UI tutarsızlığını azaltır.

---

# 24. Frontend Hosting

React build çıktısı FraudCell Edge container’ında static olarak sunulur.

Multi-stage build:

```text
Node.js build stage
        ↓
React dist output
        ↓
ASP.NET Core Edge runtime image
```

Avantajları:

- Tek origin
- CORS probleminin azalması
- Same-site cookie
- Tek dış port
- Daha az container
- Daha hızlı startup
- Daha sade demo
- Daha az reverse-proxy konfigürasyonu

---

# 25. API Sözleşmeleri

## 25.1 OpenAPI

HTTP API’leri OpenAPI ile dokümante edilecektir.

Zorunlu minimum:

- Transaction Service
- AI Service

Ancak hedef bütün servislerin OpenAPI üretmesidir.

OpenAPI dosyaları CI sırasında export edilecektir:

```text
contracts/api/identity.openapi.json
contracts/api/transaction.openapi.json
contracts/api/ai.openapi.json
contracts/api/gamification.openapi.json
```

## 25.2 Yerel Dokümantasyon

API dokümantasyonu internet veya CDN gerektirmeden açılabilmelidir.

UI katmanı local static asset olarak sunulmalıdır.

OpenAPI contract, UI aracından daha önemlidir.

UI aracı değiştirilebilir; contract source of truth olarak kalır.

---

# 26. Event Sözleşmeleri

## 26.1 AsyncAPI

Event sistemi:

```text
AsyncAPI
+
JSON Schema
```

ile dokümante edilecektir.

Ana dosya:

```text
contracts/events/asyncapi.yaml
```

Event schema’ları:

```text
contracts/events/schemas/
```

altında tutulacaktır.

## 26.2 Event Contract Kuralları

Her event:

- Event type
- Version
- Producer
- Consumer listesi
- Routing key
- Payload schema
- Örnek payload
- Retry davranışı
- Idempotency key
- Security classification

içermelidir.

## 26.3 Shared Domain Package Olmayacak

Servisler ortak domain entity assembly’si paylaşmayacaktır.

Aşağıdakiler paylaşılabilir:

- Language-neutral JSON Schema
- AsyncAPI
- OpenAPI
- Event envelope specification
- Error code catalog

Aşağıdakiler paylaşılmayacaktır:

- Transaction entity
- RiskCase entity
- User entity
- Badge entity
- EF Core entity
- Service DbContext
- Domain service
- Business rule

---

# 27. Serialization

## 27.1 .NET

```text
System.Text.Json
```

kullanılacaktır.

## 27.2 Python

```text
Pydantic v2
```

model serialization ve validation için kullanılacaktır.

## 27.3 JSON Standardı

Alan isimleri:

```text
camelCase
```

olacaktır.

Timestamp:

```text
ISO 8601 UTC
```

Enum değerleri:

```text
UPPER_SNAKE_CASE
```

Event field’ları:

```text
camelCase
```

olarak tutulacaktır.

## 27.4 Unknown Field Politikası

Command/request modellerinde beklenmeyen kritik alanlar reddedilebilir.

Event consumer’lar backward compatibility için bilinmeyen ek alanları görmezden gelebilir.

Ancak:

- Eksik zorunlu alan
- Desteklenmeyen event version
- Geçersiz enum
- Geçersiz timestamp

reddedilmeli ve retry/DLQ politikasına girmelidir.

---

# 28. Kimlik Standardı

Internal entity ve event ID’lerinde:

```text
ULID
```

kullanılacaktır.

Kullanıcıya gösterilen transaction number ayrıdır:

```text
TRX-2026-000123
```

ULID implementasyonu:

- .NET ve Python tarafında aynı string formatını üretmelidir.
- Case-insensitive karşılaştırmaya güvenmemelidir.
- Database’te belirlenen tek formatta saklanmalıdır.
- Event schema’da string olarak tanımlanmalıdır.

ULID library sürümü dependency lock dosyasında sabitlenecektir.

---

# 29. Zaman Yönetimi

## 29.1 Backend

.NET tarafında:

```text
TimeProvider
```

kullanılacaktır.

Doğrudan:

```csharp
DateTime.UtcNow
```

kullanımı domain logic içinde sınırlandırılacaktır.

Python tarafında injectable clock abstraction veya test edilebilir UTC clock helper kullanılacaktır.

## 29.2 Saklama

PostgreSQL timestamp alanları timezone-aware olacaktır.

Bütün internal zamanlar UTC tutulacaktır.

## 29.3 Frontend

Frontend:

- Server timestamp’i source of truth kabul eder.
- Kullanıcıya lokal saat gösterebilir.
- SLA countdown yalnızca görseldir.
- SLA breach kararı frontend’de verilmez.

---

# 30. Loglama

## 30.1 Structured JSON

Bütün servisler structured JSON log üretir.

.NET tarafında platform logging altyapısı ve JSON console formatter kullanılacaktır.

Python tarafında JSON structured logging yapılandırılacaktır.

## 30.2 Zorunlu Log Alanları

- Timestamp
- Level
- Service
- Environment
- Correlation ID
- Event ID
- User ID uygun olduğunda
- Transaction ID uygun olduğunda
- Case ID uygun olduğunda
- Action
- Duration
- Result
- Error code

## 30.3 Loglanmayacak Veriler

- Şifre
- OTP
- Raw access token
- Raw refresh token
- Cookie
- RSA private key
- Database password
- RabbitMQ password
- Tam kişisel veri payload’ı
- Gereksiz müşteri bilgisi
- Model artifact içeriği

---

# 31. OpenTelemetry Kararı

OpenTelemetry baseline’ın zorunlu runtime container’ı değildir.

İlk sürümde zorunlu olanlar:

- Structured logs
- Correlation ID
- Health checks
- Outbox backlog metric
- Consumer error metric
- Request duration
- AI inference duration

OpenTelemetry instrumentation eklenebilir; ancak:

- Ayrı collector
- Jaeger
- Prometheus
- Grafana

default Compose dosyasına zorunlu olarak eklenmeyecektir.

Bu bileşenler yalnızca optional observability profile altında değerlendirilebilir.

Örnek:

```bash
docker compose --profile observability up
```

Ana demo observability stack’e bağımlı olmayacaktır.

---

# 32. .NET Dependency Yönetimi

## 32.1 Central Package Management

Repository kökünde:

```text
Directory.Packages.props
```

kullanılacaktır.

Package sürümleri servis `.csproj` dosyalarında dağınık şekilde yazılmayacaktır.

## 32.2 SDK Sabitleme

Repository kökünde:

```text
global.json
```

bulunacaktır.

CI ve local ortam aynı .NET SDK sürümünü kullanacaktır.

## 32.3 Lock Files

NuGet lock files etkinleştirilecektir:

```text
packages.lock.json
```

CI restore:

```bash
dotnet restore --locked-mode
```

kullanacaktır.

## 32.4 Temel .NET Package Grupları

### Edge

- YARP Reverse Proxy
- JWT Bearer authentication
- OpenAPI
- Health checks
- Rate limiting platform feature

### Identity

- Entity Framework Core
- Npgsql EF provider
- RabbitMQ.Client
- Argon2id implementation
- JWT token generation
- OpenAPI

### Transaction

- Entity Framework Core
- Npgsql EF provider
- RabbitMQ.Client
- OpenAPI

### Gamification

- Entity Framework Core
- Npgsql EF provider
- RabbitMQ.Client
- OpenAPI

### Testing

- xUnit
- ASP.NET Core WebApplicationFactory
- Testcontainers PostgreSQL
- Testcontainers RabbitMQ
- Coverage collector

---

# 33. Python Dependency Yönetimi

Ana dosyalar:

```text
pyproject.toml
uv.lock
```

Dependency grupları:

```text
runtime
training
development
test
```

## Runtime

- FastAPI
- ASGI server
- Pydantic
- SQLAlchemy
- Alembic
- psycopg
- aio-pika
- scikit-learn
- numpy
- joblib
- structured logging library gerekirse

## Training

- pandas
- scikit-learn
- numpy
- joblib
- plotting/report package gerekirse

## Development

- ruff
- mypy

## Test

- pytest
- pytest-asyncio
- httpx
- coverage

Runtime image training araçlarının tamamını taşımak zorunda değildir.

---

# 34. Frontend Dependency Yönetimi

Node package manager:

```text
npm
```

olacaktır.

Dosyalar:

```text
package.json
package-lock.json
```

CI kurulumu:

```bash
npm ci
```

kullanacaktır.

`npm install` CI içinde kullanılmayacaktır.

## Temel Frontend Dependency Grupları

### Runtime

- React
- React DOM
- React Router
- TanStack Query
- React Hook Form
- Zod
- Recharts
- Fetch tabanlı SSE client
- Date formatting helper
- Accessible UI primitives
- Icon library

### Development

- TypeScript
- Vite
- ESLint
- Prettier
- Vitest
- Testing Library
- Playwright
- Tailwind CSS

---

# 35. Mapping Politikası

AutoMapper baseline’a eklenmeyecektir.

Mapping:

- Explicit
- Feature’a yakın
- Okunabilir
- Compile-time kontrol edilebilir

olacaktır.

Örnek:

```csharp
var response = new CaseResponse(
    Id: riskCase.Id,
    Status: riskCase.Status,
    RiskLevel: riskCase.RiskLevel,
    SlaDeadlineAt: riskCase.SlaDeadlineAt);
```

Mapping kodu büyük hale gelirse feature-specific mapper oluşturulabilir.

Global reflection-based magic mapping kullanılmayacaktır.

---

# 36. Validation Politikası

## 36.1 HTTP Request Validation

Request validation aşağıdaki seviyelerde yapılır:

1. JSON/schema parsing
2. Field validation
3. Authorization
4. Resource ownership
5. Domain invariant
6. Database constraint

## 36.2 Framework Kararı

Başlangıçta platform validation ve feature-specific validator sınıfları kullanılacaktır.

Ek validation framework’ü yalnızca tekrar eden karmaşıklık oluşursa eklenir.

## 36.3 Domain Validation

Aşağıdakiler yalnızca DTO validator’a bırakılmaz:

- Geçerli state transition
- Blok kararında not zorunluluğu
- Analyst capacity
- Feedback’in tek seferlik olması
- Case ownership
- Refresh token reuse
- SLA kararı
- Temporary block davranışı

Bunlar domain/application katmanında korunur.

---

# 37. Test Teknolojileri

## 37.1 .NET Unit Test

```text
xUnit
```

kullanılacaktır.

Mock ağırlıklı test yerine:

- Pure domain tests
- Fake clock
- In-memory olmayan gerçek database integration testleri
- Gerçek RabbitMQ integration testleri

tercih edilir.

## 37.2 .NET Integration Test

```text
WebApplicationFactory
+
Testcontainers
```

kullanılacaktır.

Testcontainers ile:

- PostgreSQL
- RabbitMQ

gerçek container olarak çalıştırılır.

EF Core InMemory provider kullanılmayacaktır.

Çünkü gerçek PostgreSQL davranışını temsil etmez:

- Constraint
- Transaction
- Row lock
- Query translation
- Index
- Concurrency

davranışları farklıdır.

## 37.3 Python Test

```text
pytest
```

kullanılacaktır.

Test kategorileri:

- Feature engineering
- Threshold
- Model inference
- Schema
- Event consumer
- Database
- Accuracy metric
- Model artifact loading
- Health check

## 37.4 Frontend Test

Unit/component:

```text
Vitest
Testing Library
```

E2E:

```text
Playwright
```

Playwright zorunlu akışları test eder:

- Müşteri login
- İşlem oluşturma
- AI sonucu
- Analist karar
- Puan güncelleme
- Dashboard
- Role-based access

## 37.5 Contract Test

- OpenAPI schema validation
- AsyncAPI validation
- JSON Schema fixture validation
- Producer/consumer örnek payload testleri

---

# 38. Güvenlik Araçları

CI içinde aşağıdaki kontroller hedeflenir:

## .NET

```bash
dotnet list package --vulnerable
```

## Python

```bash
pip-audit
```

veya `uv` ile uyumlu eşdeğer vulnerability taraması.

## Node

```bash
npm audit
```

## Container

```text
Trivy
```

## Secret

```text
Gitleaks
```

veya eşdeğer secret scanner.

## Source Analysis

```text
GitHub CodeQL
```

uygun workflow’da çalıştırılabilir.

Güvenlik araçlarının çıktısı otomatik olarak görmezden gelinmeyecektir.

False-positive kayıtları gerekçeli şekilde belgelenir.

---

# 39. Docker Image Stratejisi

## 39.1 .NET Servisleri

Multi-stage build:

```text
.NET SDK image
      ↓
restore
build
test uygun aşamada
publish
      ↓
ASP.NET Core runtime image
```

Runtime image SDK içermez.

## 39.2 AI Service

Multi-stage veya temiz runtime build:

```text
Python 3.13 Debian slim
uv
locked dependency install
trusted model artifact
non-root runtime user
```

Alpine kullanılmayacaktır.

Neden:

- Scientific Python wheel uyumluluğu
- musl kaynaklı sürprizler
- Debugging zorluğu
- Build süresinin uzaması

## 39.3 Frontend

Node 24 LTS yalnızca build stage’de kullanılır.

Production Edge image Node runtime içermez.

## 39.4 PostgreSQL

```text
postgres:18.x
```

Debian tabanlı image tercih edilir.

## 39.5 RabbitMQ

Demo/development için:

```text
rabbitmq:4.3.x-management
```

kullanılır.

Management UI yalnızca gerekli profile’da host’a açılır.

---

# 40. Container Güvenlik Standartları

Uygulanabildiği ölçüde:

- Non-root user
- Minimal runtime image
- Read-only filesystem
- Writable temp directory sınırı
- Dropped Linux capabilities
- No privileged container
- Secret’ların image içine gömülmemesi
- Health check
- Resource limit
- Graceful shutdown
- SIGTERM handling
- Image vulnerability scan

Database ve RabbitMQ gibi resmi image’larda image’ın önerdiği runtime user kullanılacaktır.

---

# 41. Docker Compose

Compose:

```text
Docker Compose v2
```

kullanacaktır.

Kök dosya:

```text
compose.yml
```

Opsiyonel override:

```text
compose.override.yml
compose.demo.yml
```

Profile örnekleri:

```text
demo
debug
observability
training
```

Ana demo yalnızca zorunlu servislerle çalışmalıdır.

```bash
docker compose up --build
```

komutu sistemin ayağa kalkması için yeterli olmalıdır.

---

# 42. Migration Teknolojisi

## .NET Servisleri

```text
EF Core Migrations
```

## AI Service

```text
Alembic
```

Migration her app instance startup’ında otomatik ve kontrolsüz çalıştırılmayacaktır.

Tercih edilen yöntem:

```text
One-shot migration command/container
```

Örnek:

```text
identity-migrate
transaction-migrate
ai-migrate
gamification-migrate
```

Aynı service image farklı command ile migration çalıştırabilir.

Migration tamamlanmadan service readiness başarılı olmamalıdır.

---

# 43. CI/CD: GitHub Actions

## 43.1 Zorunlu Workflow’lar

### Backend

- Restore locked
- Build
- Unit test
- Integration test
- Coverage
- Vulnerability scan

### AI

- UV frozen install
- Ruff
- Mypy
- Pytest
- Model smoke inference
- Dataset schema validation

### Frontend

- `npm ci`
- ESLint
- Type check
- Unit test
- Production build
- Playwright kritik akışlar

### Contracts

- OpenAPI validation
- AsyncAPI validation
- JSON Schema validation

### Container

- Docker image build
- Trivy scan
- Compose config validation
- Compose smoke test

### Security

- Secret scan
- Dependency scan
- CodeQL uygun olduğunda

## 43.2 Main Branch

`main` branch’e merge için:

- Build başarılı
- Zorunlu testler başarılı
- Contract validation başarılı
- Secret scan başarılı
- Compose config geçerli

olmalıdır.

## 43.3 Image Publish

Tag veya release oluşturulduğunda image’lar:

```text
GitHub Container Registry
```

üzerine gönderilebilir.

Image tag örnekleri:

```text
fraudcell-edge:1.0.0
identity-service:1.0.0
transaction-service:1.0.0
ai-service:1.0.0
gamification-service:1.0.0
```

`latest` deployment source of truth olmayacaktır.

---

# 44. Local Development Standartları

Geliştiricinin makinesinde zorunlu araçlar:

- Git
- Docker Desktop veya Docker Engine
- Docker Compose v2
- .NET 10 SDK
- Python 3.13
- uv
- Node.js 24 LTS
- Uygun IDE/editor

Ancak tam sistemi çalıştırmak için yalnızca:

```text
Git
Docker
Docker Compose
```

yeterli olmalıdır.

Local runtime kurulumu yalnızca hızlı service development için gereklidir.

---

# 45. Repository Build Dosyaları

Repository kökünde:

```text
global.json
Directory.Build.props
Directory.Packages.props
.editorconfig
.gitignore
.dockerignore
compose.yml
.env.example
README.md
```

bulunacaktır.

AI klasöründe:

```text
pyproject.toml
uv.lock
```

Frontend klasöründe:

```text
package.json
package-lock.json
tsconfig.json
vite.config.ts
```

bulunacaktır.

---

# 46. Environment Variable Politikası

Environment variable isimleri açık ve service-specific olacaktır.

Örnek:

```text
IDENTITY_DATABASE_URL
TRANSACTION_DATABASE_URL
AI_DATABASE_URL
GAMIFICATION_DATABASE_URL

RABBITMQ_HOST
RABBITMQ_PORT
RABBITMQ_VHOST
RABBITMQ_USERNAME
RABBITMQ_PASSWORD

JWT_ISSUER
JWT_AUDIENCE
JWT_PRIVATE_KEY_PATH
JWT_PUBLIC_KEY_PATH

ACCESS_TOKEN_MINUTES
REFRESH_TOKEN_DAYS

AI_ASSESSMENT_DEADLINE_SECONDS
ANALYST_MAX_ACTIVE_CASES

OTEL_EXPORTER_OTLP_ENDPOINT
```

Gerçek secret `.env.example` içinde bulunmayacaktır.

`.env.example` yalnızca:

- Variable adı
- Örnek güvenli placeholder
- Açıklama

içerir.

---

# 47. Lisans Politikası

Runtime dependency’leri:

- Açık kaynak
- Ticari lisans anahtarı gerektirmeyen
- Demo sırasında online activation istemeyen
- Kullanım koşulları açık

olmalıdır.

Aşağıdaki dependency türleri mimari review olmadan eklenemez:

- AGPL runtime dependency
- Commercial license key gerektiren package
- Trial sınırlaması olan servis
- Cloud account zorunluluğu
- Runtime internet bağlantısı isteyen SDK
- Kaynağı belirsiz package

Dependency ekleyen geliştirici lisans ve bakım riskinden sorumludur.

---

# 48. Package Ekleme Kriterleri

Yeni package eklemeden önce şu sorular cevaplanmalıdır:

1. Platform içinde zaten çözüm var mı?
2. Package olmadan çözümün kod maliyeti nedir?
3. Package aktif olarak bakılıyor mu?
4. Lisansı uygun mu?
5. Güvenlik geçmişi nasıl?
6. Transitive dependency sayısı nedir?
7. Runtime’da mı, yalnızca development’ta mı kullanılıyor?
8. Demo sırasında dış bağlantı veya lisans gerekiyor mu?
9. Package kaldırıldığında ne kadar kod etkilenir?
10. Somut bir gereksinimi karşılıyor mu?

“İleride lazım olabilir” package ekleme gerekçesi değildir.

---

# 49. Bilinçli Olarak Kullanılmayacak Teknolojiler

| Teknoloji/Yaklaşım                     | Kullanılmama Nedeni                                     |
| -------------------------------------- | ------------------------------------------------------- |
| Kafka                                  | Demo kapsamı için ağır; RabbitMQ yeterli                |
| Redis                                  | Ölçülmüş ihtiyaç yok; ek failure point                  |
| MongoDB                                | Domain ilişkisel ve transaction ağırlıklı               |
| Tek ortak PostgreSQL                   | Database-per-service ihlali ve diskalifiye riski        |
| Kubernetes                             | Docker Compose zorunlu; gereksiz operasyon              |
| .NET Aspire                            | Demo topolojisini ve anlatımı gereksiz karmaşıklaştırır |
| Kong                                   | YARP aynı ihtiyacı daha az container ile çözer          |
| MassTransit                            | Lisans/framework abstraction riski                      |
| Hangfire                               | BackgroundService ve PostgreSQL worker yeterli          |
| Elasticsearch                          | Dashboard ölçeği PostgreSQL ile çözülebilir             |
| GraphQL                                | REST/OpenAPI beklentisine ek karmaşıklık                |
| Harici LLM                             | İnternet, kota, gecikme ve determinism riski            |
| MLflow                                 | Ek servis ve operasyon; kapsam için gerekli değil       |
| SignalR                                | Tek yönlü bildirim için SSE daha sade                   |
| WebSocket                              | Çift yönlü sürekli iletişim ihtiyacı yok                |
| Redux                                  | Server state için TanStack Query yeterli                |
| Axios                                  | Native fetch yeterli                                    |
| AutoMapper                             | Explicit mapping daha açık                              |
| MediatR                                | Ek abstraction; plain handler yeterli                   |
| Generic Repository                     | EF Core üzerinde gereksiz abstraction                   |
| Full Clean Architecture project ayrımı | Üç küçük serviste aşırı boilerplate                     |
| Full Event Sourcing                    | Case için gereksiz karmaşıklık                          |
| Distributed Transaction                | Servis bağımsızlığını bozar                             |
| Two-Phase Commit                       | Broker/DB coupling ve operasyonel risk                  |
| Ayrı Notification Service              | Edge relay yeterli                                      |
| Ayrı Reporting Service                 | Frontend composition ve service query’leri yeterli      |
| Shared Domain Package                  | Servis bağımsızlığını bozar                             |

---

# 50. Teknoloji Değişikliği Prosedürü

Accepted bir teknolojinin değiştirilmesi için:

1. Sorun açıkça tanımlanır.
2. Mevcut teknolojiyle neden çözülemediği yazılır.
3. Alternatifler listelenir.
4. Güvenlik etkisi değerlendirilir.
5. Demo etkisi değerlendirilir.
6. Migration maliyeti yazılır.
7. Yeni ADR oluşturulur.
8. İlgili dokümanlar güncellenir.
9. CI ve Compose testleri çalıştırılır.
10. Eski karar `Superseded` olarak işaretlenir.

Sözlü teknoloji değişikliği yapılmayacaktır.

---

# 51. Teknoloji Stack Kabul Kriterleri

Bu dokümandaki stack aşağıdaki koşullar sağlandığında uygulanmış kabul edilir.

## Backend

- Bütün .NET servisleri .NET 10 ile build olur.
- SDK `global.json` ile sabittir.
- NuGet restore locked mode’da çalışır.
- Nullable ve warnings-as-errors etkindir.
- Gateway YARP ile route eder.
- EF Core PostgreSQL üzerinde migration çalıştırır.

## AI

- Python 3.13 image build olur.
- `uv sync --frozen` başarılıdır.
- Model artifact yüklenir.
- Inference farklı inputlarda farklı sonuç üretir.
- FastAPI OpenAPI üretir.
- RabbitMQ consumer event işler.

## Database

- Dört ayrı PostgreSQL container bulunur.
- Her servis yalnızca kendi DB credential’ına sahiptir.
- Migration history ayrıdır.
- Host’a database portu açılmaz.

## Messaging

- RabbitMQ 4.3 çalışır.
- Durable queue bulunur.
- Publisher confirm kullanılır.
- Consumer manual ACK kullanır.
- Outbox/inbox testleri geçer.
- Duplicate event duplicate business sonucu üretmez.

## Frontend

- Node.js 24 ile production build oluşur.
- React static output Edge image’ına alınır.
- TypeScript strict build geçer.
- SSE authorization ile çalışır.
- Dashboard bağımsız loading/error state gösterir.

## CI/CD

- Backend, AI ve frontend workflow’ları geçer.
- Container image’ları build olur.
- Compose smoke testi geçer.
- Dependency ve secret scan çalışır.
- Release tag’inde image publish edilebilir.

---

# 52. Nihai Teknoloji Karar Özeti

| Karar                      | Sonuç                                       |
| -------------------------- | ------------------------------------------- |
| Backend ana runtime        | .NET 10 LTS                                 |
| Backend API yaklaşımı      | Minimal API + vertical slice                |
| Gateway                    | ASP.NET Core + YARP                         |
| Identity altyapısı         | ASP.NET Core Identity + custom token domain |
| ORM                        | EF Core 10                                  |
| AI runtime                 | Python 3.13                                 |
| AI API                     | FastAPI                                     |
| AI ORM                     | SQLAlchemy 2 + Alembic                      |
| AI modeli                  | scikit-learn                                |
| Database                   | 4 ayrı PostgreSQL 18                        |
| Broker                     | RabbitMQ 4.3                                |
| Messaging client           | Native RabbitMQ clients                     |
| Frontend                   | React 19 + TypeScript + Vite                |
| Frontend hosting           | Edge container static hosting               |
| Server state               | TanStack Query                              |
| Form                       | React Hook Form + Zod                       |
| Grafik                     | Recharts                                    |
| Styling                    | Tailwind + accessible primitives            |
| Realtime                   | Fetch tabanlı SSE                           |
| API contract               | OpenAPI                                     |
| Event contract             | AsyncAPI + JSON Schema                      |
| .NET test                  | xUnit + Testcontainers                      |
| Python test                | Pytest                                      |
| Frontend test              | Vitest + Playwright                         |
| Dependency locking         | NuGet lock + uv.lock + package-lock         |
| CI/CD                      | GitHub Actions + GHCR                       |
| Deployment                 | Docker Compose                              |
| Shared domain code         | Yasak                                       |
| Runtime commercial license | Yasak                                       |
| Floating dependency        | Yasak                                       |

---

# 53. Sonraki Doküman

Bu dokümandan sonra hazırlanacak dosya:

```text
04-SERVICE-BOUNDARIES.md
```

Bu dosyada aşağıdakiler kesinleştirilecektir:

- Her servisin sahip olduğu business capability’ler
- Her servisin sahip olduğu veriler
- Bir servisin kesinlikle yapmayacağı işler
- Servisler arası komut ve event sınırları
- Source-of-truth tablosu
- Cross-service veri projection’ları
- Yasaklanan doğrudan bağlantılar
- Servis dependency yönleri
- Ownership ve consistency kuralları
