Evet. PDF’yi, önceki mimari tartışmamızı ve diğer modelin değerlendirmesini birlikte ele aldım. Diğer model, önceki omurganın güçlü olduğunu söylüyor ve tek itirazını “takımın bildiği teknoloji” üzerinden yapıyor. Normal bir ticari projede bu itiraz doğrudur; fakat sen açıkça **öğrenme maliyetini değil, bu problem için mühendislik açısından en doğru çözümü** istediğini söyledin. Bu nedenle stack’i takım tecrübesine göre sulandırmayacağım.

Aşağıdaki karar artık benim **nihai mimari kararım**. Bundan sonra rastgele teknoloji değiştirmeyeceğiz. Yalnızca gerçekten yanlış olduğunu kanıtladığımız bir karar değişirse bunu ADR ile kayıt altına alacağız.

# Nihai kararın tek cümlelik özeti

> FraudCell; ASP.NET Core 10 tabanlı Identity, Transaction ve Gamification servisleri, YARP tabanlı Edge Gateway, Python/FastAPI tabanlı gerçek ML servisi, servis başına fiziksel olarak ayrı PostgreSQL, RabbitMQ tabanlı asenkron event mimarisi, transactional outbox/inbox, resource-based authorization ve SSE bildirimleriyle geliştirilecek.

Bu mimari; PDF’de zorunlu tutulan dört bağımsız mikroservisi, API Gateway’i, database-per-service kuralını, Docker Compose kurulumunu, event kullanımını, AI servisinin çalışmaması durumundaki fallback’i, güvenlik testlerini ve servis kapatma demosunu doğrudan karşılıyor.

---

# 1. Kilitlenen teknoloji yığını

| Alan                    | Nihai seçim                                        |
| ----------------------- | -------------------------------------------------- |
| Runtime                 | **.NET 10 LTS**                                    |
| Edge/API Gateway        | **ASP.NET Core 10 + YARP**                         |
| Identity Service        | **ASP.NET Core 10**                                |
| Transaction Service     | **ASP.NET Core 10**                                |
| Gamification Service    | **ASP.NET Core 10**                                |
| AI Service              | **Python 3.13 + FastAPI**                          |
| ML                      | **scikit-learn**                                   |
| .NET ORM                | **EF Core 10 + Npgsql**                            |
| AI ORM                  | **SQLAlchemy 2 + Alembic**                         |
| Veritabanları           | **4 ayrı PostgreSQL 18 container’ı**               |
| Event Broker            | **RabbitMQ 4.3**                                   |
| Frontend                | **React + TypeScript + Vite**                      |
| Gerçek zamanlı iletişim | **Server-Sent Events**                             |
| Backend test            | **xUnit + WebApplicationFactory + Testcontainers** |
| AI test                 | **Pytest**                                         |
| CI                      | **GitHub Actions**                                 |
| Deployment              | **Docker Compose**                                 |
| Repository              | **Monorepo**                                       |
| API dokümantasyonu      | **OpenAPI/Swagger**                                |
| Loglama                 | **Structured JSON logging + correlation ID**       |

.NET 10 güncel LTS hattında bulunuyor. YARP, ASP.NET Core içinde özelleştirilebilir reverse proxy ve route bazlı authentication/authorization desteği sunuyor. PostgreSQL 18 güncel desteklenen ana sürüm; RabbitMQ 4.3 ise güncel community-supported sürüm hattı. ([Microsoft][1])

## Neden PostgreSQL 17 değil 18?

Önceki taslakta PostgreSQL 17 demiştik. Güncel durumda PostgreSQL 18, desteklenen güncel ana sürüm. Projeyi bugün sıfırdan kurduğumuz için **PostgreSQL 18’i kilitliyorum**. PostgreSQL major sürümleri beş yıl destekleniyor. ([PostgreSQL][2])

## Python neden 3.13?

En yeni sürümü seçme yarışı yapmayacağız. Python 3.13:

- ML paketleri açısından olgun,
- Docker image desteği oturmuş,
- wheel uyumluluğu daha güvenli,
- demo günü derleme sürprizi çıkarma olasılığı daha düşük.

Bu bir “en yeni sürüm” kararı değil; **dependency güvenilirliği** kararı.

---

# 2. Önceki mimariden değiştirdiğim en önemli karar

## Transaction → AI ana akışı senkron REST olmayacak

İlk taslakta işlem oluşturulurken Transaction Service’in AI Service’e senkron HTTP çağrısı yapmasını tartışmıştık.

Nihai kararım:

> Ana akış event-driven ve asenkron olacak.

```text
Müşteri
   |
   v
POST /api/v1/transactions
   |
   v
Transaction Service
   |- İşlemi kaydeder
   |- assessment_status = PENDING
   |- transaction.created event'ini outbox'a yazar
   |
   v
201 Created
   |
   v
RabbitMQ
   |
   v
AI Service
   |- Risk skorlar
   |- Fraud tipi belirler
   |- Analist adaylarını sıralar
   |- ai.assessment.completed yayınlar
   |
   v
Transaction Service
   |- Sonucu kaydeder
   |- Vaka oluşturur
   |- Atamayı kesinleştirir
   |- SSE bildirimi üretir
```

## Neden?

Senkron modelde AI kapalı olduğunda:

- request timeout bekler,
- Transaction Service’in latency’si AI’a bağlanır,
- fallback kodu karmaşıklaşır,
- servis bağımsızlığı zayıflar.

