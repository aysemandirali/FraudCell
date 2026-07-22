# FraudCell — API Tasarımı ve HTTP Sözleşmeleri

**Doküman:** `07-API-DESIGN.md`
**Durum:** Accepted — API Baseline v1.0
**Sistem:** FraudCell — Turkcell Gerçek Zamanlı Dolandırıcılık Tespit Platformu
**Son güncelleme:** YYYY-MM-DD
**İlgili dokümanlar:**

- `00-START-HERE.md`
- `01-REQUIREMENTS-TRACEABILITY.md`
- `02-ARCHITECTURE-OVERVIEW.md`
- `03-TECH-STACK.md`
- `04-SERVICE-BOUNDARIES.md`
- `05-DOMAIN-AND-STATE-MACHINE.md`
- `06-DATA-ARCHITECTURE.md`
- `08-EVENT-DRIVEN-ARCHITECTURE.md`
- `09-IDENTITY-SECURITY-AND-AUDIT.md`
- `10-AI-SERVICE-DESIGN.md`
- `11-GAMIFICATION-DESIGN.md`
- `12-RESILIENCE-AND-OBSERVABILITY.md`
- `13-DOCKER-COMPOSE-AND-OPERATIONS.md`
- `14-TEST-STRATEGY.md`
- `15-DEMO-AND-JURY-DEFENSE.md`

---

# 1. Dokümanın Amacı

Bu doküman FraudCell sisteminin HTTP API sözleşmelerini kesinleştirir.

Bu dokümanda aşağıdaki konular tanımlanır:

- Public ve internal API ayrımı
- Gateway route’ları
- API versioning
- Authentication ve authorization sözleşmesi
- Standart response envelope
- Standart error response
- Correlation ID
- Idempotency
- Optimistic concurrency
- ETag ve `If-Match`
- Pagination
- Filtering
- Sorting
- Identity endpoint’leri
- Transaction endpoint’leri
- Risk case endpoint’leri
- AI metric ve model endpoint’leri
- Gamification endpoint’leri
- Dashboard endpoint’leri
- SSE notification endpoint’i
- Internal maintenance endpoint’leri
- Rate limiting
- OpenAPI üretimi
- API güvenlik kuralları
- API test ve kabul kriterleri

Bu doküman HTTP sözleşmelerinin ana otoritesidir.

Domain davranışının kaynağı:

```text
05-DOMAIN-AND-STATE-MACHINE.md
```

Veritabanı modelinin kaynağı:

```text
06-DATA-ARCHITECTURE.md
```

Event sözleşmelerinin kaynağı:

```text
08-EVENT-DRIVEN-ARCHITECTURE.md
```

---

# 2. API Tasarım Prensipleri

FraudCell API’leri aşağıdaki prensiplere göre tasarlanacaktır.

## 2.1 Gateway Tek Public Giriş Noktasıdır

Browser veya harici istemci yalnızca FraudCell Edge üzerinden API çağrısı yapar.

Public base URL:

```text
http://localhost:8080/api/v1
```

İç servislerin portları host ortamına açılmaz.

## 2.2 API Business Otoritesine Yönlendirilir

Her endpoint ilgili business verisinin sahibi olan serviste uygulanır.

Örnek:

- Login → Identity Service
- Transaction oluşturma → Transaction Service
- Risk case kararı → Transaction Service
- AI accuracy metriği → AI Service
- Leaderboard → Gamification Service

Gateway yalnızca route eder.

## 2.3 Generic CRUD Yerine Business Niyeti

Aşağıdaki endpoint kullanılmayacaktır:

```http
PATCH /api/v1/cases/{caseId}
Content-Type: application/json

{
  "status": "BLOKLANDI"
}
```

Bunun yerine business niyeti açık endpoint kullanılır:

```http
PATCH /api/v1/cases/{caseId}/decision
Content-Type: application/json

{
  "decision": "BLOCK",
  "note": "Müşteri işlemi reddetti ve cihaz eşleşmedi."
}
```

## 2.4 API State Machine’i Atlayamaz

Client yalnızca izin verilen command endpoint’lerini çağırabilir.

Client aşağıdaki alanları doğrudan değiştiremez:

- Case status
- SLA breach
- Assignment status
- Total points
- Badge
- AI model version
- Refresh session status
- Audit log

## 2.5 API ve Event Sorumluluğu Ayrıdır

API:

- Kullanıcı command/query istekleri
- Yönetim işlemleri
- Dashboard sorguları
- Health ve diagnostic işlemleri

için kullanılır.

Servisler arası business süreçler ağırlıklı olarak event’lerle ilerler.

## 2.6 API Sözleşmesi Versioned Olmalıdır

Public API:

```text
/api/v1
```

ile başlar.

Breaking değişiklik:

```text
/api/v2
```

gerektirir.

## 2.7 Güvenlik Frontend’e Bırakılmaz

Frontend bir butonu gizlese bile backend:

- Role
- Resource ownership
- Case assignment
- State
- Expected version

kontrollerini tekrar uygular.

---

# 3. API Katmanları

FraudCell üç HTTP API katmanına sahiptir.

## 3.1 Public API

Browser tarafından Gateway üzerinden çağrılır.

Prefix:

```text
/api/v1
```

Örnek:

```text
/api/v1/auth/staff/login
/api/v1/transactions
/api/v1/cases/{caseId}/decision
/api/v1/game/leaderboard
```

Public API:

- JWT veya public auth policy kullanır.
- Rate limit’e tabidir.
- OpenAPI ile belgelenir.
- Standart response envelope kullanır.
- Correlation ID taşır.

## 3.2 Internal API

Yalnızca Docker application network içinden erişilebilir.

Prefix:

```text
/internal/v1
```

Örnek:

```text
/internal/v1/assessments/score
/internal/v1/models/health
/internal/v1/projections/rebuild
```

Internal API:

- Gateway üzerinden public route edilmez.
- Network izolasyonuna sahiptir.
- Internal authentication kullanır.
- Rate ve request-size sınırlarına sahiptir.
- OpenAPI ile ayrıca belgelenebilir.
- Business event akışının yerine kullanılmaz.

## 3.3 Health API

Prefix:

```text
/health
```

Endpoint’ler:

```text
/health/live
/health/ready
```

Health response standart business envelope kullanmak zorunda değildir.

Health endpoint’leri minimum ve makine tarafından okunabilir JSON döner.

---

# 4. Gateway Route Haritası

| Public Route                      | Hedef Servis            |
| --------------------------------- | ----------------------- |
| `/api/v1/auth/**`                 | Identity Service        |
| `/api/v1/users/**`                | Identity Service        |
| `/api/v1/staff/**`                | Identity Service        |
| `/api/v1/reference/**`            | Identity Service        |
| `/api/v1/audit-logs/**`           | Identity Service        |
| `/api/v1/transactions/**`         | Transaction Service     |
| `/api/v1/cases/**`                | Transaction Service     |
| `/api/v1/dashboard/operations/**` | Transaction Service     |
| `/api/v1/ai/**`                   | AI Service              |
| `/api/v1/game/**`                 | Gamification Service    |
| `/api/v1/notifications/**`        | Edge Notification Relay |

Gateway route’ları:

- Path’i ilgili servise yönlendirir.
- Authorization policy uygulayabilir.
- Request header transform uygular.
- Correlation ID taşır.
- Service address’i client’a göstermez.

---

# 5. İç Servis Route’ları

Gateway aşağıdaki internal servis adreslerini Docker DNS üzerinden kullanır:

```text
http://identity-service:8080
http://transaction-service:8080
http://ai-service:8080
http://gamification-service:8080
```

Bu adresler browser veya host tarafından doğrudan çağrılamaz.

---

# 6. Content Type

JSON API request ve response’larında:

```http
Content-Type: application/json
Accept: application/json
```

kullanılır.

UTF-8 varsayılandır.

SSE endpoint’i:

```http
Content-Type: text/event-stream
```

kullanır.

Dosya upload baseline kapsamına dahil değildir.

---

# 7. Alan İsimlendirme

HTTP JSON alanları:

```text
camelCase
```

formatında olacaktır.

Örnek:

```json
{
  "transactionId": "01J...",
  "transactionNo": "TRX-2026-000123",
  "assessmentStatus": "PENDING",
  "riskScore": 0.94
}
```

Enum değerleri:

```text
UPPER_SNAKE_CASE
```

formatında olacaktır.

Örnek:

```text
MUSTERI_DOGRULAMA
CALINTI_KART
TEMPORARILY_BLOCKED
```

---

# 8. Standart Başarılı Response

Başarılı JSON response yapısı:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {
    "traceId": "01JZX5M03SBBH5QEKWKSPKFBMG"
  }
}
```

## 8.1 Alanlar

| Alan               | Açıklama                                                  |
| ------------------ | --------------------------------------------------------- |
| `success`          | İşlemin başarılı olup olmadığı                            |
| `data`             | Başarılı response verisi                                  |
| `error`            | Başarılı response’ta `null`                               |
| `meta.traceId`     | Correlation/trace kimliği                                 |
| `meta.pagination`  | Liste response’larında pagination bilgisi                 |
| `meta.generatedAt` | Gerekli rapor ve dashboard response’larında üretim zamanı |

## 8.2 Resource Oluşturma

Resource oluşturulduğunda:

```http
201 Created
Location: /api/v1/transactions/{transactionId}
```

döndürülür.

Response body standart envelope kullanır.

## 8.3 Body Olmayan Başarı

Gerçekten body gerekmeyen işlemlerde:

```http
204 No Content
```

kullanılabilir.

`204` response’unda standart envelope bulunmaz.

Ancak UI’ın güncel resource version’a ihtiyacı varsa `200` ve resource özeti tercih edilir.

---

# 9. Standart Hata Response’u

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "INVALID_CASE_TRANSITION",
    "message": "INCELENIYOR durumundan ATANDI durumuna geçilemez.",
    "details": {
      "currentState": "INCELENIYOR",
      "requestedState": "ATANDI"
    }
  },
  "meta": {
    "traceId": "01JZX5M03SBBH5QEKWKSPKFBMG"
  }
}
```

## 9.1 Hata Alanları

| Alan      | Açıklama                                |
| --------- | --------------------------------------- |
| `code`    | Programatik ve sabit hata kodu          |
| `message` | Kullanıcıya gösterilebilir Türkçe mesaj |
| `details` | Field veya domain seviyesinde ek bilgi  |
| `traceId` | Log korelasyonu                         |