Asenkron modelde:

- işlem önce güvenli şekilde kaydedilir,
- AI kapalıysa iş kaybolmaz,
- RabbitMQ kapalıysa event outbox’ta kalır,
- AI geri geldiğinde işlem değerlendirilir,
- frontend sonucu SSE ile alır,
- servis kapatma demosu çok daha güçlü görünür.

Bu, PDF’nin “AI kapalı olsa bile işlem oluşturulabilmeli” şartının en temiz karşılığıdır.

## İlk HTTP cevabı

İşlem gerçekten oluşturulduğu için `201 Created` döneceğiz:

```json
{
  "success": true,
  "data": {
    "transactionId": "01K...",
    "transactionNo": "TRX-2026-000123",
    "assessmentStatus": "PENDING",
    "riskScore": null,
    "riskLevel": null,
    "displayRiskLevel": "BELIRSIZ",
    "decision": "INCELEME"
  },
  "error": null
}
```

`Location` header’ı:

```text
/api/v1/transactions/01K...
```

olacak.

Burada `BELIRSIZ` gerçek risk enum’una eklenmeyecek. Bunun yerine:

```text
assessment_status = PENDING | COMPLETED | FAILED
risk_score         = nullable
risk_level         = nullable
```

tutulacak.

Arayüz, değerlendirme tamamlanmadığında `BELIRSIZ` gösterecek. Bu daha temiz bir domain modelidir.

---

# 3. Nihai sistem topolojisi

```text
                          INTERNET / BROWSER
                                  |
                                  v
                +-----------------------------------+
                | FraudCell Edge                    |
                | ASP.NET Core 10 + YARP            |
                | React static files                |
                | JWT validation                    |
                | Rate limiting                     |
                | Security headers                  |
                | Correlation ID                    |
                | SSE notification relay            |
                +-----------+----------+------------+
                            |          |
              +-------------+          +----------------+
              |                                           |
              v                                           v
     +------------------+                        +---------------------+
     | Identity Service |                        | Transaction Service |
     | ASP.NET Core 10  |                        | ASP.NET Core 10     |
     +--------+---------+                        +----------+----------+
              |                                             |
              v                                             v
     +------------------+                        +---------------------+
     | Identity DB      |                        | Transaction DB      |
     | PostgreSQL 18    |                        | PostgreSQL 18       |
     +------------------+                        +---------------------+

                          +---------------------+
                          | RabbitMQ 4.3        |
                          | Topic Exchange      |
                          | Durable Queues      |
                          | Retry Queues        |
                          | Dead Letter Queues  |
                          +----------+----------+
                                     |
                      +--------------+---------------+
                      |                              |
                      v                              v
             +------------------+           +----------------------+
             | AI Service       |           | Gamification Service |
             | Python/FastAPI   |           | ASP.NET Core 10      |
             | scikit-learn     |           +----------+-----------+
             +--------+---------+                      |
                      |                                v
                      v                       +----------------------+
             +------------------+             | Gamification DB      |
             | AI DB            |             | PostgreSQL 18        |
             | PostgreSQL 18    |             +----------------------+
             +------------------+
```

## Dışarıya açılan tek port

```text
http://localhost:8080
```

Dışarıya şunlar açılmayacak:

- Identity Service portu
- Transaction Service portu
- AI Service portu
- Gamification Service portu
- PostgreSQL portları
- RabbitMQ AMQP portu

Development profilinde yalnızca RabbitMQ Management UI ayrıca açılabilir.

Bu sayede jüri doğrudan servis portuna giderek Gateway’i bypass edemez.

---

# 4. Docker network izolasyonu

Sadece ayrı DB container açmakla kalmayacağız; network seviyesinde de ayıracağız.

```text
edge-network
  - gateway

application-network
  - gateway
  - identity-service
  - transaction-service
  - ai-service
  - gamification-service
  - rabbitmq

identity-data-network
  - identity-service
  - identity-db

transaction-data-network
  - transaction-service
  - transaction-db

ai-data-network
  - ai-service
  - ai-db

gamification-data-network
  - gamification-service
  - gamification-db
```

Böylece örneğin Gamification Service, DNS veya network seviyesinde Transaction DB’ye erişemez.

Bu, database-per-service yaklaşımını jüriye yalnızca sözle değil, **Compose topolojisiyle** kanıtlar.

---

# 5. Servislerin kesin sorumlulukları

## Identity Service

Sahip olduğu veriler:

- Kullanıcı
- Müşteri profili
- Personel profili
- Roller
- Uzmanlık alanları
- Bölgeler
- Şifre bilgileri
- Login attempts
- Hesap kilidi
- Refresh token family
- Audit log

Yapacağı işler:

- GSM + OTP müşteri kaydı/girişi
- Personel e-posta + şifre girişi
- Admin tarafından personel hesabı oluşturma
- Access token üretimi
- Refresh token rotation
- Refresh token reuse detection
- Logout
- Role ve permission yönetimi
- Audit log sorgulama

Yapmayacağı işler:

- Transaction okumak
- Case atamak
- Puan hesaplamak
- AI metriği hesaplamak

---

## Transaction Service

Sistemin operasyonel domain otoritesidir.

Sahip olduğu veriler:

- İşlemler
- Risk vakaları
- Case state transition history
- Analist atamaları
- Analist notları
- Müşteri doğrulama istekleri
- Müşteri cevapları
- SLA bilgileri
- Geçici blok
- Nihai karar
- Müşteri geri bildirimi
- Outbox
- Inbox/processed events

Yapacağı işler:

- İşlem oluşturma
- AI assessment sonucunu uygulama
- Risk vakası oluşturma
- State machine
- Kapasite doğrulama
- Analist atamasını kesinleştirme
- SLA başlatma/durdurma
- Müşteri doğrulama süreci
- Karar verme
- Manuel atama
- AI fraud-type override
- Case kapanışı

Transaction Service sistemin **source of truth** noktasıdır:

- Bir vaka kime atanmış?
- Vakanın mevcut durumu ne?
- SLA ne zaman doluyor?
- İşlem geçici bloklu mu?
- Nihai karar ne?

Bu soruların cevabını yalnızca Transaction Service verir.

---

## AI Service

Sahip olduğu veriler:

- Model sürümleri
- Training metadata
- Tahmin kayıtları
- Feature snapshot
- Risk tahmini
- Fraud-type tahmini
- Analyst assignment projection
- Override feedback
- Kategori bazlı doğruluk
- Karar uyum metriği
- Model değerlendirme sonuçları

Üç zorunlu görevi:

1. Risk scoring
2. Fraud-type classification
3. Analyst candidate ranking

AI Service atamayı doğrudan uygulamaz.

> AI adayları sıralar; Transaction Service kapasiteyi kontrol eder ve atamayı kesinleştirir.

---

## Gamification Service

Sahip olduğu veriler:

- Point ledger
- Analyst score summary
- Badge definitions
- Earned badges
- Daily leaderboard
- Weekly leaderboard
- Analyst performance aggregate
- Inbox/processed events
- Outbox

Gamification Service’e doğrudan:

```http
POST /add-points
```

çağrısı yapılmayacak.

Transaction Service’in yayınladığı olayları dinleyecek:

```text
case.decision.made
case.sla.breached
customer.verification.responded
customer.feedback.submitted
```

Puan kuralını kendisi uygulayacak.

---

# 6. Identity mimarisi hakkındaki nihai karar

## ASP.NET Core Identity kullanacağız

Fakat kutudan çıktığı biçimde değil.

ASP.NET Core Identity’den alacağımız parçalar:

- User management
- Role management
- Password validation altyapısı
- Account lockout
- Security stamp
- UserManager
- RoleManager

Custom geliştireceğimiz parçalar:

- GSM + OTP giriş
- Argon2id password hasher
- JWT üretimi
- RSA key yönetimi
- Refresh token family
- Token rotation
- Token reuse detection
- Audit event üretimi
- Uzmanlık ve bölge claim’leri

Bütün kullanıcı ve şifre altyapısını sıfırdan yazmak gereksiz güvenlik riskidir.

## Access token

- Süre: 15 dakika
- İmzalama: RSA asymmetric key
- Identity private key ile imzalar
- Gateway ve servisler public key ile doğrular

Claim’ler:

```json
{
  "sub": "user-id",
  "role": "ANALYST",
  "specialties": ["CALINTI_KART"],
  "regions": ["KARADENIZ"],
  "jti": "token-id",
  "iss": "fraudcell-identity",
  "aud": "fraudcell-api",
  "exp": 0
}
```

## Refresh token

- Süre: 7 gün
- Browser’da `HttpOnly` cookie
- Veritabanında yalnızca hash
- Her kullanımda rotation
- Token family takibi

Tablo:

```text
refresh_sessions
- id
- user_id
- family_id
- token_hash
- created_at
- expires_at
- revoked_at
- replaced_by_id
- reuse_detected_at
- created_ip
- user_agent
```

Revoke edilmiş token tekrar kullanılırsa:

1. Refresh isteği reddedilir.
2. Aynı family içindeki bütün token’lar revoke edilir.
3. Kullanıcının security stamp’i değiştirilir.
4. Bütün aktif oturumlar düşürülür.
5. Audit log yazılır.

---

# 7. Yetkilendirme modeli

## Gateway coarse-grained kontrol yapar

Gateway:

- Token geçerli mi?
- Token süresi dolmuş mu?
- Route gerekli role açık mı?
- Request rate limit’i aşıyor mu?

kontrol eder.

## Servis fine-grained kontrol yapar

Transaction Service:

- Bu müşteri bu işlemin sahibi mi?
- Bu analist bu vakaya atanmış mı?
- Bu süpervizör manuel atama yapabilir mi?
- Bu kullanıcının bu transition’a yetkisi var mı?

kontrol eder.

Örneğin:

```csharp
case.Id == requestedCaseId
&& case.AssignedAnalystId == currentUserId
```

Ownership kontrolü sonradan yapılmayacak. Doğrudan sorgunun parçası olacak.

Yetkisiz bir analist başka analistin vaka ID’sini denediğinde kaynak varlığını sızdırmamak için çoğu ownership senaryosunda `404` döndürmek daha güvenli olacak.

---

# 8. İşlem ve vaka modeli

## Transaction oluşturma

Zorunlu alanlar:

```text
amount
transaction_type
recipient
source_device
city
country
occurred_at
```

Model için ek alanlar:

```text
is_new_device
is_new_recipient
customer_average_amount
transactions_last_10_minutes
transactions_last_24_hours
usual_cities
device_age_days
recipient_age_days
```