## 9.2 İç Sistem Detayı Sızdırılmayacak

Response içinde aşağıdakiler bulunmayacaktır:

- Stack trace
- SQL
- Database adı
- Connection string
- Internal service hostname
- File system path
- Exception class adı
- RabbitMQ credential
- JWT signing key bilgisi
- Model artifact path’i

---

# 10. Validation Hata Formatı

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "İstek alanlarından biri veya birkaçı geçersiz.",
    "details": {
      "fields": [
        {
          "field": "amount",
          "code": "MUST_BE_GREATER_THAN_ZERO",
          "message": "Tutar sıfırdan büyük olmalıdır."
        },
        {
          "field": "transactionType",
          "code": "INVALID_ENUM_VALUE",
          "message": "Geçersiz işlem türü."
        }
      ]
    }
  },
  "meta": {
    "traceId": "01J..."
  }
}
```

Field adları request JSON alanlarıyla aynı olmalıdır.

---

# 11. HTTP Status Standartları

|                 HTTP Status | Kullanım                                              |
| --------------------------: | ----------------------------------------------------- |
|                    `200 OK` | Başarılı query veya command                           |
|               `201 Created` | Yeni resource oluşturuldu                             |
|              `202 Accepted` | Asenkron işlem kabul edildi                           |
|            `204 No Content` | Başarılı, response body yok                           |
|           `400 Bad Request` | JSON/schema/field validation hatası                   |
|          `401 Unauthorized` | Authentication yok veya geçersiz                      |
|             `403 Forbidden` | Kullanıcı doğrulandı ancak yetkili değil              |
|             `404 Not Found` | Resource yok veya ownership nedeniyle gizlendi        |
|              `409 Conflict` | Concurrency, idempotency veya unique conflict         |
|   `412 Precondition Failed` | `If-Match` resource version eşleşmedi                 |
|  `422 Unprocessable Entity` | Domain/state machine kuralı ihlali                    |
|     `429 Too Many Requests` | Rate limit                                            |
| `500 Internal Server Error` | Beklenmeyen internal hata                             |
|   `503 Service Unavailable` | Servis kendi kritik bağımlılığı nedeniyle hazır değil |

## 11.1 Concurrency için Nihai Karar

Resource version uyuşmazlığında canonical response:

```http
412 Precondition Failed
```

olacaktır.

Aynı business resource üzerinde başka tür conflict varsa:

```http
409 Conflict
```

kullanılır.

Örnek:

- ETag uyuşmazlığı → `412`
- Aynı feedback daha önce verilmiş → `409`
- Idempotency key farklı payload ile tekrar kullanılmış → `409`

---

# 12. Correlation ID

Client aşağıdaki header’ı gönderebilir:

```http
X-Correlation-ID: 01JZX5M03SBBH5QEKWKSPKFBMG
```

Header yoksa Gateway yeni correlation ID üretir.

Kurallar:

- Maksimum uzunluk uygulanır.
- Güvenli karakter seti doğrulanır.
- Servislere taşınır.
- Event envelope içine yazılır.
- Response header’ında döndürülür.
- Response `meta.traceId` alanına eklenir.

Response:

```http
X-Correlation-ID: 01JZX5M03SBBH5QEKWKSPKFBMG
```

Client tarafından gönderilen aşırı uzun veya geçersiz değer kabul edilmez; yeni değer üretilebilir.

---

# 13. Authentication

## 13.1 Access Token

Protected public API çağrıları:

```http
Authorization: Bearer {accessToken}
```

kullanır.

Access token:

- JWT’dir.
- 15 dakika geçerlidir.
- RSA ile imzalanır.
- Gateway ve business servisler tarafından doğrulanır.

## 13.2 Refresh Token

Refresh token:

- Browser’a HttpOnly cookie olarak verilir.
- JavaScript tarafından okunamaz.
- Access token response body’de dönebilir.
- Refresh token response body’de döndürülmez.

Cookie önerisi:

```text
HttpOnly
Secure production’da
SameSite=Strict veya Lax
Path=/api/v1/auth
```

## 13.3 CSRF

Refresh token cookie ile gönderildiği için refresh ve logout endpoint’lerinde:

- Same-site origin
- SameSite cookie
- Origin/Referer doğrulaması
- Gerekirse CSRF header/token

uygulanacaktır.

Access-token korumalı normal API istekleri Bearer header kullanır.

---

# 14. Authorization

Role enum:

```text
CUSTOMER
ANALYST
SUPERVISOR
ADMIN
```

## 14.1 Gateway Kontrolü

Gateway route bazlı kaba kontrol uygular.

Örnek:

```text
/dashboard/operations/** -> SUPERVISOR veya ADMIN
/audit-logs/**           -> ADMIN
```

## 14.2 Servis Kontrolü

Servis resource bazlı kontrol uygular.

Örnek analyst case query:

```text
case.id = requestedCaseId
AND case.assignedAnalystId = authenticatedUserId
```

## 14.3 Ownership Nedeniyle 404

Bir kullanıcı resource’un varlığını öğrenmemeliyse:

```http
404 Not Found
```

döndürülür.

Örnek:

- Müşteri başka müşterinin transaction ID’sini deniyor.
- Analyst başka analyst’in case ID’sini deniyor.

Role endpoint’e tamamen uygun değilse:

```http
403 Forbidden
```

döndürülür.

---

# 15. Resource Versioning: ETag ve If-Match

Mutable kritik resource response’larında:

```http
ETag: "7"
```

header’ı bulunacaktır.

Client state-changing command gönderirken:

```http
If-Match: "7"
```

header’ını göndermelidir.

Kullanılacak resource’lar:

- RiskCase
- Staff profile
- Assignment
- Refresh-session admin işlemleri gerekirse
- Model activation
- Kritik mutable ayarlar

## 15.1 If-Match Yoksa

Kritik case mutation endpoint’lerinde:

```http
428 Precondition Required
```

döndürülebilir.

Baseline kararı:

```text
Case state-changing endpoint’lerinde If-Match zorunludur.
```

## 15.2 If-Match Yanlışsa

```http
412 Precondition Failed
```

döner.

Örnek:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "RESOURCE_VERSION_MISMATCH",
    "message": "Vaka başka bir kullanıcı veya işlem tarafından güncellendi.",
    "details": {
      "expectedVersion": 7,
      "currentVersion": 8
    }
  },
  "meta": {
    "traceId": "01J..."
  }
}
```

## 15.3 Version Body İçinde Taşınmayacak

Canonical concurrency sözleşmesi header tabanlıdır.

Request body içine:

```json
{
  "expectedVersion": 7
}
```

eklenmeyecektir.

Resource response içinde görüntüleme amacıyla `version` alanı bulunabilir; ancak mutation precondition `If-Match` header’ıdır.

---

# 16. Idempotency

## 16.1 Zorunlu Idempotency

Transaction oluşturma endpoint’inde:

```http
Idempotency-Key: 01JZX5...
```

zorunludur.

Endpoint:

```text
POST /api/v1/transactions
```

## 16.2 Idempotency Scope

Scope:

```text
authenticatedUserId
+
endpoint operation
+
idempotencyKey
```

## 16.3 Aynı Key ve Aynı Payload

Önceki başarılı response döndürülür.

Yeni transaction oluşturulmaz.

Response header:

```http
Idempotency-Replayed: true
```

olabilir.

## 16.4 Aynı Key ve Farklı Payload

```http
409 Conflict
```

Hata kodu:

```text
IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD
```

## 16.5 Idempotency-Key Formatı

- Maksimum 100 karakter
- Güvenli ASCII veya ULID/UUID
- Boş olamaz
- Kullanıcının tahmin edemeyeceği unique değer tercih edilir

## 16.6 Diğer Endpoint’ler

Aşağıdaki endpoint’lerde idempotency uygulama/domain kuralıyla sağlanır:

- Customer verification response
- Case decision
- Feedback
- Refresh rotation
- Logout

Bu endpoint’lerde ayrıca `Idempotency-Key` opsiyonel desteklenebilir; ancak baseline zorunluluğu yalnızca transaction oluşturmadadır.

---

# 17. Pagination

Liste endpoint’lerinde response:

```json
{
  "success": true,
  "data": {
    "items": [],
    "page": {
      "nextCursor": "eyJ...",
      "hasMore": true,
      "limit": 20
    }
  },
  "error": null,
  "meta": {
    "traceId": "01J..."
  }
}
```

## 17.1 Query Parametreleri

```text
cursor
limit
```

Örnek:

```http
GET /api/v1/transactions?limit=20&cursor=eyJ...
```

## 17.2 Limit

Default:

```text
20
```

Minimum:

```text
1
```

Maksimum:

```text
100
```

Limit aşılırsa:

- Maksimuma normalize edilebilir veya
- `400 VALIDATION_FAILED` döndürülebilir

Baseline:

```text
Geçersiz limit 400 döndürür.
```

## 17.3 Cursor

Cursor:

- Opaque olmalıdır.
- Client tarafından parse edilmemelidir.
- Base64url encoded signed payload olabilir.
- Sort key ve ID içerir.
- Query/filter ile uyumlu olmalıdır.
- Başka filter kombinasyonunda kullanılırsa reddedilir.

## 17.4 Offset Pagination

Küçük referans listelerinde offset kullanılabilir.

Business liste endpoint’lerinde cursor tercih edilir.

---

# 18. Filtering

Filter parametreleri açık whitelist üzerinden kabul edilir.

Örnek case sorgusu:

```http
GET /api/v1/cases?status=YENI&riskLevel=KRITIK&assignmentStatus=MANUAL_QUEUE
```

Desteklenmeyen filter:

```http
400 UNSUPPORTED_FILTER
```

SQL alan adı doğrudan query parametresinden oluşturulmayacaktır.

---

# 19. Sorting

Sort syntax:

```text
sort=-slaDeadlineAt,createdAt
```

`-` işareti descending anlamına gelir.

Her endpoint açık sort whitelist’ine sahiptir.

Case listesi için örnek izin verilen alanlar:

```text
createdAt
slaDeadlineAt
riskLevel
status
```

Client database kolon adı veya arbitrary expression gönderemez.

---

# 20. Tarih Aralığı Parametreleri

Dashboard ve audit sorgularında:

```text
from
to
```

kullanılır.

Örnek:

```http
GET /api/v1/audit-logs?from=2026-07-01T00:00:00Z&to=2026-07-22T23:59:59Z
```

Kurallar:

- ISO 8601
- UTC tercih edilir
- `from < to`
- Maksimum sorgu aralığı endpoint bazında sınırlandırılır
- Geçersiz timezone reddedilir

---

# 21. Request Boyut Sınırları

Baseline:

| Alan             |          Limit |
| ---------------- | -------------: |
| Genel JSON body  |         256 KB |
| Analyst note     | 4.000 karakter |
| Decision note    | 2.000 karakter |
| Override reason  | 1.000 karakter |
| Feedback comment | 1.000 karakter |
| User agent       |   512 karakter |
| Correlation ID   |   100 karakter |
| Idempotency key  |   100 karakter |

Aşırı büyük request:

```http
413 Payload Too Large
```

döndürür.

---

# 22. Identity API Özeti

| Method   | Endpoint                           | Rol                   |
| -------- | ---------------------------------- | --------------------- |
| `POST`   | `/auth/customer/otp/challenges`    | Public                |
| `POST`   | `/auth/customer/otp/verifications` | Public                |
| `POST`   | `/auth/staff/login`                | Public                |
| `POST`   | `/auth/refresh`                    | Refresh cookie        |
| `POST`   | `/auth/logout`                     | Authenticated         |
| `GET`    | `/auth/me`                         | Authenticated         |
| `GET`    | `/auth/sessions`                   | Authenticated         |
| `DELETE` | `/auth/sessions/{sessionId}`       | Session owner         |
| `DELETE` | `/auth/sessions`                   | Authenticated         |
| `POST`   | `/staff`                           | Admin                 |
| `GET`    | `/staff`                           | Admin/Supervisor      |
| `GET`    | `/staff/{staffId}`                 | Admin/Supervisor/Self |
| `PATCH`  | `/staff/{staffId}`                 | Admin                 |
| `PUT`    | `/staff/{staffId}/role`            | Admin                 |
| `PUT`    | `/staff/{staffId}/specialties`     | Admin                 |
| `PUT`    | `/staff/{staffId}/regions`         | Admin                 |
| `GET`    | `/reference/roles`                 | Admin                 |
| `GET`    | `/reference/specialties`           | Admin/Supervisor      |
| `GET`    | `/reference/regions`               | Admin/Supervisor      |
| `GET`    | `/audit-logs`                      | Admin                 |
| `GET`    | `/audit-logs/{auditId}`            | Admin                 |

---

# 23. OTP Challenge Oluşturma

```http
POST /api/v1/auth/customer/otp/challenges
Content-Type: application/json
```

Request:

```json
{
  "gsmNumber": "+905551112233",
  "purpose": "CUSTOMER_LOGIN"
}
```

Purpose:

```text
CUSTOMER_REGISTER
CUSTOMER_LOGIN
```

Response:

```http
202 Accepted
```

```json
{
  "success": true,
  "data": {
    "challengeId": "01J...",
    "expiresAt": "2026-07-22T15:10:00Z",
    "maskedGsmNumber": "+90******2233",
    "demoHint": "Demo ortamında OTP: 1234"
  },
  "error": null,
  "meta": {
    "traceId": "01J..."
  }
}
```

`demoHint` yalnızca demo environment’ta döner.

Production profile’da bulunmaz.

GSM’nin sistemde kayıtlı olup olmadığını saldırgana açık şekilde söyleyen farklı response kullanılmamalıdır.

---

# 24. OTP Doğrulama

```http
POST /api/v1/auth/customer/otp/verifications
```

Request:

```json
{
  "challengeId": "01J...",
  "code": "1234",
  "customer": {
    "firstName": "Fırat",
    "lastName": "Atalay",
    "email": "firat@example.com"
  }
}
```

`customer` alanı yalnızca registration challenge için gereklidir.

Response:

```http
200 OK
Set-Cookie: fraudcell_refresh=...; HttpOnly; SameSite=Strict; Path=/api/v1/auth
```

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "accessTokenExpiresAt": "2026-07-22T15:15:00Z",
    "user": {
      "id": "01J...",
      "role": "CUSTOMER",
      "firstName": "Fırat",
      "lastName": "Atalay",
      "gsmNumberMasked": "+90******2233"
    }
  },
  "error": null,
  "meta": {
    "traceId": "01J..."
  }
}
```

Hatalar:

```text
OTP_CHALLENGE_NOT_FOUND
OTP_CHALLENGE_EXPIRED
OTP_CHALLENGE_LOCKED
OTP_CODE_INVALID
OTP_ALREADY_VERIFIED
```

---

# 25. Personel Login

```http
POST /api/v1/auth/staff/login
```

Request:

```json
{
  "email": "analyst@fraudcell.local",
  "password": "Secure1!"
}
```

Response:

```http
200 OK
Set-Cookie: fraudcell_refresh=...; HttpOnly; SameSite=Strict; Path=/api/v1/auth
```

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "accessTokenExpiresAt": "2026-07-22T15:15:00Z",
    "user": {
      "id": "01J...",
      "role": "ANALYST",
      "firstName": "Ayşe",
      "lastName": "Yılmaz",
      "specialties": ["CALINTI_KART", "HESAP_ELE_GECIRME"],
      "regions": ["KARADENIZ", "YURT_DISI"]
    }
  },
  "error": null,
  "meta": {
    "traceId": "01J..."
  }
}
```

Kilitli hesap:

```http
423 Locked
```

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ACCOUNT_LOCKED",
    "message": "Hesap geçici olarak kilitlenmiştir.",
    "details": {
      "lockedUntil": "2026-07-22T15:30:00Z",
      "remainingSeconds": 840
    }
  },
  "meta": {
    "traceId": "01J..."
  }
}
```

---

# 26. Access Token Yenileme

```http
POST /api/v1/auth/refresh
Cookie: fraudcell_refresh=...
```

Request body yoktur.

Response:

```http
200 OK
Set-Cookie: fraudcell_refresh={newRefreshToken}; HttpOnly; SameSite=Strict
```

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "accessTokenExpiresAt": "2026-07-22T15:30:00Z"
  },
  "error": null,
  "meta": {
    "traceId": "01J..."
  }
}
```

Refresh rotation atomiktir.

Revoke edilmiş token tekrar kullanılırsa:

```http
401 Unauthorized
```

```text
REFRESH_TOKEN_REUSE_DETECTED
```

Aynı token family içindeki bütün session’lar revoke edilir.

---

# 27. Logout

```http
POST /api/v1/auth/logout
Authorization: Bearer {token}
Cookie: fraudcell_refresh=...
```

Response:

```http
204 No Content
Set-Cookie: fraudcell_refresh=; Max-Age=0; HttpOnly; SameSite=Strict
```

Logout idempotent davranır.

Zaten revoke edilmiş session için tekrar çağrı güvenli şekilde başarılı olabilir.

---

# 28. Current User

```http
GET /api/v1/auth/me
Authorization: Bearer {token}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "01J...",
    "role": "ANALYST",
    "firstName": "Ayşe",
    "lastName": "Yılmaz",
    "email": "analyst@fraudcell.local",
    "specialties": ["CALINTI_KART"],
    "regions": ["KARADENIZ"]
  },
  "error": null,
  "meta": {
    "traceId": "01J..."
  }
}
```

Response:

```http
Cache-Control: no-store
```

kullanır.

---

# 29. Personel Oluşturma

```http
POST /api/v1/staff
Authorization: Bearer {adminToken}
```

Request:

```json
{
  "firstName": "Ayşe",
  "lastName": "Yılmaz",
  "email": "ayse.yilmaz@fraudcell.local",
  "password": "Secure1!",
  "role": "ANALYST",
  "specialties": ["CALINTI_KART", "HESAP_ELE_GECIRME"],
  "regions": ["KARADENIZ", "YURT_DISI"],
  "assignmentEnabled": true
}
```

Response:

```http
201 Created
Location: /api/v1/staff/{staffId}
```

```json
{
  "success": true,
  "data": {
    "id": "01J...",
    "firstName": "Ayşe",
    "lastName": "Yılmaz",
    "email": "ayse.yilmaz@fraudcell.local",
    "role": "ANALYST",
    "specialties": ["CALINTI_KART", "HESAP_ELE_GECIRME"],
    "regions": ["KARADENIZ", "YURT_DISI"],
    "assignmentEnabled": true,
    "version": 1,
    "createdAt": "2026-07-22T15:00:00Z"
  },
  "error": null,
  "meta": {
    "traceId": "01J..."
  }
}
```

Header:

```http
ETag: "1"
```

---

# 30. Personel Güncelleme

```http
PATCH /api/v1/staff/{staffId}
Authorization: Bearer {adminToken}
If-Match: "3"
```

Request:

```json
{
  "firstName": "Ayşe",
  "lastName": "Yılmaz",
  "assignmentEnabled": false,
  "isActive": true
}
```

Yalnızca request’te bulunan alanlar değiştirilir.

Şifre bu endpoint üzerinden değiştirilmez.

---

# 31. Personel Uzmanlık Güncelleme

```http
PUT /api/v1/staff/{staffId}/specialties
Authorization: Bearer {adminToken}
If-Match: "4"
```

Request:

```json
{
  "specialties": ["CALINTI_KART", "PARA_AKLAMA"]
}
```

`PUT` bütün uzmanlık setini replace eder.

Response güncel staff profile döndürür ve yeni ETag içerir.

---

# 32. Audit Log Listeleme

```http
GET /api/v1/audit-logs?action=CASE_BLOCKED&actorId={id}&from=...&to=...&limit=50
Authorization: Bearer {adminToken}
```

Response:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "01J...",
        "actorId": "01J...",
        "actorRole": "ANALYST",
        "action": "CASE_BLOCKED",
        "sourceService": "transaction-service",
        "resourceType": "RISK_CASE",
        "resourceId": "01J...",
        "ipAddress": "127.0.0.1",
        "result": "SUCCESS",
        "occurredAt": "2026-07-22T15:05:00Z",
        "details": {
          "previousState": "INCELENIYOR",
          "newState": "BLOKLANDI"
        }
      }
    ],
    "page": {
      "nextCursor": null,
      "hasMore": false,
      "limit": 50
    }
  },
  "error": null,
  "meta": {
    "traceId": "01J..."
  }
}
```

Sensitive audit details response öncesinde maskelenir.

---

# 33. Transaction API Özeti

| Method  | Endpoint                                   | Rol                                     |
| ------- | ------------------------------------------ | --------------------------------------- |
| `POST`  | `/transactions`                            | Customer                                |
| `GET`   | `/transactions`                            | Customer/Supervisor/Admin               |
| `GET`   | `/transactions/{transactionId}`            | Owner/Supervisor/Admin                  |
| `GET`   | `/transactions/{transactionId}/case`       | Owner/Assigned Analyst/Supervisor/Admin |
| `GET`   | `/transactions/{transactionId}/assessment` | Owner/Assigned Analyst/Supervisor/Admin |
| `GET`   | `/cases`                                   | Supervisor/Admin                        |
| `GET`   | `/cases/assigned`                          | Analyst                                 |
| `GET`   | `/cases/{caseId}`                          | Owner/Assigned Analyst/Supervisor/Admin |
| `GET`   | `/cases/{caseId}/history`                  | Assigned Analyst/Supervisor/Admin       |
| `GET`   | `/cases/{caseId}/notes`                    | Assigned Analyst/Supervisor             |
| `POST`  | `/cases/{caseId}/notes`                    | Assigned Analyst/Supervisor             |
| `POST`  | `/cases/{caseId}/review`                   | Assigned Analyst/Supervisor             |
| `POST`  | `/cases/{caseId}/verification-requests`    | Assigned Analyst/Supervisor             |
| `POST`  | `/cases/{caseId}/verification-responses`   | Customer owner                          |
| `PATCH` | `/cases/{caseId}/decision`                 | Assigned Analyst/Supervisor             |
| `PUT`   | `/cases/{caseId}/assignment`               | Supervisor                              |
| `POST`  | `/cases/{caseId}/reassignments`            | Supervisor                              |
| `PATCH` | `/cases/{caseId}/fraud-type`               | Assigned Analyst/Supervisor             |
| `PATCH` | `/cases/{caseId}/risk-level`               | Supervisor                              |
| `POST`  | `/cases/{caseId}/feedback`                 | Customer owner                          |
| `GET`   | `/cases/assignment-queue`                  | Supervisor                              |
| `GET`   | `/customer/verifications/pending`          | Customer                                |

---

# 34. Transaction Oluşturma

```http
POST /api/v1/transactions
Authorization: Bearer {customerToken}
Idempotency-Key: 01JZX5M0...
Content-Type: application/json
```

Request:

```json
{
  "amount": 25000.0,
  "currency": "TRY",
  "transactionType": "TRANSFER",
  "recipient": {
    "reference": "TR-RECIPIENT-7788"
  },
  "device": {
    "fingerprint": "device-fingerprint-value"
  },
  "location": {
    "city": "Berlin",
    "countryCode": "DE"
  },
  "occurredAt": "2026-07-22T02:14:00Z"
}
```

Response:

```http
201 Created
Location: /api/v1/transactions/{transactionId}
```

```json
{
  "success": true,
  "data": {
    "transactionId": "01JZX5M0SDYF92K25F00V3R2R8",
    "transactionNo": "TRX-2026-000123",
    "amount": 25000.0,
    "currency": "TRY",
    "transactionType": "TRANSFER",
    "assessmentStatus": "PENDING",
    "riskScore": null,
    "riskLevel": null,
    "displayRiskLevel": "BELIRSIZ",
    "screeningDecision": "INCELEME",
    "controlStatus": "ALLOWED",
    "createdAt": "2026-07-22T14:32:10Z"
  },
  "error": null,
  "meta": {
    "traceId": "01J..."
  }
}
```

`assessmentStatus=PENDING` sistem hatası değildir.

Event-driven işlemenin normal başlangıç durumudur.

---

# 35. Transaction Detayı

```http
GET /api/v1/transactions/{transactionId}
Authorization: Bearer {token}
```

Customer yalnızca kendi transaction’ını görebilir.

Response:

```json
{
  "success": true,
  "data": {
    "transactionId": "01J...",
    "transactionNo": "TRX-2026-000123",
    "amount": 25000.0,
    "currency": "TRY",
    "transactionType": "TRANSFER",
    "recipient": {
      "reference": "TR-RECIPIENT-7788"
    },
    "location": {
      "city": "Berlin",
      "countryCode": "DE"
    },
    "occurredAt": "2026-07-22T02:14:00Z",
    "assessment": {
      "status": "COMPLETED",
      "riskScore": 0.94,
      "riskLevel": "KRITIK",
      "screeningDecision": "BLOK",
      "fraudType": "CALINTI_KART",
      "modelVersion": "risk-1.0.0",
      "reasonCodes": [
        {
          "code": "NEW_DEVICE",
          "label": "İlk kez görülen cihaz",
          "impact": "HIGH"
        }
      ],
      "assessedAt": "2026-07-22T14:32:11Z"
    },
    "controlStatus": "TEMPORARILY_BLOCKED",
    "caseId": "01J...",
    "createdAt": "2026-07-22T14:32:10Z",
    "version": 3
  },
  "error": null,
  "meta": {
    "traceId": "01J..."
  }
}
```

Header:

```http
ETag: "3"
```

Customer response’unda internal analyst candidate listesi gösterilmez.

---

# 36. Customer Transaction Listesi

```http
GET /api/v1/transactions?limit=20&cursor=...
Authorization: Bearer {customerToken}
```

Customer ID query parametresi alınmaz.

Customer identity JWT’den çıkarılır.

Supervisor/Admin aşağıdaki filter’ları kullanabilir:

```text
customerId
assessmentStatus
riskLevel
transactionType
controlStatus
from
to
```

Customer başka customer ID ile filtre gönderemez.

---

# 37. Assigned Case Listesi

```http
GET /api/v1/cases/assigned?status=ATANDI&sort=slaDeadlineAt&limit=20
Authorization: Bearer {analystToken}
```

Analyst ID query parametresi alınmaz.

Analyst identity JWT’den çıkarılır.

Response:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "caseId": "01J...",
        "transactionNo": "TRX-2026-000123",
        "status": "ATANDI",
        "riskScore": 0.94,
        "riskLevel": "KRITIK",
        "fraudType": "CALINTI_KART",
        "amount": 25000.0,
        "currency": "TRY",
        "sla": {
          "priority": "KRITIK",
          "deadlineAt": "2026-07-22T14:47:11Z",
          "status": "URGENT",
          "remainingSeconds": 420
        },
        "assignedAt": "2026-07-22T14:32:12Z",
        "version": 2
      }
    ],
    "page": {
      "nextCursor": null,
      "hasMore": false,
      "limit": 20
    }
  },
  "error": null,
  "meta": {
    "traceId": "01J..."
  }
}
```

SLA remaining time server tarafından response üretim anına göre hesaplanabilir.

Breach kararı server state’inden gelir.

---

# 38. Case Detayı

```http
GET /api/v1/cases/{caseId}
Authorization: Bearer {token}
```

Erişim:

- Case customer’ı
- Assigned analyst
- Supervisor
- Admin read-only

Response aktöre göre alan filtreleyebilir.

Analyst/Supervisor response:

```json
{
  "success": true,
  "data": {
    "caseId": "01J...",
    "transaction": {
      "transactionId": "01J...",
      "transactionNo": "TRX-2026-000123",
      "amount": 25000.0,
      "currency": "TRY",
      "transactionType": "TRANSFER",
      "recipientReference": "TR-RECIPIENT-7788",
      "location": {
        "city": "Berlin",
        "countryCode": "DE"
      },
      "occurredAt": "2026-07-22T02:14:00Z",
      "controlStatus": "TEMPORARILY_BLOCKED"
    },
    "status": "ATANDI",
    "assignmentStatus": "ASSIGNED",
    "assignedAnalystId": "01J...",
    "assessment": {
      "riskScore": 0.94,
      "riskLevel": "KRITIK",
      "fraudType": "CALINTI_KART",
      "modelVersion": "risk-1.0.0",
      "reasonCodes": [
        {
          "code": "AMOUNT_DEVIATION",
          "label": "Normal işlem tutarının 8.4 katı",
          "impact": "HIGH"
        }
      ]
    },
    "effectiveRisk": {
      "riskScore": 0.94,
      "riskLevel": "KRITIK",
      "fraudType": "CALINTI_KART",
      "overridden": false
    },
    "customerVerification": null,
    "sla": {
      "priority": "KRITIK",
      "startedAt": "2026-07-22T14:32:11Z",
      "deadlineAt": "2026-07-22T14:47:11Z",
      "breachedAt": null,
      "stoppedAt": null,
      "status": "URGENT",
      "remainingSeconds": 420
    },
    "decision": null,
    "version": 2,
    "createdAt": "2026-07-22T14:32:11Z",
    "updatedAt": "2026-07-22T14:32:12Z"
  },
  "error": null,
  "meta": {
    "traceId": "01J..."
  }
}
```

Header:

```http
ETag: "2"
```

---

# 39. İncelemeye Başlama

```http
POST /api/v1/cases/{caseId}/review
Authorization: Bearer {analystToken}
If-Match: "2"
```

Request body yoktur.

Response:

```http
200 OK
ETag: "3"
```

```json
{
  "success": true,
  "data": {
    "caseId": "01J...",
    "previousStatus": "ATANDI",
    "status": "INCELENIYOR",
    "reviewStartedAt": "2026-07-22T14:34:00Z",
    "version": 3
  },
  "error": null,
  "meta": {
    "traceId": "01J..."
  }
}
```

Aynı analyst aynı endpoint’i tekrar çağırırsa mevcut state aynı ise idempotent response verilebilir.

Başka analyst:

```http
404 Not Found
```

veya açık role context’ine göre:

```http
403 Forbidden
```

Baseline ownership gizliliği için `404` tercih edilir.

---

# 40. Analyst Note Ekleme

```http
POST /api/v1/cases/{caseId}/notes
Authorization: Bearer {analystToken}
If-Match: "3"
```

Request:

```json
{
  "text": "Müşterinin olağan işlem lokasyonuyla eşleşmiyor."
}
```

Response:

```http
201 Created
Location: /api/v1/cases/{caseId}/notes/{noteId}
```

```json
{
  "success": true,
  "data": {
    "noteId": "01J...",
    "caseId": "01J...",
    "authorId": "01J...",
    "text": "Müşterinin olağan işlem lokasyonuyla eşleşmiyor.",
    "createdAt": "2026-07-22T14:35:00Z"
  },
  "error": null,
  "meta": {
    "traceId": "01J..."
  }
}
```

Not eklemek case state version’ını artırabilir.

Bu nedenle yeni ETag response header’ında dönmelidir.

---

# 41. Müşteri Doğrulaması İsteme

```http
POST /api/v1/cases/{caseId}/verification-requests
Authorization: Bearer {analystToken}
If-Match: "4"
```

Request:

```json
{
  "message": "Bu işlemi siz mi gerçekleştirdiniz?"
}
```

Response:

```http
201 Created
ETag: "5"
```

```json
{
  "success": true,
  "data": {
    "verificationId": "01J...",
    "caseId": "01J...",
    "status": "PENDING",
    "requestedAt": "2026-07-22T14:36:00Z",
    "expiresAt": "2026-07-22T14:46:00Z",
    "caseStatus": "MUSTERI_DOGRULAMA",
    "version": 5
  },
  "error": null,
  "meta": {
    "traceId": "01J..."
  }
}
```

Açık verification varken ikinci request:

```http
409 Conflict
```

```text
CUSTOMER_VERIFICATION_ALREADY_PENDING
```

---

# 42. Bekleyen Customer Verification

```http
GET /api/v1/customer/verifications/pending
Authorization: Bearer {customerToken}
```

Response:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "verificationId": "01J...",
        "caseId": "01J...",
        "transactionId": "01J...",
        "transactionNo": "TRX-2026-000123",
        "amount": 25000.0,
        "currency": "TRY",
        "transactionType": "TRANSFER",
        "location": {
          "city": "Berlin",
          "countryCode": "DE"
        },
        "occurredAt": "2026-07-22T02:14:00Z",
        "requestedAt": "2026-07-22T14:36:00Z",
        "expiresAt": "2026-07-22T14:46:00Z"
      }
    ]
  },
  "error": null,
  "meta": {
    "traceId": "01J..."
  }
}
```

---

# 43. Customer Verification Response

```http
POST /api/v1/cases/{caseId}/verification-responses
Authorization: Bearer {customerToken}
```

Request:

```json
{
  "verificationId": "01J...",
  "response": "NOT_MINE"
}
```

Response:

```http
200 OK
```

```json
{
  "success": true,
  "data": {
    "verificationId": "01J...",
    "caseId": "01J...",
    "response": "NOT_MINE",
    "respondedAt": "2026-07-22T14:38:00Z",
    "caseStatus": "INCELENIYOR",
    "transactionControlStatus": "TEMPORARILY_BLOCKED"
  },
  "error": null,
  "meta": {
    "traceId": "01J..."
  }
}
```

Customer response’unda internal effective risk score gösterilmek zorunda değildir.

Aynı verification’a ikinci cevap:

```http
409 Conflict
```

---

# 44. Case Kararı

```http
PATCH /api/v1/cases/{caseId}/decision
Authorization: Bearer {analystToken}
If-Match: "6"
```

## 44.1 Onay Request’i

```json
{
  "decision": "APPROVE",
  "note": "Müşteri davranışı ve ek kontroller sonucunda işlem meşru bulundu."
}
```

## 44.2 Blok Request’i

```json
{
  "decision": "BLOCK",
  "note": "Müşteri işlemi reddetti; yeni cihaz ve alışılmadık lokasyon tespit edildi."
}
```

`BLOCK` kararında `note` zorunludur.

Response:

```http
200 OK
ETag: "7"
```

```json
{
  "success": true,
  "data": {
    "caseId": "01J...",
    "previousStatus": "INCELENIYOR",
    "status": "BLOKLANDI",
    "decision": "BLOCK",
    "decisionNote": "Müşteri işlemi reddetti; yeni cihaz ve alışılmadık lokasyon tespit edildi.",
    "decidedBy": "01J...",
    "decidedAt": "2026-07-22T14:40:00Z",
    "transactionControlStatus": "BLOCKED",
    "sla": {
      "deadlineAt": "2026-07-22T14:47:11Z",
      "stoppedAt": "2026-07-22T14:40:00Z",
      "compliant": true
    },
    "closureDueAt": "2026-07-24T14:40:00Z",
    "version": 7
  },
  "error": null,
  "meta": {
    "traceId": "01J..."
  }
}
```

Puan bilgisi bu response içinde hesaplanmaz.

Gamification sonucu daha sonra SSE ile gelir.

---

# 45. Supervisor Override ile Karar

Supervisor aynı decision endpoint’ini kullanır.

Request:

```json
{
  "decision": "BLOCK",
  "note": "Güvenlik değerlendirmesi sonucunda işlem bloklandı.",
  "overrideReason": "Analist erişilemedi; kritik SLA süresi dolmak üzereydi."
}
```

Supervisor için `overrideReason` zorunludur.

---

# 46. Fraud Type Override

```http
PATCH /api/v1/cases/{caseId}/fraud-type
Authorization: Bearer {analystOrSupervisorToken}
If-Match: "5"
```

Request:

```json
{
  "fraudType": "HESAP_ELE_GECIRME",
  "reason": "Müşteri kartı fiziksel olarak kendisinde; hesap erişim belirtileri mevcut."
}
```

Response:

```json
{
  "success": true,
  "data": {
    "caseId": "01J...",
    "aiFraudType": "CALINTI_KART",
    "previousEffectiveFraudType": "CALINTI_KART",
    "effectiveFraudType": "HESAP_ELE_GECIRME",
    "overriddenBy": "01J...",
    "overriddenAt": "2026-07-22T14:39:00Z",
    "version": 6
  },
  "error": null,
  "meta": {
    "traceId": "01J..."
  }
}
```

Header:

```http
ETag: "6"
```

---

# 47. Risk Level Override

```http
PATCH /api/v1/cases/{caseId}/risk-level
Authorization: Bearer {supervisorToken}
If-Match: "4"
```

Request:

```json
{
  "riskLevel": "KRITIK",
  "reason": "Müşteri işlemi reddetti ve ek risk sinyalleri doğrulandı."
}
```

Response:

```json
{
  "success": true,
  "data": {
    "caseId": "01J...",
    "previousRiskLevel": "YUKSEK",
    "effectiveRiskLevel": "KRITIK",
    "sla": {
      "priority": "KRITIK",
      "startedAt": "2026-07-22T14:32:11Z",
      "deadlineAt": "2026-07-22T14:47:11Z",
      "breachedAt": null
    },
    "transactionControlStatus": "TEMPORARILY_BLOCKED",
    "version": 5
  },
  "error": null,
  "meta": {
    "traceId": "01J..."
  }
}
```

---

# 48. Manuel Assignment

```http
PUT /api/v1/cases/{caseId}/assignment
Authorization: Bearer {supervisorToken}
If-Match: "2"
```

Request:

```json
{
  "analystId": "01J...",
  "reason": "Manuel kuyruktaki kritik vaka para aklama uzmanına yönlendirildi."
}
```

Response:

```json
{
  "success": true,
  "data": {
    "caseId": "01J...",
    "assignedAnalystId": "01J...",
    "assignmentStatus": "ASSIGNED",
    "caseStatus": "ATANDI",
    "assignedAt": "2026-07-22T14:33:00Z",
    "assignmentSource": "SUPERVISOR",
    "version": 3
  },
  "error": null,
  "meta": {
    "traceId": "01J..."
  }
}
```

Analist kapasitesi doluysa:

```http
422 Unprocessable Entity
```

```text
ANALYST_CAPACITY_EXCEEDED
```

---

# 49. Reassignment

```http
POST /api/v1/cases/{caseId}/reassignments
Authorization: Bearer {supervisorToken}
If-Match: "5"
```

Request:

```json
{
  "newAnalystId": "01J...",
  "reason": "Mevcut analist vardiya dışında."
}
```

Response:

```json
{
  "success": true,
  "data": {
    "caseId": "01J...",
    "previousAnalystId": "01J...",
    "assignedAnalystId": "01J...",
    "reassignedAt": "2026-07-22T14:45:00Z",
    "caseStatus": "INCELENIYOR",
    "version": 6
  },
  "error": null,
  "meta": {
    "traceId": "01J..."
  }
}
```

Case state korunur.

---

# 50. Case Feedback

```http
POST /api/v1/cases/{caseId}/feedback
Authorization: Bearer {customerToken}
```

Request:

```json
{
  "rating": 5,
  "comment": "Süreç hızlı ve anlaşılırdı."
}
```

Koşullar:

- Case `KAPANDI`
- Actor case customer’ı
- Daha önce feedback yok

Response:

```http
201 Created
```

```json
{
  "success": true,
  "data": {
    "feedbackId": "01J...",
    "caseId": "01J...",
    "rating": 5,
    "comment": "Süreç hızlı ve anlaşılırdı.",
    "submittedAt": "2026-07-24T15:00:00Z"
  },
  "error": null,
  "meta": {
    "traceId": "01J..."
  }
}
```

---

# 51. Assignment Queue

```http
GET /api/v1/cases/assignment-queue?queueType=MANUAL_QUEUE&sort=slaDeadlineAt
Authorization: Bearer {supervisorToken}
```

Queue type:

```text
QUEUED
MANUAL_QUEUE
```

Response item:

```json
{
  "caseId": "01J...",
  "transactionNo": "TRX-2026-000124",
  "assignmentStatus": "MANUAL_QUEUE",
  "manualReviewReason": "AI_ASSESSMENT_TIMED_OUT",
  "displayRiskLevel": "BELIRSIZ",
  "slaPriority": "YUKSEK",
  "slaDeadlineAt": "2026-07-22T15:35:00Z",
  "createdAt": "2026-07-22T14:35:00Z",
  "version": 1
}
```

---

# 52. Dashboard Operations API

| Method | Endpoint                                        | Rol              |
| ------ | ----------------------------------------------- | ---------------- |
| `GET`  | `/dashboard/operations/summary`                 | Supervisor/Admin |
| `GET`  | `/dashboard/operations/risk-distribution`       | Supervisor/Admin |
| `GET`  | `/dashboard/operations/fraud-type-distribution` | Supervisor/Admin |
| `GET`  | `/dashboard/operations/risk-trend`              | Supervisor/Admin |
| `GET`  | `/dashboard/operations/sla`                     | Supervisor/Admin |
| `GET`  | `/dashboard/operations/sla-breaches`            | Supervisor/Admin |
| `GET`  | `/dashboard/operations/critical-cases`          | Supervisor/Admin |
| `GET`  | `/dashboard/operations/manual-queue`            | Supervisor/Admin |

---

# 53. Operations Summary

```http
GET /api/v1/dashboard/operations/summary?from=2026-07-22T00:00:00Z&to=2026-07-23T00:00:00Z
Authorization: Bearer {supervisorToken}
```

Response:

```json
{
  "success": true,
  "data": {
    "activeCaseCount": 42,
    "activeCriticalCaseCount": 3,
    "manualQueueCount": 5,
    "assignmentQueueCount": 2,
    "slaComplianceRate": 0.91,
    "slaBreachCount": 4,
    "nearestSlaDeadline": {
      "caseId": "01J...",
      "deadlineAt": "2026-07-22T14:47:11Z",
      "remainingSeconds": 240
    }
  },
  "error": null,
  "meta": {
    "traceId": "01J...",
    "generatedAt": "2026-07-22T14:43:11Z"
  }
}
```

---

# 54. AI API Özeti

| Method | Endpoint                           | Rol                               |
| ------ | ---------------------------------- | --------------------------------- |
| `GET`  | `/ai/models/active`                | Supervisor/Admin                  |
| `GET`  | `/ai/models/{modelVersion}`        | Supervisor/Admin                  |
| `GET`  | `/ai/metrics/overview`             | Supervisor/Admin                  |
| `GET`  | `/ai/metrics/categories`           | Supervisor/Admin                  |
| `GET`  | `/ai/metrics/decision-agreement`   | Supervisor/Admin                  |
| `GET`  | `/ai/predictions/{assessmentId}`   | Assigned Analyst/Supervisor/Admin |
| `POST` | `/internal/v1/assessments/score`   | Internal                          |
| `GET`  | `/internal/v1/models/health`       | Internal                          |
| `POST` | `/internal/v1/projections/rebuild` | Internal Admin                    |

AI’ın normal transaction assessment akışı public HTTP endpoint’i üzerinden çalışmaz.

---

# 55. Aktif AI Model Bilgisi

```http
GET /api/v1/ai/models/active
Authorization: Bearer {supervisorToken}
```

Response:

```json
{
  "success": true,
  "data": {
    "bundleVersion": "fraudcell-ai-1.0.0",
    "riskModel": {
      "version": "risk-1.0.0",
      "algorithm": "HistGradientBoostingClassifier",
      "calibrated": true
    },
    "fraudTypeModel": {
      "version": "fraud-type-1.0.0",
      "algorithm": "RandomForestClassifier"
    },
    "datasetVersion": "synthetic-tr-v1",
    "activatedAt": "2026-07-20T10:00:00Z"
  },
  "error": null,
  "meta": {
    "traceId": "01J..."
  }
}
```

Artifact path veya internal file system bilgisi response’a eklenmez.

---

# 56. AI Metric Overview

```http
GET /api/v1/ai/metrics/overview?from=...&to=...
Authorization: Bearer {supervisorToken}
```

Response:

```json
{
  "success": true,
  "data": {
    "sampleCount": 1250,
    "fraudTypeAccuracy": 0.87,
    "decisionAgreementRate": 0.91,
    "falsePositiveRate": 0.042,
    "averageInferenceMilliseconds": 34.5,
    "lateAssessmentRate": 0.008,
    "modelBundleVersion": "fraudcell-ai-1.0.0",
    "calculatedAt": "2026-07-22T14:00:00Z"
  },
  "error": null,
  "meta": {
    "traceId": "01J..."
  }
}
```

---

# 57. Kategori Bazlı AI Doğruluk

```http
GET /api/v1/ai/metrics/categories?from=...&to=...
Authorization: Bearer {supervisorToken}
```

Response:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "fraudType": "CALINTI_KART",
        "sampleCount": 320,
        "accuracy": 0.94,
        "precision": 0.93,
        "recall": 0.95,
        "f1Score": 0.94
      },
      {
        "fraudType": "PARA_AKLAMA",
        "sampleCount": 140,
        "accuracy": 0.78,
        "precision": 0.75,
        "recall": 0.73,
        "f1Score": 0.74
      }
    ]
  },
  "error": null,
  "meta": {
    "traceId": "01J...",
    "generatedAt": "2026-07-22T14:00:00Z"
  }
}
```

---

# 58. Internal AI Score Endpoint

```http
POST /internal/v1/assessments/score
Authorization: Internal {serviceToken}
Content-Type: application/json
```

Bu endpoint:

- Diagnostic
- Contract test
- Model smoke test
- Internal maintenance

içindir.

Ana transaction akışında kullanılmaz.

Request:

```json
{
  "assessmentRequestId": "01J...",
  "transactionId": "01J...",
  "amount": 25000.0,
  "currency": "TRY",
  "transactionType": "TRANSFER",
  "city": "Berlin",
  "countryCode": "DE",
  "occurredAt": "2026-07-22T02:14:00Z",
  "features": {
    "isNewDevice": true,
    "isNewRecipient": true,
    "amountDeviationRatio": 8.4,
    "transactionsLast10Minutes": 4,
    "transactionsLast24Hours": 12,
    "deviceAgeDays": 0,
    "recipientAgeDays": 0
  }
}
```

Response:

```json
{
  "assessmentId": "01J...",
  "transactionId": "01J...",
  "riskScore": 0.94,
  "riskLevel": "KRITIK",
  "decision": "BLOK",
  "fraudType": "CALINTI_KART",
  "modelVersion": "fraudcell-ai-1.0.0",
  "reasonCodes": [
    {
      "code": "NEW_DEVICE",
      "label": "İlk kez görülen cihaz",
      "impact": "HIGH"
    }
  ],
  "analystCandidates": [
    {
      "analystId": "01J...",
      "rank": 1,
      "score": 0.91,
      "expertiseScore": 1.0,
      "capacityScore": 0.7,
      "performanceScore": 0.91
    }
  ],
  "assessedAt": "2026-07-22T14:32:11Z"
}
```

Internal response business envelope kullanmak zorunda değildir; ancak tutarlılık için kullanılabilir.

Baseline:

```text
Internal API de standart envelope kullanır.
```

---

# 59. Internal API Authentication

Internal endpoint’ler aşağıdaki savunmaları birlikte kullanır:

1. Docker application network izolasyonu
2. Host’a port açılmaması
3. Servis başına ayrı internal credential
4. Constant-time credential karşılaştırması
5. Request timestamp
6. Correlation ID
7. Audit/log
8. Request body limit

Baseline header:

```http
Authorization: Internal {internalApiToken}
X-Internal-Service: transaction-service
X-Request-Timestamp: 2026-07-22T14:32:11Z
```

Internal token:

- En az 256-bit random
- Repository’de bulunmaz
- Environment/Docker secret ile sağlanır
- Servis başına ayrıdır
- Loglanmaz

Ana business akışı internal HTTP’ye bağımlı olmadığı için bu mekanizma sınırlı yüzeyde kullanılır.

---

# 60. Gamification API Özeti

| Method | Endpoint                            | Rol                           |
| ------ | ----------------------------------- | ----------------------------- |
| `GET`  | `/game/profiles/me`                 | Analyst                       |
| `GET`  | `/game/profiles/{analystId}`        | Analyst Self/Supervisor/Admin |
| `GET`  | `/game/profiles/{analystId}/points` | Analyst Self/Supervisor/Admin |
| `GET`  | `/game/profiles/{analystId}/badges` | Analyst Self/Supervisor/Admin |
| `GET`  | `/game/leaderboard`                 | Analyst/Supervisor/Admin      |
| `GET`  | `/game/badges`                      | Analyst/Supervisor/Admin      |
| `GET`  | `/game/performance/{analystId}`     | Analyst Self/Supervisor/Admin |

Gamification’da public point mutation endpoint’i bulunmaz.

Aşağıdaki endpoint yasaktır:

```text
POST /game/add-points
```

---

# 61. Gamification Profilim

```http
GET /api/v1/game/profiles/me
Authorization: Bearer {analystToken}
```

Response:

```json
{
  "success": true,
  "data": {
    "analystId": "01J...",
    "displayName": "Ayşe Yılmaz",
    "totalPoints": 1320,
    "level": "GUMUS",
    "dailyRank": 2,
    "weeklyRank": 5,
    "totalDecisions": 86,
    "averageDecisionSeconds": 510,
    "accuracyRate": 0.92,
    "badges": [
      {
        "code": "FIRST_CATCH",
        "displayName": "İlk Yakalama",
        "earnedAt": "2026-07-20T10:00:00Z"
      }
    ]
  },
  "error": null,
  "meta": {
    "traceId": "01J..."
  }
}
```

---

# 62. Puan Hareketleri

```http
GET /api/v1/game/profiles/{analystId}/points?limit=20&cursor=...
Authorization: Bearer {token}
```

Response item:

```json
{
  "ledgerId": "01J...",
  "caseId": "01J...",
  "ruleCode": "CRITICAL_WITHIN_SLA",
  "points": 15,
  "description": "Kritik vaka SLA içinde çözüldü.",
  "occurredAt": "2026-07-22T14:40:00Z"
}
```

Analyst yalnızca kendi ledger’ını görür.

Supervisor/Admin başkasını görebilir.

---

# 63. Leaderboard

```http
GET /api/v1/game/leaderboard?period=daily&limit=10
Authorization: Bearer {token}
```

Period:

```text
daily
weekly
```

Response:

```json
{
  "success": true,
  "data": {
    "period": "daily",
    "periodStart": "2026-07-22T00:00:00+03:00",
    "periodEnd": "2026-07-23T00:00:00+03:00",
    "items": [
      {
        "rank": 1,
        "analystId": "01J...",
        "displayName": "Mehmet Kaya",
        "points": 220,
        "level": "ALTIN",
        "decisionCount": 14,
        "badgeCount": 5
      },
      {
        "rank": 2,
        "analystId": "01J...",
        "displayName": "Ayşe Yılmaz",
        "points": 195,
        "level": "GUMUS",
        "decisionCount": 12,
        "badgeCount": 3
      }
    ]
  },
  "error": null,
  "meta": {
    "traceId": "01J...",
    "generatedAt": "2026-07-22T14:41:00Z"
  }
}
```

Maksimum leaderboard limit:

```text
10
```

Case gereksinimi Top 10 olduğundan daha yüksek limit public API’de kabul edilmeyebilir.

---

# 64. SSE Notification Endpoint’i

```http
GET /api/v1/notifications/stream
Authorization: Bearer {accessToken}
Accept: text/event-stream
```

Response header’ları:

```http
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

Native `EventSource` custom Authorization header göndermediği için frontend fetch tabanlı SSE client kullanır.

---

# 65. SSE Event Formatı

SSE örneği:

```text
id: 01JZX7A3P...
event: badge.earned
retry: 5000
data: {"notificationId":"01J...","type":"BADGE_EARNED","title":"Yeni rozet","message":"İlk Yakalama rozetini kazandınız.","resourceType":"BADGE","resourceId":"FIRST_CATCH","occurredAt":"2026-07-22T14:40:01Z"}
```

## 65.1 SSE Event Türleri

```text
ai.assessment.completed
transaction.temporarily.blocked
case.assigned
case.status.changed
customer.verification.requested
customer.verification.responded
gamification.points.awarded
badge.earned
leaderboard.updated
sla.warning
sla.breached
```

## 65.2 UI Güncelleme Kuralı

SSE event geldiğinde frontend:

1. Toast/modal gösterebilir.
2. İlgili TanStack Query cache’ini invalid eder.
3. Authoritative veriyi ilgili API’den tekrar çeker.

Frontend bütün server state’i yalnızca SSE payload’dan kurmaz.

## 65.3 Keepalive

Gateway düzenli keepalive comment gönderebilir:

```text
: keepalive
```

## 65.4 Reconnect

Client:

- Exponential backoff
- Access token yenileme
- AbortController
- Maksimum retry delay

kullanır.

Persistent notification history baseline kapsamında değildir.

Bağlantı kopukken kaçırılan event’lerin authoritative sonucu normal API query’sinden alınır.

---

# 66. Cache Politikası

## 66.1 No-Store Endpoint’leri

Aşağıdaki response’lar:

```http
Cache-Control: no-store
```

kullanır:

- Login
- OTP
- Refresh
- Logout
- Current user
- Session listesi
- Audit log
- Case detail
- Transaction detail
- SSE

## 66.2 Kısa Cache Kullanılabilecek Endpoint’ler

Aşağıdaki reference verileri kısa private cache kullanabilir:

- Roles
- Specialties
- Regions
- Badge definitions
- Active model metadata

Örnek:

```http
Cache-Control: private, max-age=60
```

## 66.3 Dashboard

Dashboard response’ları default olarak no-store veya çok kısa private cache kullanır.

Gerçek zamanlı operasyon ekranında stale veri açıkça belirtilmelidir.

---

# 67. Rate Limit Politikaları

Rate limiting Gateway seviyesinde uygulanır.

Identity Service ayrıca account lockout uygular.

## 67.1 Baseline Politikalar

| Policy                        |                                      Limit |
| ----------------------------- | -----------------------------------------: |
| OTP challenge — IP            |                       10 istek / 10 dakika |
| OTP challenge — GSM           |                        3 istek / 10 dakika |
| OTP verification — challenge  |                                   5 deneme |
| Staff login — IP              |                        20 istek / 5 dakika |
| Staff login — hesap           |       5 başarısız deneme → 15 dakika kilit |
| Refresh — session/IP          |                       30 istek / 10 dakika |
| Transaction create — customer |                          20 istek / dakika |
| Genel authenticated read      |                         120 istek / dakika |
| Genel authenticated write     |                          60 istek / dakika |
| Dashboard                     |                          60 istek / dakika |
| SSE connection                | Kullanıcı başına maksimum 3 aktif bağlantı |
| Internal API                  | Servis credential başına 60 istek / dakika |

Bu değerler environment/config ile değişebilir.

## 67.2 Rate Limit Response

```http
429 Too Many Requests
Retry-After: 60
```

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.",
    "details": {
      "retryAfterSeconds": 60
    }
  },
  "meta": {
    "traceId": "01J..."
  }
}
```

## 67.3 Key Seçimi

Rate-limit key:

- Authenticated user ID
- IP
- GSM hash
- Login identifier hash
- Internal service identity

kombinasyonuna göre endpoint bazında belirlenir.

---

# 68. Timeout Politikası

Gateway request timeout’ları endpoint türüne göre ayrılır.

| Endpoint türü        |                            Timeout |
| -------------------- | ---------------------------------: |
| Normal API query     |                           5 saniye |
| Normal API command   |                          10 saniye |
| Dashboard query      |                          10 saniye |
| AI metrics           |                          10 saniye |
| Internal diagnostics |                          10 saniye |
| SSE                  |  Normal request timeout uygulanmaz |
| File/model training  | Public API üzerinden çalıştırılmaz |

Transaction oluşturma AI sonucunu beklemediği için normal command timeout içinde tamamlanır.

---

# 69. Retry Politikası

Browser/client otomatik retry yaparken dikkatli davranmalıdır.

## 69.1 Güvenli Retry

Retry yapılabilir:

- `GET`
- Idempotency-Key içeren `POST /transactions`
- Network sonucu bilinmeyen query’ler

## 69.2 Otomatik Retry Yapılmayacak

Client aşağıdaki command’leri otomatik ve kontrolsüz tekrar etmez:

- Case decision
- Assignment
- Reassignment
- Fraud type override
- Feedback
- Refresh reuse riskine neden olabilecek paralel refresh

Bu işlemler state, `If-Match` ve domain idempotency ile korunur.

---

# 70. CORS ve Origin Politikası

React uygulaması Edge tarafından aynı origin’den servis edilir.

Bu nedenle normal demo/production topolojisinde cross-origin API çağrısı gerekmez.

CORS default olarak kapalı veya yalnızca açık izin verilen development origin’lerine sınırlıdır.

Wildcard yasaktır:

```text
Access-Control-Allow-Origin: *
```

özellikle credential kullanılan auth endpoint’lerinde kullanılmayacaktır.

---

# 71. Security Header’ları

Edge aşağıdaki header’ları uygular:

```text
Content-Security-Policy
X-Content-Type-Options: nosniff
Referrer-Policy
Permissions-Policy
Strict-Transport-Security production HTTPS’te
frame-ancestors CSP directive
```

Deprecated veya gereksiz header’lar yerine modern CSP tercih edilir.

---

# 72. OpenAPI Üretimi

Her public servis OpenAPI üretmelidir.

Minimum zorunlu:

```text
Transaction Service
AI Service
```

Hedef:

```text
Identity
Transaction
AI
Gamification
```

OpenAPI dosyaları CI sırasında export edilir:

```text
contracts/api/identity.openapi.json
contracts/api/transaction.openapi.json
contracts/api/ai.openapi.json
contracts/api/gamification.openapi.json
```

---

# 73. OpenAPI Gereksinimleri

Her operation aşağıdakileri içermelidir:

- Operation ID
- Tag
- Summary
- Description
- Authentication requirement
- Role bilgisi
- Request schema
- Response schema
- Error response’ları
- Örnek request
- Örnek response
- Correlation header
- ETag/If-Match header gerektiğinde
- Idempotency-Key gerektiğinde
- Rate limit notu
- Deprecated bilgisi gerektiğinde

Operation ID örnekleri:

```text
RequestCustomerOtp
VerifyCustomerOtp
LoginStaff
CreateTransaction
GetTransaction
StartCaseReview
SubmitCaseDecision
GetAiMetrics
GetLeaderboard
```

---

# 74. OpenAPI Security Scheme

Bearer scheme:

```yaml
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

Refresh token cookie scheme dokümantasyonu:

```yaml
refreshCookie:
  type: apiKey
  in: cookie
  name: fraudcell_refresh
```

Internal auth ayrı OpenAPI dokümanında tanımlanabilir:

```yaml
internalAuth:
  type: http
  scheme: bearer
  bearerFormat: InternalToken
```

---

# 75. Swagger/OpenAPI UI Güvenliği

Demo ortamında API dokümantasyonu Gateway altında erişilebilir olabilir:

```text
/docs/identity
/docs/transaction
/docs/ai
/docs/gamification
```

Production benzeri ortamda:

- Admin auth
- Internal network
- Feature flag

ile sınırlandırılabilir.

Swagger UI CDN’e bağımlı olmamalıdır.

Gerekli static asset’ler local olarak sunulmalıdır.

---

# 76. OpenAPI Contract CI Kontrolü

CI aşağıdakileri kontrol eder:

- OpenAPI geçerli
- Duplicate operation ID yok
- Schema reference bozuk değil
- Security requirement tanımlı
- Zorunlu error response’ları mevcut
- Public endpoint version prefix kullanıyor
- Breaking change tespiti
- Generated contract repository artifact’ıyla uyumlu

Breaking API değişikliği açıkça review edilmelidir.

---

# 77. API Versioning

## 77.1 Public API

Path versioning:

```text
/api/v1
```

kullanılır.

## 77.2 Internal API

```text
/internal/v1
```

kullanılır.

## 77.3 Breaking Change Örnekleri

- Required request alanı eklemek
- Response alanının anlamını değiştirmek
- Enum değerini yeniden adlandırmak
- Endpoint path değiştirmek
- Alan tipini değiştirmek
- Error code anlamını değiştirmek

Breaking değişiklik yeni major API version gerektirir.

## 77.4 Backward-Compatible Örnekler

- Optional response alanı eklemek
- Yeni endpoint eklemek
- Optional query filter eklemek
- Yeni event type eklemek
- Yeni nullable field eklemek

Consumer unknown field’ları görmezden gelebilmelidir.

---

# 78. Deprecation

Deprecated endpoint:

```http
Deprecation: true
Sunset: Wed, 31 Dec 2026 23:59:59 GMT
Link: </api/v2/...>; rel="successor-version"
```

header’ları kullanabilir.

Baseline v1 içinde planlı deprecated endpoint bulunmamaktadır.

---

# 79. API Error Code Grupları

## Authentication

```text
AUTHENTICATION_REQUIRED
INVALID_CREDENTIALS
ACCOUNT_LOCKED
OTP_CHALLENGE_NOT_FOUND
OTP_CHALLENGE_EXPIRED
OTP_CODE_INVALID
ACCESS_TOKEN_EXPIRED
ACCESS_TOKEN_INVALID
REFRESH_TOKEN_INVALID
REFRESH_TOKEN_EXPIRED
REFRESH_TOKEN_REUSE_DETECTED
```

## Authorization

```text
FORBIDDEN
RESOURCE_ACCESS_DENIED
ROLE_NOT_ALLOWED
CASE_NOT_ASSIGNED_TO_ACTOR
CUSTOMER_NOT_OWNER
```

## Validation

```text
VALIDATION_FAILED
INVALID_ENUM_VALUE
PAYLOAD_TOO_LARGE
UNSUPPORTED_FILTER
UNSUPPORTED_SORT
INVALID_CURSOR
```

## Transaction

```text
TRANSACTION_NOT_FOUND
INVALID_TRANSACTION_AMOUNT
UNSUPPORTED_CURRENCY
IDEMPOTENCY_KEY_REQUIRED
IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD
```

## Case

```text
CASE_NOT_FOUND
INVALID_CASE_TRANSITION
CASE_ALREADY_DECIDED
CASE_ALREADY_CLOSED
DECISION_NOTE_REQUIRED
CUSTOMER_VERIFICATION_ALREADY_PENDING
ANALYST_CAPACITY_EXCEEDED
```

## Concurrency

```text
PRECONDITION_REQUIRED
RESOURCE_VERSION_MISMATCH
CONCURRENCY_CONFLICT
```

## Dependency

```text
SERVICE_TEMPORARILY_UNAVAILABLE
DATABASE_UNAVAILABLE
INTERNAL_OPERATION_FAILED
```

Client yalnızca tanımlı error code’lara göre davranmalıdır.

`message` metnini programatik karar için parse etmemelidir.

---

# 80. API Güvenlik Testleri

## 80.1 SQL Injection

Test girdileri:

```text
' OR 1=1 --
'; DROP TABLE users; --
```

Beklenen:

- Validation veya normal güvenli sorgu sonucu
- SQL hata detayı yok
- Veri sızıntısı yok

## 80.2 IDOR

- Customer A token’ıyla Customer B transaction ID’si
- Analyst A token’ıyla Analyst B case ID’si

Beklenen:

```http
404
```

veya açık policy’ye göre `403`.

## 80.3 JWT Manipülasyonu

- Payload değişikliği
- Signature silme
- `alg=none`
- Yanlış issuer
- Yanlış audience
- Expired token

Beklenen:

```http
401
```

## 80.4 Refresh Reuse

1. Refresh token kullanılır.
2. Yeni token alınır.
3. Eski token tekrar kullanılır.

Beklenen:

- `401`
- Family revoke
- Aktif session’ların iptali
- Audit kaydı

## 80.5 XSS

Not:

```html
<script>
  alert(1);
</script>
```

Beklenen:

- Plain text saklama veya validation
- Browser’da script çalışmaması
- CSP koruması

## 80.6 Brute Force

Hızlı login denemeleri.

Beklenen:

- Gateway `429`
- Hesap bazlı 5 başarısız denemede 15 dakika lock
- Audit kayıtları

## 80.7 Mass Assignment

Client body’ye yetkisiz alan ekler:

```json
{
  "status": "BLOKLANDI",
  "totalPoints": 999999,
  "role": "ADMIN"
}
```

Beklenen:

- Alanlar bind edilmez
- Unknown field policy’ye göre reddedilir
- Business state değişmez

---

# 81. API Contract Testleri

Her endpoint için contract test en az aşağıdakileri doğrular:

- HTTP method
- Path
- Authentication
- Role
- Required header
- Request schema
- Success status
- Success schema
- Error schema
- Correlation ID
- ETag gerekiyorsa
- Idempotency gerekiyorsa
- Ownership
- Rate limit
- OpenAPI uyumu

---

# 82. Endpoint Definition of Done

Bir endpoint tamamlanmış sayılabilmesi için:

1. OpenAPI operation tanımlı
2. Request schema tanımlı
3. Response schema tanımlı
4. Error code’lar tanımlı
5. Authentication uygulanmış
6. Authorization uygulanmış
7. Ownership uygulanmış
8. Validation uygulanmış
9. Correlation loglanmış
10. Audit gereksinimi değerlendirilmiş
11. Integration test yazılmış
12. Security test değerlendirilmiş
13. Rate limit policy atanmış
14. API örneği dokümante edilmiş
15. PII/log kontrolü yapılmış
16. Gerekliyse ETag/If-Match uygulanmış
17. Gerekliyse Idempotency-Key uygulanmış
18. Gerekliyse event/outbox oluşturulmuş

---

# 83. API Kabul Kriterleri

## Gateway

- Bütün public API trafiği Gateway’den geçer.
- İç servis portları host’a açık değildir.
- Route mapping integration testleri geçer.
- JWT Gateway ve servis tarafından doğrulanır.
- Rate limit çalışır.
- Correlation ID taşınır.

## Identity

- OTP challenge ve verification çalışır.
- Staff login çalışır.
- Refresh rotation çalışır.
- Refresh reuse bütün family’yi revoke eder.
- Admin personel oluşturabilir.
- Non-admin personel oluşturamaz.
- Audit log yalnızca admin tarafından görüntülenir.

## Transaction

- Transaction create `Idempotency-Key` zorunludur.
- Transaction ilk response’ta `PENDING` dönebilir.
- Customer yalnızca kendi transaction’ını görür.
- Analyst yalnızca atanmış case’i görür.
- State mutation endpoint’leri `If-Match` ister.
- Geçersiz transition `422` döner.
- Version uyuşmazlığı `412` döner.
- Block note olmadan karar verilmez.
- Feedback yalnızca kapalı case için kabul edilir.

## AI

- Public metric ve model endpoint’leri çalışır.
- Kategori bazlı doğruluk döner.
- Internal score endpoint’i public route edilmez.
- Ana assessment akışı HTTP’ye bağımlı değildir.

## Gamification

- Profil ve leaderboard endpoint’leri çalışır.
- Top 10 günlük ve haftalık sonuç döner.
- Public puan ekleme endpoint’i bulunmaz.
- Analyst yalnızca kendi detayını görür.
- Supervisor/Admin diğer analyst performansını görebilir.

## SSE

- Authorization header ile bağlantı kurulur.
- Kullanıcı yalnızca kendi notification’larını alır.
- Badge ve assessment bildirimleri gelir.
- Reconnect çalışır.
- SSE event sonrası authoritative API query invalid edilir.

## OpenAPI

- Transaction ve AI OpenAPI zorunlu olarak üretilir.
- Bütün endpoint’ler örnek request/response içerir.
- Security scheme tanımlıdır.
- Contract validation CI’da geçer.

---

# 84. Nihai API Karar Özeti

| Konu                  | Nihai Karar                                        |
| --------------------- | -------------------------------------------------- |
| Public base path      | `/api/v1`                                          |
| Internal base path    | `/internal/v1`                                     |
| Public giriş          | Yalnızca FraudCell Edge                            |
| Format                | JSON, camelCase                                    |
| Enum                  | UPPER_SNAKE_CASE                                   |
| Success envelope      | `{ success, data, error, meta }`                   |
| Error code            | Sabit programatik code                             |
| Authentication        | Bearer JWT                                         |
| Refresh token         | HttpOnly cookie                                    |
| Authorization         | Gateway role + servis ownership                    |
| Resource concurrency  | ETag + If-Match                                    |
| Version uyuşmazlığı   | `412 Precondition Failed`                          |
| Idempotency           | Transaction create’ta zorunlu                      |
| Pagination            | Cursor/keyset                                      |
| Filtering             | Whitelist                                          |
| Sorting               | Whitelist                                          |
| API versioning        | URL path                                           |
| OpenAPI               | Bütün servislerde hedef, Transaction ve AI zorunlu |
| Internal API auth     | Network izolasyonu + internal token                |
| SSE                   | Fetch tabanlı authenticated stream                 |
| CORS                  | Same-origin, wildcard yok                          |
| Public point mutation | Yok                                                |
| Generic status update | Yok                                                |
| API’den hard delete   | Yok                                                |
| Internal error detayı | Sızdırılmaz                                        |

---

# 85. Son API İlkeleri

1. Gateway tek public giriş noktasıdır.
2. Gateway business logic içermez.
3. Her endpoint doğru business servisine aittir.
4. Client case state’ini doğrudan yazamaz.
5. Business niyeti command endpoint’iyle ifade edilir.
6. Authentication Gateway ve servis seviyesinde doğrulanır.
7. Role tek başına resource erişimi sağlamaz.
8. Ownership query seviyesinde uygulanır.
9. Mutable kritik resource’larda ETag ve `If-Match` kullanılır.
10. Transaction create idempotenttir.
11. Hata kodları programatik ve sabittir.
12. Stack trace ve internal altyapı bilgisi client’a dönmez.
13. Liste endpoint’leri kontrolsüz büyük response üretmez.
14. Filter ve sort alanları whitelist’tir.
15. AI ana akışı senkron HTTP’ye bağlı değildir.
16. Gamification puanı public command ile değiştirilemez.
17. SSE transport’tur; authoritative veri API’den alınır.
18. API dokümantasyonu internet bağlantısı olmadan açılabilir.
19. Her endpoint integration ve security testleriyle doğrulanır.
20. Breaking değişiklik yeni API version gerektirir.

---

# 86. Sonraki Doküman

Bu dokümandan sonra hazırlanacak dosya:

```text
08-EVENT-DRIVEN-ARCHITECTURE.md
```

Bu dosyada aşağıdakiler kesinleştirilecektir:

- RabbitMQ exchange ve queue topolojisi
- Routing key standardı
- Event envelope
- Event isimlendirme
- Bütün event kataloğu
- Producer ve consumer matrisi
- Her event’in payload sözleşmesi
- Transactional outbox
- Idempotent inbox
- Publisher confirm
- Consumer acknowledgement
- Retry queue
- Dead-letter queue
- Poison message yönetimi
- Event ordering
- Duplicate delivery
- Correlation ve causation
- Event versioning
- Schema compatibility
- Audit event’leri
- Notification event’leri
- Servis kapanması ve recovery davranışı