Bu özelliklerin bir kısmı frontend’den alınmayacak; geçmiş işlem verisinden Transaction Service tarafından üretilecek veya simulation seed’inden gelecek.

## Kimlikler

Internal ID:

```text
ULID
```

Dışarıya gösterilen okunabilir numara:

```text
TRX-2026-000123
```

ULID:

- sıralanabilir,
- log ve event takibinde kullanışlı,
- UUID’ye göre operasyon ekranında daha okunabilir.

Transaction numarası ayrıca unique constraint alacak.

---

# 9. Risk ve vaka oluşturma kuralları

Kesin sınırlar:

```text
risk < 0.40       -> ONAY
0.40 <= risk <= 0.90 -> INCELEME
risk > 0.90       -> BLOK
```

Özel sınır testleri:

```text
0.3999 -> ONAY
0.4000 -> INCELEME
0.9000 -> INCELEME
0.9001 -> BLOK
```

## ONAY

- Transaction onaylanır.
- Risk vakası oluşturulmaz.

## İNCELEME

- Risk vakası oluşturulur.
- Durum `YENI`.
- Analist adayı bulunursa `ATANDI`.
- Kapasite yoksa vaka `YENI` kalır.
- Ayrı `assignment_status = QUEUED` tutulur.

## BLOK

- İşlem geçici olarak bloklanır.
- Risk seviyesi `KRITIK`.
- Risk vakası oluşturulur.
- 15 dakikalık SLA başlar.
- Uygun analist atanır.

---

# 10. State machine kararı

İzin verilen geçişler:

```text
YENI
  -> ATANDI

ATANDI
  -> INCELENIYOR

INCELENIYOR
  -> MUSTERI_DOGRULAMA
  -> ONAYLANDI
  -> BLOKLANDI

MUSTERI_DOGRULAMA
  -> INCELENIYOR

ONAYLANDI
  -> KAPANDI

BLOKLANDI
  -> KAPANDI
```

PDF’de `BLOKLANDI → KAPANDI` açıkça yazılmamış. Ancak müşteri geri bildiriminin yalnızca `KAPANDI` vakalarda verilebilmesi nedeniyle bloklanan vakaların kapanış yolu bulunmak zorunda. Bu yüzden:

> `BLOKLANDI → KAPANDI`, sistem tarafından 48 saat sonra gerçekleştirilecek.

Bu karar ayrı ADR olarak belgelenir ve dokümandaki boşluğu kapatan bilinçli mimari karar olarak savunulur.

## Generic status update olmayacak

Şu endpoint yasak:

```http
PATCH /cases/{id}
{
  "status": "BLOKLANDI"
}
```

Niyet belirten operasyonlar olacak:

```text
POST  /cases/{id}/review
POST  /cases/{id}/verification-requests
POST  /cases/{id}/verification-response
PATCH /cases/{id}/decision
PUT   /cases/{id}/assignment
PATCH /cases/{id}/fraud-type
```

Her operasyon:

- rol,
- ownership,
- mevcut state,
- zorunlu alan,
- concurrency version,
- SLA,
- audit,
- event

kontrollerini yapacak.

Geçersiz transition:

```text
422 Unprocessable Entity
```

Concurrency çakışması:

```text
409 Conflict
```

---

# 11. Müşteri “Ben yapmadım” dediğinde

Kesin davranış:

```text
customer_response = NOT_MINE
risk_score = max(existing_risk_score, 0.91)
temporary_block = true
```

Fakat risk vakası otomatik olarak final `BLOKLANDI` durumuna geçmeyecek.

Ayrım:

- İşlem seviyesinde geçici blok: sistem uygulayabilir.
- Vaka seviyesinde nihai blok kararı: analist verir.

Bu ayrım hem güvenli hem de audit edilebilir.

---

# 12. AI mimarisi

## Harici LLM kullanılmayacak

Risk motoru:

- internete,
- API key’e,
- kota limitine,
- üçüncü taraf gecikmesine,
- nondeterministic çıktıya

bağımlı olmayacak.

## Hibrit AI motoru

Üç bölüm:

```text
1. ML risk probability modeli
2. Fraud-type classification modeli
3. Deterministic safety rule layer
```

## Risk modeli

Nihai seçim:

```text
HistGradientBoostingClassifier
+
CalibratedClassifierCV
```

Çıktı:

```text
0.0 - 1.0 fraud probability
```

Calibration kullanılmasının nedeni, model skorunun decision threshold’larında kullanılacak olmasıdır.

## Fraud-type modeli

Nihai seçim:

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

## Açıklama katmanı

Jüriye yalnızca `%94` göstermeyeceğiz.

Tahmin:

```json
{
  "riskScore": 0.94,
  "riskLevel": "KRITIK",
  "decision": "BLOK",
  "fraudType": "CALINTI_KART",
  "modelVersion": "risk-1.0.0",
  "reasonCodes": [
    {
      "code": "NEW_DEVICE",
      "label": "İlk kez görülen cihaz",
      "impact": "HIGH"
    },
    {
      "code": "AMOUNT_DEVIATION",
      "label": "Normal tutarın 8.4 katı",
      "impact": "HIGH"
    },
    {
      "code": "UNUSUAL_LOCATION",
      "label": "Alışılmadık şehir",
      "impact": "HIGH"
    },
    {
      "code": "NIGHT_TRANSACTION",
      "label": "Gece saatinde işlem",
      "impact": "MEDIUM"
    }
  ]
}
```

Reason code motoru model açıklamasıymış gibi sahte sunulmayacak. Dokümantasyonda açıkça:

> Risk skoru ML modelinden, operasyonel açıklamalar engineered feature ve rule evaluation katmanından üretilir.

diyeceğiz.

## Eğitim verisi

Başlangıç hedefi:

```text
10.000 sentetik işlem
```

Dağılım:

- meşru işlemler,
- çalıntı kart,
- hesap ele geçirme,
- para aklama,
- şüpheli davranış.

Kurallar:

- Sabit random seed
- Train/validation/test ayrımı
- Data leakage kontrolü
- Class distribution raporu
- Confusion matrix
- Precision/recall/F1
- Fraud-type bazlı başarı
- Model metadata
- Eğitim script’i repository’de

Split:

```text
70% train
15% validation
15% test
```

---

# 13. Analist atama algoritması

Formül:

```text
assignment_score =
  expertise_match * 0.50
  + capacity_ratio * 0.30
  + performance * 0.20
```

## Expertise match

```text
Fraud tipi analistin uzmanlıkları arasındaysa 1
Değilse 0
```

## Capacity ratio

```text
1 - active_case_count / 10
```

## Performance

```text
correct_decisions / total_decisions
```

Yeni analistte yeterli veri yoksa neutral başlangıç:

```text
0.50
```

## Tie-break kuralları

Aynı skor oluşursa sırasıyla:

1. Daha az aktif vaka
2. Daha yüksek başarı oranı
3. Daha uzun süredir yeni vaka almamış analist
4. Analyst ID lexical order

Bu sayede atama deterministic olur. Aynı girdide farklı sonuç üretmez.

## Projection modeli

AI Service diğer servislerin DB’sine erişmeyecek.

Event’lerle kendi read model’ini güncelleyecek:

```text
analyst.profile.updated
analyst.performance.updated
case.assigned
case.decision.made
```

AI adayları önerdikten sonra Transaction Service güncel kapasiteyi yeniden kontrol eder.

---

# 14. RabbitMQ topolojisi

Exchange:

```text
fraudcell.events
type: topic
durable: true
```

Her consumer’ın ayrı kuyruğu olacak:

```text
ai.transaction-created
transaction.ai-assessment-completed
gamification.case-events
identity.audit-events
edge.user-notifications
```

## Event envelope

```json
{
  "eventId": "01K...",
  "eventType": "case.decision.made",
  "eventVersion": 1,
  "occurredAt": "2026-07-22T14:32:11Z",
  "producer": "transaction-service",
  "correlationId": "01K...",
  "causationId": "01K...",
  "subjectId": "case-id",
  "payload": {}
}
```

## Delivery garantisi

Kullanacağımız model:

```text
At-least-once delivery
+
Idempotent consumers
```

“Exactly once” iddiasında bulunmayacağız.

RabbitMQ consumer acknowledgements ve publisher confirms, mesajın güvenli işlenmesi ve broker tarafından kabul edilmesinin takip edilmesi için kullanılacak. ([RabbitMQ][3])

---

# 15. Transactional outbox ve inbox

## Outbox

Business değişikliği ve event aynı DB transaction’ında yazılır:

```text
BEGIN

UPDATE cases
SET status = 'BLOKLANDI'

INSERT INTO outbox_messages (...)

COMMIT
```

Outbox worker:

1. Yayınlanmamış kayıtları alır.
2. RabbitMQ’ya publish eder.
3. Publisher confirm bekler.
4. `published_at` günceller.

## Inbox

Her consumer:

```text
inbox_messages
- event_id
- consumer_name
- processed_at
```

tablosunu kullanır.

`event_id + consumer_name` unique olur.

Duplicate mesaj geldiğinde:

- business işlem tekrar yapılmaz,
- mesaj ACK edilir.

## Retry

```text
İlk hata    -> 5 saniye
İkinci hata -> 30 saniye
Üçüncü hata -> 2 dakika
Dördüncü    -> Dead Letter Queue
```

Poison message sonsuz döngüye girmez.

---

# 16. SSE bildirim mimarisi

Ek bir Notification Service kurmayacağız.

Gateway içinde yalnızca transport sorumluluğu olan `NotificationRelay` bulunacak.

Akış:

```text
Domain Service
   -> user.notification.requested
   -> RabbitMQ
   -> Gateway NotificationRelay
   -> SSE
   -> Browser
```

Örnek bildirimler:

- AI değerlendirmesi tamamlandı
- Vaka analiste atandı
- Müşteri doğrulaması istendi
- Puan kazanıldı
- Rozet kazanıldı
- SLA kritik seviyeye geldi

Gateway bildirim içeriğine karar vermez. Yalnızca hazır notification event’ini ilgili kullanıcıya iletir.

---

# 17. Gamification veri modeli

Yalnızca `total_points` alanı tutmayacağız.

```text
point_ledger
- id
- analyst_id
- source_event_id
- case_id
- rule_code
- points
- occurred_at
```

`source_event_id + rule_code` unique olacak.

Bir vaka kararı:

```text
CASE_DECISION           +10
FAST_DECISION            +5
CONFIRMED_FRAUD         +15
CRITICAL_WITHIN_SLA     +15
```

Toplam:

```text
+45
```

Arayüzde tek `+45` yerine kırılım gösterilecek.

Leaderboard için ilk aşamada Redis kullanılmayacak. PostgreSQL aggregate ve window function yeterli olacak.

---

# 18. Audit mimarisi

PDF audit log’u Identity Service sorumluluğunda tanımlıyor. Fakat kritik olaylar diğer servislerde gerçekleşiyor.

Akış:

```text
Gateway / Transaction / Gamification / AI
                   |
                   v
          audit.entry.requested
                   |
                   v
            Identity Service
                   |
                   v
          append-only audit log
```

Audit kaydı:

```json
{
  "actorId": "user-id",
  "action": "CASE_BLOCKED",
  "sourceService": "transaction-service",
  "resourceType": "risk-case",
  "resourceId": "case-id",
  "ipAddress": "127.0.0.1",
  "result": "SUCCESS",
  "occurredAt": "2026-07-22T14:32:11Z",
  "correlationId": "correlation-id",
  "details": {
    "previousStatus": "INCELENIYOR",
    "newStatus": "BLOKLANDI"
  }
}
```

Audit kayıtları API’den değiştirilemez veya silinemez.

---

# 19. API standardı

Base path:

```text
/api/v1
```

Standart başarı cevabı:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {
    "traceId": "..."
  }
}
```

Standart hata cevabı:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "INVALID_CASE_TRANSITION",
    "message": "INCELENIYOR durumundan ATANDI durumuna geçilemez.",
    "details": {}
  },
  "meta": {
    "traceId": "..."
  }
}
```

HTTP statüleri semantik kullanılacak:

```text
400 Invalid input
401 Authentication failed
403 Permission denied
404 Resource unavailable
409 Concurrency/idempotency conflict
422 Domain rule violation
429 Rate limit
503 Temporary dependency failure
```

---

# 20. Güvenlik kararları

## SQL injection

- EF Core parameterized queries
- SQLAlchemy parameterized queries
- Kullanıcı girdisiyle query string birleştirme yok
- Raw SQL code review gerektirir
- Input length ve enum validation

## XSS

- Not alanları plain text
- HTML reddedilecek
- `dangerouslySetInnerHTML` kullanılmayacak
- Content Security Policy
- Secure response headers

## Brute force

İki katman:

```text
Gateway rate limiting
+
Identity database account lockout
```

Beş başarısız giriş:

```text
15 dakika kilit
```

Kilit bilgisi memory’de değil PostgreSQL’de olacak.

## JWT manipülasyonu

- İmza doğrulama
- Sabit izin verilen algoritma
- Issuer kontrolü
- Audience kontrolü
- Expiration kontrolü
- `jti`
- RSA public/private key ayrımı

## IDOR

Ownership doğrudan database query’sinde uygulanacak.

## Secrets

- Repository’de gerçek secret bulunmayacak
- `.env.example`
- Local `.env`
- RSA private key Git’e girmeyecek
- Demo key üretim script’i bulunacak

---

# 21. Resilience davranışları

## AI Service kapalı

- İşlem oluşturulur.
- Assessment `PENDING` kalır.
- Risk ekranda `BELIRSIZ`.
- Decision fallback `INCELEME`.
- Manuel inceleme kuyruğuna görünür.
- AI geri geldiğinde otomatik değerlendirilir.

## Gamification Service kapalı

- Vaka kararı başarılı olur.
- Event RabbitMQ kuyruğunda/outbox’ta bekler.
- Servis geri geldiğinde puan uygulanır.

## RabbitMQ kapalı

- Business transaction commit edilir.
- Event outbox’ta bekler.
- RabbitMQ geri geldiğinde publish edilir.

## Identity Service kapalı

- Yeni login ve refresh çalışmaz.
- Daha önce verilmiş access token’lar public key ile doğrulanmaya devam eder.
- Transaction ve diğer servisler topluca çökmez.

## PostgreSQL servislerinden biri kapalı

Yalnızca ilgili servis `not ready` olur. Diğer servislerin veritabanları etkilenmez.

---

# 22. Kullanmayacağımız teknolojiler

Kesin olarak dışarıda:

- Kafka
- MongoDB
- Redis
- Kubernetes
- .NET Aspire
- MassTransit
- Hangfire
- Elasticsearch
- GraphQL
- Harici LLM risk motoru
- Full event sourcing
- Service mesh
- Ayrı Notification Service
- Ortak database
- Shared domain entity package
- Generic repository pattern
- Her use case için gereksiz mediator/framework
- Gateway içinde business logic

Bunların hiçbiri şu an puan/risk oranını iyileştirmiyor.

---

# 23. Kod organizasyonu

Her servis için dört ayrı `.csproj` açmayacağız.

Nihai yaklaşım:

> Tek deployable project + feature-based vertical slices.

Örnek:

```text
Transaction.Service/
├── Features/
│   ├── Transactions/
│   │   ├── CreateTransaction/
│   │   └── GetTransaction/
│   ├── Cases/
│   │   ├── StartReview/
│   │   ├── RequestVerification/
│   │   ├── DecideCase/
│   │   └── OverrideFraudType/
│   └── Assignments/
├── Domain/
├── Persistence/
├── Messaging/
├── BackgroundJobs/
├── Security/
└── Common/
```

Mikroservis sınırı `.csproj` sayısıyla değil:

- process,
- database,
- deployment,
- ownership

ile belirlenir.

---

# 24. Dokümantasyon sistemimiz

Kararları tek devasa README içine doldurmayacağız.

Toplam **17 ana Markdown dokümanı** ve bir ADR klasörü oluşturacağız.

```text
FraudCell/
├── docs/
│   ├── 00-START-HERE.md
│   ├── 01-REQUIREMENTS-TRACEABILITY.md
│   ├── 02-ARCHITECTURE-OVERVIEW.md
│   ├── 03-TECH-STACK.md
│   ├── 04-SERVICE-BOUNDARIES.md
│   ├── 05-DOMAIN-AND-STATE-MACHINE.md
│   ├── 06-DATA-ARCHITECTURE.md
│   ├── 07-API-DESIGN.md
│   ├── 08-EVENT-DRIVEN-ARCHITECTURE.md
│   ├── 09-IDENTITY-SECURITY-AND-AUDIT.md
│   ├── 10-AI-SERVICE-DESIGN.md
│   ├── 11-GAMIFICATION-DESIGN.md
│   ├── 12-RESILIENCE-AND-OBSERVABILITY.md
│   ├── 13-DOCKER-COMPOSE-AND-OPERATIONS.md
│   ├── 14-TEST-STRATEGY.md
│   ├── 15-DEMO-AND-JURY-DEFENSE.md
│   ├── 16-IMPLEMENTATION-ROADMAP-AND-DOD.md
│   │
│   ├── adr/
│   ├── diagrams/
│   └── checklists/
│
├── contracts/
│   ├── api/
│   └── events/
│
├── src/
├── tests/
├── scripts/
└── infrastructure/
```

---

# 25. Her Markdown dosyasının görevi

| Dosya                                  | İçeriği                                                                       |
| -------------------------------------- | ----------------------------------------------------------------------------- |
| `00-START-HERE.md`                     | Projenin amacı, dokümanların okuma sırası, değişmez ana kararlar              |
| `01-REQUIREMENTS-TRACEABILITY.md`      | PDF’deki her gereksinimin servis, endpoint, event, DB, test ve demo karşılığı |
| `02-ARCHITECTURE-OVERVIEW.md`          | Sistem diyagramları, veri ve event akışları, deployment topolojisi            |
| `03-TECH-STACK.md`                     | Seçilen teknolojiler, sürümler, nedenleri, reddedilen alternatifler           |
| `04-SERVICE-BOUNDARIES.md`             | Her servisin sahip olduğu ve kesinlikle sahip olmadığı sorumluluklar          |
| `05-DOMAIN-AND-STATE-MACHINE.md`       | Transaction, risk case, state geçişleri, SLA ve domain invariant’ları         |
| `06-DATA-ARCHITECTURE.md`              | Her servis için tablolar, constraint’ler, indeksler ve migration stratejisi   |
| `07-API-DESIGN.md`                     | Endpointler, request/response, hata kodları, pagination ve idempotency        |
| `08-EVENT-DRIVEN-ARCHITECTURE.md`      | Event catalog, payload’lar, RabbitMQ topology, outbox/inbox, retry, DLQ       |
| `09-IDENTITY-SECURITY-AND-AUDIT.md`    | Auth, JWT, refresh rotation, IDOR, rate limit, XSS, SQLi, audit               |
| `10-AI-SERVICE-DESIGN.md`              | Dataset, feature engineering, modeller, eğitim, inference, doğruluk           |
| `11-GAMIFICATION-DESIGN.md`            | Puan ledger’ı, badge kuralları, leaderboard ve idempotency                    |
| `12-RESILIENCE-AND-OBSERVABILITY.md`   | Failure mode’ları, health checks, loglama, correlation ve recovery            |
| `13-DOCKER-COMPOSE-AND-OPERATIONS.md`  | Container’lar, network’ler, volume’lar, healthcheck, seed ve reset            |
| `14-TEST-STRATEGY.md`                  | Unit, integration, security, contract, resilience ve smoke testleri           |
| `15-DEMO-AND-JURY-DEFENSE.md`          | 7 dakikalık demo script’i, saldırı provası ve jüri sorularına cevaplar        |
| `16-IMPLEMENTATION-ROADMAP-AND-DOD.md` | Fazlar, geliştirme sırası, Definition of Done ve teslim checklist’i           |

## En kritik belge

```text
01-REQUIREMENTS-TRACEABILITY.md
```

Bu dokümanda PDF’nin tek bir maddesi bile kaybolmayacak.

Örnek tablo:

| Requirement                 | Owner       | API/Event             | DB                   | Test                      | Demo               |
| --------------------------- | ----------- | --------------------- | -------------------- | ------------------------- | ------------------ |
| 5 başarısız girişte kilit   | Identity    | `POST /auth/login`    | `users.locked_until` | Security integration test | Brute-force demosu |
| AI kapalıyken işlem oluştur | Transaction | `transaction.created` | `assessment_status`  | Resilience test           | AI stop demosu     |
| Yanlış refresh reuse        | Identity    | `POST /auth/refresh`  | `refresh_sessions`   | Token reuse test          | Security demosu    |

Bu dosya projenin eksik özellik yüzünden puan kaybetmesini engelleyecek.

---

# 26. ADR dosyaları

`docs/adr/` altında başlangıçta şu kararları yazacağız:

```text
ADR-001-dotnet-and-python-runtime.md
ADR-002-asynchronous-ai-assessment.md
ADR-003-rabbitmq-over-kafka.md
ADR-004-transactional-outbox-and-inbox.md
ADR-005-postgresql-database-per-service.md
ADR-006-yarp-edge-gateway.md
ADR-007-jwt-and-refresh-token-rotation.md
ADR-008-ai-recommends-transaction-assigns.md
ADR-009-sse-notification-relay.md
ADR-010-vertical-slice-service-structure.md
ADR-011-no-redis-no-llm-no-event-sourcing.md
ADR-012-blocked-case-closure.md
```

Her ADR şu formatta olacak:

```markdown
# ADR-XXX: Karar Başlığı

## Status

Accepted

## Context

Bu kararı gerektiren problem.

## Decision

Verilen kesin karar.

## Alternatives Considered

Değerlendirilen diğer seçenekler.

## Consequences

Olumlu ve olumsuz sonuçlar.

## Failure and Security Impact

Kararın hata ve güvenlik etkisi.

## Verification

Bu kararın test veya demo ile nasıl kanıtlanacağı.
```

---

# 27. Dokümanları yazma fazları

## Faz 1 — Gereksinimleri ve sınırları kilitleme

Sırayla:

```text
00-START-HERE.md
01-REQUIREMENTS-TRACEABILITY.md
02-ARCHITECTURE-OVERVIEW.md
03-TECH-STACK.md
04-SERVICE-BOUNDARIES.md
```

Bu beş dosya bitmeden kod başlamayacak.

## Faz 2 — Domain ve sözleşmeler

```text
05-DOMAIN-AND-STATE-MACHINE.md
06-DATA-ARCHITECTURE.md
07-API-DESIGN.md
08-EVENT-DRIVEN-ARCHITECTURE.md
```

Bu faz sonunda:

- state machine,
- veritabanı sahipliği,
- endpointler,
- event payload’ları

kilitlenmiş olacak.

## Faz 3 — Kritik servis detayları

```text
09-IDENTITY-SECURITY-AND-AUDIT.md
10-AI-SERVICE-DESIGN.md
11-GAMIFICATION-DESIGN.md
12-RESILIENCE-AND-OBSERVABILITY.md
```

## Faz 4 — Çalıştırma ve kanıtlama

```text
13-DOCKER-COMPOSE-AND-OPERATIONS.md
14-TEST-STRATEGY.md
15-DEMO-AND-JURY-DEFENSE.md
16-IMPLEMENTATION-ROADMAP-AND-DOD.md
```

## Faz 5 — ADR freeze

Bütün ADR’ler tamamlanır ve:

```text
Architecture Freeze v1.0
```

etiketi konur.

---

# 28. Her belge için kalite standardı

Hiçbir belge yalnızca genel açıklamalardan oluşmayacak.

Her dosyada mutlaka şunlar bulunacak:

```text
Amaç
Kapsam
Kesin kararlar
Domain kuralları
Alternatifler ve reddetme nedenleri
Failure senaryoları
Güvenlik etkileri
API/event örnekleri
Test edilebilir kabul kriterleri
PDF requirement referansları
Açık konu varsa owner ve karar tarihi
```

“Sonra bakarız”, “gerekirse”, “belki” gibi belirsiz ifadeler kullanmayacağız.

Bir konu kararsızsa:

```text
Status: OPEN
Owner:
Deadline:
Options:
Decision criteria:
```

şeklinde açıkça işaretlenecek.

---

# 29. Nihai mühendislik prensiplerimiz

Bu projede bütün kararlarımızı şu prensiplerle ölçeceğiz:

1. **İşlem hiçbir durumda kaybolmayacak.**
2. **Bir servisin çökmesi diğer servisleri topluca çökertmeyecek.**
3. **Bir event iki kez gelirse business sonucu iki kez oluşmayacak.**
4. **Bir kullanıcı yalnızca rolüne değil, sahip olduğu kaynağa göre yetkilendirilecek.**
5. **AI sonucu açıklanabilir ve model sürümüyle izlenebilir olacak.**
6. **Her önemli domain değişikliği audit edilecek.**
7. **Her mimari iddia test veya canlı demo ile kanıtlanabilecek.**
8. **PDF’deki her gereksinimin izlenebilir bir karşılığı olacak.**
9. **Gereksiz teknoloji eklenmeyecek.**
10. **Demo başarısı mimarinin bir parçası olarak tasarlanacak.**

# Şimdi oluşturacağın ana klasör

Windows PowerShell’de:

```powershell
mkdir FraudCell
cd FraudCell

mkdir docs
mkdir docs\adr
mkdir docs\diagrams
mkdir docs\checklists

mkdir contracts
mkdir contracts\api
mkdir contracts\events

mkdir src
mkdir tests
mkdir scripts
mkdir infrastructure
```

İlk yazacağımız ve tamamlamadan ikinci dosyaya geçmeyeceğimiz belge:

```text
docs/00-START-HERE.md
```

[1]: https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core?utm_source=chatgpt.com 'NET and .NET Core official support policy'
[2]: https://www.postgresql.org/docs/current/index.htm?utm_source=chatgpt.com 'PostgreSQL: Documentation: 18: PostgreSQL 18.4 Documentation'
[3]: https://www.rabbitmq.com/docs/confirms?utm_source=chatgpt.com 'Consumer Acknowledgements and Publisher Confirms'
