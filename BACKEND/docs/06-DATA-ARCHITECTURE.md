# FraudCell — Veri Mimarisi ve Veritabanı Tasarımı

**Doküman:** `06-DATA-ARCHITECTURE.md`
**Durum:** Accepted — Data Architecture Baseline v1.0
**Sistem:** FraudCell — Turkcell Gerçek Zamanlı Dolandırıcılık Tespit Platformu
**Son güncelleme:** YYYY-MM-DD
**İlgili dokümanlar:**

- `00-START-HERE.md`
- `01-REQUIREMENTS-TRACEABILITY.md`
- `02-ARCHITECTURE-OVERVIEW.md`
- `03-TECH-STACK.md`
- `04-SERVICE-BOUNDARIES.md`
- `05-DOMAIN-AND-STATE-MACHINE.md`
- `07-API-DESIGN.md`
- `08-EVENT-DRIVEN-ARCHITECTURE.md`
- `09-IDENTITY-SECURITY-AND-AUDIT.md`
- `10-AI-SERVICE-DESIGN.md`
- `11-GAMIFICATION-DESIGN.md`
- `12-RESILIENCE-AND-OBSERVABILITY.md`
- `13-DOCKER-COMPOSE-AND-OPERATIONS.md`
- `14-TEST-STRATEGY.md`

---

# 1. Dokümanın Amacı

Bu doküman FraudCell sistemindeki veri sahipliğini ve fiziksel veritabanı tasarımını kesinleştirir.

Bu dokümanda aşağıdaki konular tanımlanır:

- Kaç PostgreSQL instance kullanılacağı
- Her veritabanının hangi servise ait olduğu
- Servislerin hangi schema ve tabloları kullandığı
- Veri tipleri ve isimlendirme standartları
- Primary key, foreign key ve unique constraint’ler
- Check constraint’ler
- Partial index’ler
- Query ve worker indeksleri
- Optimistic concurrency alanları
- Transaction numarası üretimi
- Refresh token rotation veri modeli
- Audit log veri modeli
- Transaction ve RiskCase veri modeli
- AI model, prediction ve feedback veri modeli
- Gamification ledger ve leaderboard veri modeli
- Transactional outbox
- Idempotent inbox
- Migration ve seed stratejisi
- Runtime ve migration database kullanıcıları
- Veri saklama ve silme politikası
- Hassas veri sınıflandırması
- Veri bütünlüğü ve transaction sınırları
- Backup, reset ve test verisi yaklaşımı

Bu doküman veri yapısının ana otoritesidir.

Domain davranışı `05-DOMAIN-AND-STATE-MACHINE.md`, API sözleşmeleri `07-API-DESIGN.md`, event sözleşmeleri ise `08-EVENT-DRIVEN-ARCHITECTURE.md` içinde tanımlanır.

---

# 2. Ana Veri Mimarisi Kararı

FraudCell dört fiziksel PostgreSQL container kullanacaktır:

```text
identity-db
transaction-db
ai-db
gamification-db
```

Her veritabanı için aşağıdakiler ayrı olacaktır:

- PostgreSQL container
- Database
- Database owner
- Runtime application user
- Migration user
- Password
- Volume
- Docker network
- Connection string
- Migration history
- Backup/reset işlemi

Tek PostgreSQL container içinde dört database kullanılması baseline mimaride kabul edilmez.

Tek database içinde dört schema kullanılması da kabul edilmez.

Fiziksel ayrımın amacı:

1. Database-per-service kuralını açık biçimde karşılamak
2. Başka servisin verisine doğrudan erişimi engellemek
3. Servisleri ayrı failure domain’lere ayırmak
4. Diskalifiye riskini ortadan kaldırmak
5. Servis sahipliğini teknik olarak kanıtlamak
6. Her servisin bağımsız migration yapabilmesini sağlamak

---

# 3. Veritabanı ve Schema İsimleri

| Servis               | Container         | Database                 | Schema     |
| -------------------- | ----------------- | ------------------------ | ---------- |
| Identity Service     | `identity-db`     | `fraudcell_identity`     | `identity` |
| Transaction Service  | `transaction-db`  | `fraudcell_transaction`  | `txn`      |
| AI Service           | `ai-db`           | `fraudcell_ai`           | `ai`       |
| Gamification Service | `gamification-db` | `fraudcell_gamification` | `game`     |

Her database yalnızca tek business servisine aittir.

Servis-specific schema kullanılmasının amacı:

- Tablo sahipliğini açık hale getirmek
- PostgreSQL internal tablolarından ayrım sağlamak
- Migration ve yetki yönetimini sadeleştirmek
- SQL ve loglarda servis bağlamını görünür kılmak

---

# 4. Database Kullanıcıları ve Yetkiler

Her database için en az iki kullanıcı bulunacaktır.

## 4.1 Migration User

Örnek:

```text
identity_migrator
transaction_migrator
ai_migrator
gamification_migrator
```

Migration user:

- Schema oluşturabilir
- Tablo oluşturabilir
- Tablo değiştirebilir
- Index oluşturabilir
- Constraint oluşturabilir
- Migration history yazabilir
- Seed için gerekli yapısal işlemleri yapabilir

Migration credential normal service runtime container’ına verilmemelidir.

## 4.2 Runtime User

Örnek:

```text
identity_app
transaction_app
ai_app
gamification_app
```

Runtime user:

- Yalnızca kendi schema’sına erişebilir
- Business tablolarında gerekli `SELECT`, `INSERT`, `UPDATE` haklarına sahiptir
- Gerekmeyen tablolarda `DELETE` hakkına sahip değildir
- Schema değiştiremez
- Migration çalıştıramaz
- Başka database’e erişemez

## 4.3 Append-Only Tablolar

Aşağıdaki tablolarda runtime user için `UPDATE` ve `DELETE` hakkı verilmemesi hedeflenir:

```text
identity.audit_logs
txn.case_transitions
txn.case_overrides
game.point_ledger
game.earned_badges
```

Uygulama seviyesinde de bu tabloları değiştiren endpoint bulunmayacaktır.

## 4.4 Database Owner

Database owner uygulama runtime user’ı olmayacaktır.

Örnek:

```text
fraudcell_identity_owner
fraudcell_transaction_owner
fraudcell_ai_owner
fraudcell_gamification_owner
```

Owner credential normal runtime sırasında kullanılmayacaktır.

---

# 5. Docker Network İzolasyonu

Database network üyelikleri:

```text
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

Aşağıdaki erişimler network seviyesinde başarısız olmalıdır:

```text
transaction-service -> identity-db
transaction-service -> ai-db
transaction-service -> gamification-db

identity-service -> transaction-db
identity-service -> ai-db
identity-service -> gamification-db

ai-service -> identity-db
ai-service -> transaction-db
ai-service -> gamification-db

gamification-service -> identity-db
gamification-service -> transaction-db
gamification-service -> ai-db

gateway -> bütün database container’ları
```

Database portları host ortamına açılmayacaktır.

Local debugging için port açılması gerekiyorsa yalnızca ayrı debug Compose profile altında yapılabilir.

---

# 6. Ortak Veri Standartları

## 6.1 Tablo ve Kolon İsimleri

PostgreSQL isimleri:

```text
snake_case
```

formatında olacaktır.

Örnek:

```text
risk_cases
assigned_analyst_id
sla_deadline_at
```

Quoted identifier kullanılmayacaktır.

Yanlış:

```sql
"RiskCases"
"AssignedAnalystId"
```

Doğru:

```sql
risk_cases
assigned_analyst_id
```

## 6.2 Primary Key

Internal entity ID’leri ULID olacaktır.

PostgreSQL tipi:

```text
varchar(26)
```

Örnek check constraint:

```sql
CHECK (
    char_length(id) = 26
    AND id ~ '^[0-9A-HJKMNP-TV-Z]{26}$'
)
```

ULID değerleri uppercase canonical formatta saklanacaktır.

## 6.3 Timestamp

Bütün zaman alanları:

```text
timestamptz
```

olacaktır.

Uygulama bütün tarihleri UTC gönderir ve okur.

Standart kolonlar:

```text
created_at
updated_at
occurred_at
processed_at
published_at
```

Database `now()` kullanabilir; ancak domain tarafından belirlenen kritik zamanlar uygulama clock’undan açıkça gönderilir.

## 6.4 Para

Para alanları:

```text
numeric(18,2)
```

olacaktır.

Floating-point kullanılmayacaktır.

Currency:

```text
char(3)
```

olarak saklanır.

Baseline:

```text
TRY
```

## 6.5 Risk Skoru

Risk skoru:

```text
numeric(6,5)
```

olarak saklanır.

Geçerli aralık:

```sql
CHECK (risk_score >= 0 AND risk_score <= 1)
```

Bu tip aşağıdaki değerleri güvenli biçimde saklar:

```text
0.00000
0.40000
0.90000
0.90001
1.00000
```

## 6.6 Enum Saklama

PostgreSQL native enum kullanılmayacaktır.

Enum alanları:

```text
varchar
+
CHECK constraint
```

ile saklanacaktır.

Nedenleri:

- Migration’ın daha kolay olması
- Event/API enum’larıyla açık eşleşme
- Enum değerlerinin deployment sırasında kontrollü genişletilmesi
- PostgreSQL native enum rollback zorluklarından kaçınma

Örnek:

```sql
status varchar(32) NOT NULL
CHECK (
    status IN (
        'YENI',
        'ATANDI',
        'INCELENIYOR',
        'MUSTERI_DOGRULAMA',
        'ONAYLANDI',
        'BLOKLANDI',
        'KAPANDI'
    )
)
```

## 6.7 Boolean

Boolean alanlar:

```text
boolean NOT NULL
```

olacaktır.

Mümkün olan yerlerde explicit default kullanılır:

```sql
is_active boolean NOT NULL DEFAULT true
```

## 6.8 JSONB Kullanımı

JSONB yalnızca aşağıdaki alanlarda kullanılacaktır:

- Event payload
- Event headers
- AI feature snapshot
- AI reason codes
- Prediction candidate listesi
- Audit details
- Değişken model metrics
- Request/response idempotency snapshot

Temel business ilişkileri JSONB içinde saklanmayacaktır.

Yanlış:

```text
risk_case içindeki bütün assignment geçmişini JSONB olarak tutmak
```

Doğru:

```text
case_assignments tablosu
```

## 6.9 Hash Alanları

Hash değerleri açık isimlendirilir:

```text
token_hash
device_fingerprint_hash
request_hash
payload_hash
artifact_sha256
```

Hash algoritması ve encoding ilgili güvenlik/AI dokümanında tanımlanır.

---

# 7. Ortak Audit Kolonları

Mutable business tablolarında mümkün olan yerlerde:

```text
created_at
updated_at
version
```

kolonları bulunacaktır.

Soft delete kullanılan sınırlı tablolarda:

```text
deactivated_at
deleted_at
```

bulunabilir.

Ancak transaction ve case kayıtlarında generic soft delete kullanılmayacaktır.

## 7.1 Optimistic Concurrency

Kritik mutable tablolarda:

```text
version bigint NOT NULL DEFAULT 0
```

alanı bulunacaktır.

Her update:

```text
version = version + 1
```

yapar.

Update koşulu:

```sql
WHERE id = @id
AND version = @expected_version
```

olmalıdır.

Etkilenen satır sayısı `0` ise uygulama:

```text
409 CONCURRENCY_CONFLICT
```

döner.

---

# 8. Identity Database Genel Modeli

Identity Database ana tabloları:

```text
identity.users
identity.customer_profiles
identity.staff_profiles
identity.roles
identity.user_roles
identity.specialties
identity.staff_specialties
identity.regions
identity.staff_regions
identity.otp_challenges
identity.login_attempts
identity.refresh_sessions
identity.audit_logs
identity.outbox_messages
identity.inbox_messages
```

ASP.NET Core Identity’nin gerekli internal tabloları ayrıca bulunabilir:

```text
identity.user_claims
identity.role_claims
identity.user_logins
identity.user_tokens
```

Kullanılmayan framework tabloları business logic için kullanılmayacaktır.

---

# 9. Identity — users

## 9.1 Amaç

Bütün müşteri ve personel hesaplarının ana identity kaydıdır.

## 9.2 Kolonlar

| Kolon                 | Tip            | Zorunlu | Açıklama                            |
| --------------------- | -------------- | ------: | ----------------------------------- |
| `id`                  | `varchar(26)`  |    Evet | ULID                                |
| `user_type`           | `varchar(16)`  |    Evet | `CUSTOMER`, `STAFF`                 |
| `email`               | `varchar(320)` |   Hayır | Orijinal e-posta                    |
| `normalized_email`    | `varchar(320)` |   Hayır | Upper/lower normalize edilmiş değer |
| `gsm_number`          | `varchar(20)`  |   Hayır | Normalize E.164 GSM                 |
| `password_hash`       | `text`         |   Hayır | Personel şifre hash’i               |
| `security_stamp`      | `varchar(128)` |    Evet | Session invalidation                |
| `is_active`           | `boolean`      |    Evet | Hesap aktif mi                      |
| `access_failed_count` | `integer`      |    Evet | Başarısız login sayısı              |
| `lockout_end_at`      | `timestamptz`  |   Hayır | Kilit bitiş zamanı                  |
| `last_login_at`       | `timestamptz`  |   Hayır | Son başarılı login                  |
| `created_at`          | `timestamptz`  |    Evet | Oluşturma zamanı                    |
| `updated_at`          | `timestamptz`  |    Evet | Güncelleme zamanı                   |
| `version`             | `bigint`       |    Evet | Concurrency                         |

## 9.3 Constraint’ler

```sql
CHECK (user_type IN ('CUSTOMER', 'STAFF'))
CHECK (access_failed_count >= 0)
```

Customer için GSM zorunluluğu uygulama ve database check’iyle korunabilir:

```sql
CHECK (
    (user_type = 'CUSTOMER' AND gsm_number IS NOT NULL)
    OR
    (user_type = 'STAFF' AND normalized_email IS NOT NULL)
)
```

Personel için password hash zorunludur:

```sql
CHECK (
    user_type <> 'STAFF'
    OR password_hash IS NOT NULL
)
```

## 9.4 Unique Index’ler

```sql
CREATE UNIQUE INDEX ux_users_normalized_email
ON identity.users (normalized_email)
WHERE normalized_email IS NOT NULL;

CREATE UNIQUE INDEX ux_users_gsm_number
ON identity.users (gsm_number)
WHERE gsm_number IS NOT NULL;
```

## 9.5 Query Index’leri

```sql
CREATE INDEX ix_users_active_type
ON identity.users (user_type, is_active);

CREATE INDEX ix_users_lockout
ON identity.users (lockout_end_at)
WHERE lockout_end_at IS NOT NULL;
```

---

# 10. Identity — customer_profiles

| Kolon        | Tip            | Zorunlu | Açıklama   |
| ------------ | -------------- | ------: | ---------- |
| `user_id`    | `varchar(26)`  |    Evet | PK ve FK   |
| `first_name` | `varchar(100)` |    Evet | Ad         |
| `last_name`  | `varchar(100)` |    Evet | Soyad      |
| `created_at` | `timestamptz`  |    Evet | Oluşturma  |
| `updated_at` | `timestamptz`  |    Evet | Güncelleme |

Primary key:

```text
user_id
```

Foreign key:

```text
customer_profiles.user_id -> users.id
```

Delete davranışı:

```text
RESTRICT
```

Customer profile hard delete edilmeyecektir.

---

# 11. Identity — staff_profiles

| Kolon                 | Tip            | Zorunlu | Açıklama              |
| --------------------- | -------------- | ------: | --------------------- |
| `user_id`             | `varchar(26)`  |    Evet | PK ve FK              |
| `first_name`          | `varchar(100)` |    Evet | Ad                    |
| `last_name`           | `varchar(100)` |    Evet | Soyad                 |
| `employee_number`     | `varchar(50)`  |   Hayır | Personel numarası     |
| `assignment_enabled`  | `boolean`      |    Evet | Yeni case alabilir mi |
| `created_by_admin_id` | `varchar(26)`  |    Evet | Oluşturan admin       |
| `created_at`          | `timestamptz`  |    Evet | Oluşturma             |
| `updated_at`          | `timestamptz`  |    Evet | Güncelleme            |
| `version`             | `bigint`       |    Evet | Concurrency           |

Unique:

```sql
CREATE UNIQUE INDEX ux_staff_employee_number
ON identity.staff_profiles (employee_number)
WHERE employee_number IS NOT NULL;
```

`assignment_enabled` yalnızca analyst rolündeki personeller için anlamlıdır.

---

# 12. Identity — roles ve user_roles

## 12.1 roles

Seed edilecek roller:

```text
CUSTOMER
ANALYST
SUPERVISOR
ADMIN
```

Kolonlar:

```text
id
code
display_name
created_at
```

Unique:

```text
code
```

## 12.2 user_roles

Kolonlar:

```text
user_id
role_id
assigned_by
assigned_at
```

Composite primary key:

```text
user_id + role_id
```

Bir kullanıcı baseline’da tek ana role sahip olacaktır.

Buna rağmen relation tablo olarak tutulmasının nedeni ASP.NET Core Identity uyumluluğu ve gelecekte kontrollü genişlemedir.

Uygulama seviyesinde birden fazla ana role izin verilmeyecektir.

---

# 13. Identity — specialties ve staff_specialties

## 13.1 specialties

Seed değerleri fraud türleriyle uyumlu olacaktır:

```text
CALINTI_KART
HESAP_ELE_GECIRME
PARA_AKLAMA
SUPHELI_DAVRANIS
```

`TEMIZ` analist uzmanlığı değildir.

Kolonlar:

```text
id
code
display_name
is_active
created_at
```

Unique:

```text
code
```

## 13.2 staff_specialties

Kolonlar:

```text
staff_user_id
specialty_id
assigned_by
assigned_at
```

Composite primary key:

```text
staff_user_id + specialty_id
```

---

# 14. Identity — regions ve staff_regions

## 14.1 regions

Kolonlar:

```text
id
code
display_name
is_active
created_at
```

Örnek kodlar:

```text
MARMARA
EGE
AKDENIZ
IC_ANADOLU
KARADENIZ
DOGU_ANADOLU
GUNEYDOGU_ANADOLU
YURT_DISI
```

## 14.2 staff_regions

Composite primary key:

```text
staff_user_id + region_id
```

Kolonlar:

```text
staff_user_id
region_id
assigned_by
assigned_at
```

---

# 15. Identity — otp_challenges

## 15.1 Amaç

Müşteri GSM OTP doğrulama sürecini yönetir.

## 15.2 Kolonlar

| Kolon           | Tip                    |
| --------------- | ---------------------- |
| `id`            | `varchar(26)`          |
| `gsm_number`    | `varchar(20)`          |
| `code_hash`     | `varchar(128)`         |
| `purpose`       | `varchar(32)`          |
| `status`        | `varchar(20)`          |
| `attempt_count` | `integer`              |
| `max_attempts`  | `integer`              |
| `expires_at`    | `timestamptz`          |
| `verified_at`   | `timestamptz` nullable |
| `created_ip`    | `inet` nullable        |
| `created_at`    | `timestamptz`          |
| `version`       | `bigint`               |

Status:

```text
PENDING
VERIFIED
EXPIRED
LOCKED
CANCELLED
```

Purpose:

```text
CUSTOMER_REGISTER
CUSTOMER_LOGIN
```

Constraint:

```sql
CHECK (attempt_count >= 0)
CHECK (max_attempts > 0)
CHECK (attempt_count <= max_attempts)
CHECK (expires_at > created_at)
```

OTP kodu plaintext saklanmayacaktır.

Demo kodu `1234` olsa bile yalnızca hash saklanır.

## 15.3 Index

```sql
CREATE INDEX ix_otp_pending_gsm
ON identity.otp_challenges (gsm_number, created_at DESC)
WHERE status = 'PENDING';
```

---

# 16. Identity — login_attempts

Kolonlar:

```text
id
user_id nullable
login_identifier_hash
login_type
result
failure_reason
ip_address
user_agent
occurred_at
correlation_id
```

Result:

```text
SUCCESS
FAILURE
LOCKED
RATE_LIMITED
```

Amaç:

- Güvenlik incelemesi
- Audit üretimi
- Brute-force analizi
- Login metrikleri

`login_identifier_hash`, bilinmeyen kullanıcı denemelerinde e-posta/GSM’nin plaintext loglanmasını önler.

Index:

```sql
CREATE INDEX ix_login_attempts_user_time
ON identity.login_attempts (user_id, occurred_at DESC)
WHERE user_id IS NOT NULL;

CREATE INDEX ix_login_attempts_ip_time
ON identity.login_attempts (ip_address, occurred_at DESC);
```

---

# 17. Identity — refresh_sessions

## 17.1 Amaç

Refresh token rotation, session yönetimi ve token reuse tespiti.

## 17.2 Kolonlar

| Kolon                    | Tip            | Zorunlu |
| ------------------------ | -------------- | ------: |
| `id`                     | `varchar(26)`  |    Evet |
| `user_id`                | `varchar(26)`  |    Evet |
| `family_id`              | `varchar(26)`  |    Evet |
| `token_hash`             | `varchar(128)` |    Evet |
| `parent_session_id`      | `varchar(26)`  |   Hayır |
| `replaced_by_session_id` | `varchar(26)`  |   Hayır |
| `created_at`             | `timestamptz`  |    Evet |
| `expires_at`             | `timestamptz`  |    Evet |
| `last_used_at`           | `timestamptz`  |   Hayır |
| `revoked_at`             | `timestamptz`  |   Hayır |
| `revocation_reason`      | `varchar(64)`  |   Hayır |
| `reuse_detected_at`      | `timestamptz`  |   Hayır |
| `created_ip`             | `inet`         |   Hayır |
| `last_used_ip`           | `inet`         |   Hayır |
| `user_agent`             | `varchar(512)` |   Hayır |
| `version`                | `bigint`       |    Evet |

## 17.3 Unique

```sql
CREATE UNIQUE INDEX ux_refresh_sessions_token_hash
ON identity.refresh_sessions (token_hash);
```

## 17.4 Query Index’leri

```sql
CREATE INDEX ix_refresh_sessions_user_active
ON identity.refresh_sessions (user_id, expires_at)
WHERE revoked_at IS NULL;

CREATE INDEX ix_refresh_sessions_family
ON identity.refresh_sessions (family_id, created_at);

CREATE INDEX ix_refresh_sessions_expired
ON identity.refresh_sessions (expires_at);
```

## 17.5 Rotation Transaction’ı

Refresh işlemi tek database transaction içinde:

1. Token hash’iyle mevcut session lock edilir.
2. Session geçerliliği kontrol edilir.
3. Revoke edilmiş token ise reuse tespiti uygulanır.
4. Mevcut session revoke edilir.
5. Yeni session oluşturulur.
6. `replaced_by_session_id` güncellenir.
7. Audit outbox mesajı yazılır.
8. Commit edilir.

Aynı refresh token iki paralel istekte yalnızca bir kez başarıyla kullanılabilir.

---

# 18. Identity — audit_logs

## 18.1 Amaç

Güvenlik ve kritik operasyon olaylarının append-only kaydı.

## 18.2 Kolonlar

| Kolon             | Tip                     |
| ----------------- | ----------------------- |
| `id`              | `varchar(26)`           |
| `source_event_id` | `varchar(26)`           |
| `actor_id`        | `varchar(26)` nullable  |
| `actor_role`      | `varchar(32)` nullable  |
| `action`          | `varchar(100)`          |
| `source_service`  | `varchar(64)`           |
| `resource_type`   | `varchar(64)` nullable  |
| `resource_id`     | `varchar(100)` nullable |
| `ip_address`      | `inet` nullable         |
| `result`          | `varchar(16)`           |
| `correlation_id`  | `varchar(64)`           |
| `details`         | `jsonb`                 |
| `occurred_at`     | `timestamptz`           |
| `persisted_at`    | `timestamptz`           |

Result:

```text
SUCCESS
FAILURE
DENIED
```

## 18.3 Unique

```sql
CREATE UNIQUE INDEX ux_audit_logs_source_event
ON identity.audit_logs (source_event_id);
```

Bu constraint duplicate audit event’in ikinci kayıt oluşturmasını engeller.

## 18.4 Index’ler

```sql
CREATE INDEX ix_audit_actor_time
ON identity.audit_logs (actor_id, occurred_at DESC);

CREATE INDEX ix_audit_action_time
ON identity.audit_logs (action, occurred_at DESC);

CREATE INDEX ix_audit_resource
ON identity.audit_logs (resource_type, resource_id, occurred_at DESC);

CREATE INDEX ix_audit_correlation
ON identity.audit_logs (correlation_id);
```

Audit tablosunda runtime user için update/delete bulunmamalıdır.

---

# 19. Transaction Database Genel Modeli

Ana tablolar:

```text
txn.transaction_number_counters
txn.transactions
txn.ai_assessments
txn.risk_cases
txn.case_assignments
txn.analyst_eligibility_projection
txn.analyst_workloads
txn.case_transitions
txn.case_overrides
txn.analyst_notes
txn.customer_verifications
txn.temporary_blocks
txn.customer_feedback
txn.idempotency_records
txn.outbox_messages
txn.inbox_messages
```

---

# 20. Transaction — transaction_number_counters

## 20.1 Amaç

Yıllık okunabilir transaction numarası üretmek.

Kolonlar:

```text
year
last_value
updated_at
```

Primary key:

```text
year
```

Constraint:

```sql
CHECK (year >= 2020)
CHECK (last_value >= 0)
```

## 20.2 Üretim Algoritması

Tek transaction içinde:

```sql
INSERT INTO txn.transaction_number_counters (
    year,
    last_value,
    updated_at
)
VALUES (
    @year,
    1,
    now()
)
ON CONFLICT (year)
DO UPDATE SET
    last_value = txn.transaction_number_counters.last_value + 1,
    updated_at = now()
RETURNING last_value;
```

Format:

```text
TRX-{year}-{last_value:000000}
```

Örnek:

```text
TRX-2026-000123
```

Gaps kabul edilebilir; uniqueness zorunludur.

---

# 21. Transaction — transactions

## 21.1 Kolonlar

| Kolon                     | Tip                     | Açıklama                   |
| ------------------------- | ----------------------- | -------------------------- |
| `id`                      | `varchar(26)`           | ULID                       |
| `transaction_no`          | `varchar(32)`           | Okunabilir numara          |
| `customer_id`             | `varchar(26)`           | Identity referansı         |
| `amount`                  | `numeric(18,2)`         | Tutar                      |
| `currency`                | `char(3)`               | Baseline `TRY`             |
| `transaction_type`        | `varchar(20)`           | İşlem türü                 |
| `recipient_reference`     | `varchar(256)`          | Alıcı                      |
| `device_fingerprint_hash` | `varchar(128)`          | Cihaz fingerprint hash’i   |
| `city`                    | `varchar(100)`          | Şehir                      |
| `country_code`            | `char(2)`               | ISO ülke                   |
| `occurred_at`             | `timestamptz`           | İşlem zamanı               |
| `assessment_status`       | `varchar(20)`           | AI assessment durumu       |
| `assessment_deadline_at`  | `timestamptz`           | Watchdog deadline          |
| `effective_risk_score`    | `numeric(6,5)` nullable | Efektif risk               |
| `effective_risk_level`    | `varchar(20)` nullable  | Efektif seviye             |
| `effective_fraud_type`    | `varchar(40)` nullable  | Efektif fraud türü         |
| `screening_decision`      | `varchar(20)`           | `ONAY/INCELEME/BLOK`       |
| `control_status`          | `varchar(32)`           | Transaction kontrol durumu |
| `manual_review_reason`    | `varchar(64)` nullable  | Fallback nedeni            |
| `created_at`              | `timestamptz`           | Oluşturma                  |
| `updated_at`              | `timestamptz`           | Güncelleme                 |
| `version`                 | `bigint`                | Concurrency                |

## 21.2 Constraint’ler

```sql
CHECK (amount > 0)

CHECK (
    transaction_type IN (
        'ODEME',
        'TRANSFER',
        'FATURA',
        'CEKIM'
    )
)

CHECK (
    assessment_status IN (
        'PENDING',
        'COMPLETED',
        'TIMED_OUT',
        'FAILED'
    )
)

CHECK (
    screening_decision IN (
        'ONAY',
        'INCELEME',
        'BLOK'
    )
)

CHECK (
    control_status IN (
        'ALLOWED',
        'TEMPORARILY_BLOCKED',
        'APPROVED',
        'BLOCKED'
    )
)

CHECK (
    effective_risk_score IS NULL
    OR (
        effective_risk_score >= 0
        AND effective_risk_score <= 1
    )
)
```

Assessment tamamlandıysa risk alanları zorunlu:

```sql
CHECK (
    assessment_status <> 'COMPLETED'
    OR (
        effective_risk_score IS NOT NULL
        AND effective_risk_level IS NOT NULL
        AND effective_fraud_type IS NOT NULL
    )
)
```

## 21.3 Unique

```sql
CREATE UNIQUE INDEX ux_transactions_no
ON txn.transactions (transaction_no);
```

## 21.4 Query Index’leri

```sql
CREATE INDEX ix_transactions_customer_time
ON txn.transactions (customer_id, occurred_at DESC);

CREATE INDEX ix_transactions_assessment_pending
ON txn.transactions (assessment_deadline_at)
WHERE assessment_status = 'PENDING';

CREATE INDEX ix_transactions_risk_time
ON txn.transactions (effective_risk_level, created_at DESC)
WHERE effective_risk_level IS NOT NULL;

CREATE INDEX ix_transactions_control_status
ON txn.transactions (control_status, created_at DESC);
```

---

# 22. Transaction — ai_assessments

## 22.1 Amaç

AI Service’ten gelen prediction snapshot’larını saklamak.

## 22.2 Kolonlar

| Kolon                    | Tip            |
| ------------------------ | -------------- |
| `id`                     | `varchar(26)`  |
| `external_assessment_id` | `varchar(26)`  |
| `transaction_id`         | `varchar(26)`  |
| `source_event_id`        | `varchar(26)`  |
| `risk_score`             | `numeric(6,5)` |
| `risk_level`             | `varchar(20)`  |
| `decision`               | `varchar(20)`  |
| `fraud_type`             | `varchar(40)`  |
| `model_version`          | `varchar(100)` |
| `reason_codes`           | `jsonb`        |
| `analyst_candidates`     | `jsonb`        |
| `assessed_at`            | `timestamptz`  |
| `received_at`            | `timestamptz`  |
| `is_late`                | `boolean`      |
| `is_primary`             | `boolean`      |
| `payload_hash`           | `varchar(128)` |
| `created_at`             | `timestamptz`  |

## 22.3 Unique

```sql
CREATE UNIQUE INDEX ux_ai_assessments_source_event
ON txn.ai_assessments (source_event_id);

CREATE UNIQUE INDEX ux_ai_assessments_external
ON txn.ai_assessments (external_assessment_id);

CREATE UNIQUE INDEX ux_ai_assessments_primary
ON txn.ai_assessments (transaction_id)
WHERE is_primary = true;
```

## 22.4 Index

```sql
CREATE INDEX ix_ai_assessments_transaction_time
ON txn.ai_assessments (transaction_id, received_at DESC);
```

Orijinal assessment satırı değiştirilmeyecektir.

---

# 23. Transaction — risk_cases

## 23.1 Kolonlar

| Kolon                   | Tip                     |
| ----------------------- | ----------------------- |
| `id`                    | `varchar(26)`           |
| `transaction_id`        | `varchar(26)`           |
| `customer_id`           | `varchar(26)`           |
| `primary_assessment_id` | `varchar(26)` nullable  |
| `status`                | `varchar(32)`           |
| `assignment_status`     | `varchar(32)`           |
| `assigned_analyst_id`   | `varchar(26)` nullable  |
| `effective_risk_score`  | `numeric(6,5)` nullable |
| `effective_risk_level`  | `varchar(20)` nullable  |
| `effective_fraud_type`  | `varchar(40)` nullable  |
| `sla_priority`          | `varchar(20)`           |
| `sla_started_at`        | `timestamptz`           |
| `sla_deadline_at`       | `timestamptz`           |
| `sla_breached_at`       | `timestamptz` nullable  |
| `sla_stopped_at`        | `timestamptz` nullable  |
| `review_started_at`     | `timestamptz` nullable  |
| `final_decision`        | `varchar(20)` nullable  |
| `decision_note`         | `text` nullable         |
| `decided_by`            | `varchar(26)` nullable  |
| `decided_at`            | `timestamptz` nullable  |
| `closure_due_at`        | `timestamptz` nullable  |
| `closed_at`             | `timestamptz` nullable  |
| `created_at`            | `timestamptz`           |
| `updated_at`            | `timestamptz`           |
| `version`               | `bigint`                |

## 23.2 Unique

Bir transaction için yalnızca bir RiskCase:

```sql
CREATE UNIQUE INDEX ux_risk_cases_transaction
ON txn.risk_cases (transaction_id);
```

## 23.3 Status Constraint

```sql
CHECK (
    status IN (
        'YENI',
        'ATANDI',
        'INCELENIYOR',
        'MUSTERI_DOGRULAMA',
        'ONAYLANDI',
        'BLOKLANDI',
        'KAPANDI'
    )
)
```

## 23.4 Final Karar Constraint’i

```sql
CHECK (
    (status IN ('ONAYLANDI', 'BLOKLANDI', 'KAPANDI')
        AND final_decision IS NOT NULL
        AND decided_at IS NOT NULL)
    OR
    (status NOT IN ('ONAYLANDI', 'BLOKLANDI', 'KAPANDI'))
)
```

Blok kararında not:

```sql
CHECK (
    final_decision <> 'BLOCK'
    OR (
        decision_note IS NOT NULL
        AND char_length(trim(decision_note)) > 0
    )
)
```

Kapalı case:

```sql
CHECK (
    status <> 'KAPANDI'
    OR closed_at IS NOT NULL
)
```

## 23.5 Queue Index’leri

```sql
CREATE INDEX ix_cases_manual_queue
ON txn.risk_cases (created_at)
WHERE assignment_status = 'MANUAL_QUEUE';

CREATE INDEX ix_cases_assignment_queue
ON txn.risk_cases (sla_priority, sla_deadline_at)
WHERE assignment_status = 'QUEUED';

CREATE INDEX ix_cases_assigned_analyst
ON txn.risk_cases (
    assigned_analyst_id,
    sla_priority,
    sla_deadline_at
)
WHERE status IN (
    'ATANDI',
    'INCELENIYOR',
    'MUSTERI_DOGRULAMA'
);
```

## 23.6 SLA Worker Index’i

```sql
CREATE INDEX ix_cases_sla_due
ON txn.risk_cases (sla_deadline_at)
WHERE
    sla_breached_at IS NULL
    AND final_decision IS NULL;
```

## 23.7 Closure Worker Index’i

```sql
CREATE INDEX ix_cases_closure_due
ON txn.risk_cases (closure_due_at)
WHERE
    status IN ('ONAYLANDI', 'BLOKLANDI')
    AND closed_at IS NULL;
```

## 23.8 Dashboard Index’i

```sql
CREATE INDEX ix_cases_risk_status_time
ON txn.risk_cases (
    effective_risk_level,
    status,
    created_at DESC
);
```

---

# 24. Transaction — case_assignments

## 24.1 Kolonlar

```text
id
case_id
analyst_id
status
assignment_source
assigned_by
assignment_reason
assigned_at
started_at
ended_at
created_at
version
```

Status:

```text
ASSIGNED
IN_PROGRESS
COMPLETED
CANCELLED
```

Assignment source:

```text
AI_RECOMMENDATION
SYSTEM
SUPERVISOR
MANUAL_QUEUE
```

## 24.2 Tek Aktif Assignment

```sql
CREATE UNIQUE INDEX ux_case_assignments_active_case
ON txn.case_assignments (case_id)
WHERE status IN ('ASSIGNED', 'IN_PROGRESS');
```

## 24.3 Analyst Query Index’i

```sql
CREATE INDEX ix_case_assignments_analyst_active
ON txn.case_assignments (analyst_id, assigned_at)
WHERE status IN ('ASSIGNED', 'IN_PROGRESS');
```

## 24.4 History

Assignment geçmişi silinmeyecektir.

Reassignment sırasında:

- Eski assignment `CANCELLED`
- `ended_at` atanır
- Yeni assignment satırı oluşturulur

---

# 25. Transaction — analyst_eligibility_projection

## 25.1 Amaç

Identity Service’ten gelen analist aktiflik bilgisinin local projection’ı.

Kolonlar:

```text
analyst_id
is_active
assignment_enabled
identity_profile_version
last_source_event_id
source_updated_at
projection_updated_at
```

Primary key:

```text
analyst_id
```

Bu tablo authoritative değildir.

Analistin rolü ve profil sahibi Identity Service’tir.

Transaction Service assignment sırasında bu projection’ı kullanır.

Projection stale ise case manuel queue’ya alınabilir veya kontrollü Identity doğrulaması yapılabilir.

---

# 26. Transaction — analyst_workloads

## 26.1 Amaç

Analist başına authoritative aktif vaka sayısını tutmak.

Kolonlar:

```text
analyst_id
active_case_count
last_assigned_at
updated_at
version
```

Primary key:

```text
analyst_id
```

Constraint:

```sql
CHECK (
    active_case_count >= 0
    AND active_case_count <= 10
)
```

## 26.2 Atomic Assignment

Assignment transaction’ında:

```sql
UPDATE txn.analyst_workloads
SET
    active_case_count = active_case_count + 1,
    last_assigned_at = @now,
    updated_at = @now,
    version = version + 1
WHERE analyst_id = @analyst_id
AND active_case_count < 10;
```

Etkilenen satır sayısı `0` ise:

```text
ANALYST_CAPACITY_EXCEEDED
```

## 26.3 Final Karar

Case final karara ulaştığında aktif vaka sayısı aynı transaction içinde azaltılır.

```sql
CHECK (active_case_count >= 0)
```

negatif workload oluşmasını engeller.

---

# 27. Transaction — case_transitions

## 27.1 Append-Only Geçmiş

Kolonlar:

```text
id
case_id
previous_status
new_status
actor_id
actor_role
transition_source
reason
correlation_id
causation_id
source_event_id
case_version_before
case_version_after
occurred_at
```

## 27.2 Index’ler

```sql
CREATE INDEX ix_case_transitions_case_time
ON txn.case_transitions (case_id, occurred_at);

CREATE INDEX ix_case_transitions_actor_time
ON txn.case_transitions (actor_id, occurred_at DESC)
WHERE actor_id IS NOT NULL;
```

## 27.3 Append-Only

Runtime user:

```text
SELECT
INSERT
```

haklarına sahip olur.

`UPDATE` ve `DELETE` verilmez.

---

# 28. Transaction — case_overrides

## 28.1 Amaç

Fraud türü ve risk seviyesi override geçmişini saklamak.

Kolonlar:

```text
id
case_id
override_type
previous_value
new_value
reason
actor_id
actor_role
source_event_id
occurred_at
```

Override type:

```text
FRAUD_TYPE
RISK_LEVEL
```

Index:

```sql
CREATE INDEX ix_case_overrides_case_time
ON txn.case_overrides (case_id, occurred_at);
```

Bu kayıtlar append-only olacaktır.

---

# 29. Transaction — analyst_notes

Kolonlar:

```text
id
case_id
author_id
author_role
note_text
parent_note_id nullable
revision_number
created_at
```

Kurallar:

- Plain text
- Boş olamaz
- Maksimum uzunluk
- Hard delete yok
- Düzenleme yeni revision oluşturur

Index:

```sql
CREATE INDEX ix_analyst_notes_case_time
ON txn.analyst_notes (case_id, created_at);
```

---

# 30. Transaction — customer_verifications

## 30.1 Kolonlar

```text
id
case_id
customer_id
requested_by
status
response
requested_at
expires_at
responded_at
created_at
version
```

Status:

```text
PENDING
ANSWERED
EXPIRED
CANCELLED
```

Response:

```text
MINE
NOT_MINE
NO_RESPONSE
```

## 30.2 Tek Açık Doğrulama

```sql
CREATE UNIQUE INDEX ux_verifications_pending_case
ON txn.customer_verifications (case_id)
WHERE status = 'PENDING';
```

## 30.3 Worker Index’i

```sql
CREATE INDEX ix_verifications_expiry
ON txn.customer_verifications (expires_at)
WHERE status = 'PENDING';
```

## 30.4 Constraint

```sql
CHECK (expires_at > requested_at)

CHECK (
    status <> 'ANSWERED'
    OR (
        response IN ('MINE', 'NOT_MINE')
        AND responded_at IS NOT NULL
    )
)
```

---

# 31. Transaction — temporary_blocks

## 31.1 Amaç

Bir transaction üzerindeki geçici blok nedenlerini ayrı olarak saklamak.

Kolonlar:

```text
id
transaction_id
reason
applied_by
source_event_id
applied_at
released_at
release_reason
created_at
```

Reason:

```text
AI_CRITICAL_RISK
CUSTOMER_NOT_MINE
CRITICAL_SLA_BREACH
SUPERVISOR_SECURITY_OVERRIDE
```

## 31.2 Aynı Neden İçin Tek Aktif Blok

```sql
CREATE UNIQUE INDEX ux_temp_blocks_active_reason
ON txn.temporary_blocks (transaction_id, reason)
WHERE released_at IS NULL;
```

## 31.3 Aktif Blok Query

```sql
CREATE INDEX ix_temp_blocks_active_transaction
ON txn.temporary_blocks (transaction_id)
WHERE released_at IS NULL;
```

Transaction ancak aktif geçici blok kalmadığında ve final karar onay olduğunda `APPROVED` olabilir.

---

# 32. Transaction — customer_feedback

Kolonlar:

```text
id
case_id
transaction_id
customer_id
rating
comment
submitted_at
source_event_id
```

Constraint:

```sql
CHECK (rating >= 1 AND rating <= 5)
```

Unique:

```sql
CREATE UNIQUE INDEX ux_customer_feedback_case
ON txn.customer_feedback (case_id);
```

Case yalnızca `KAPANDI` durumundayken feedback kabul edilir.

Bu state kontrolü application transaction içinde yapılır.

---

# 33. Transaction — idempotency_records

## 33.1 Kolonlar

```text
id
scope
actor_id
idempotency_key
request_hash
status
response_status_code
response_body
resource_id
created_at
expires_at
version
```

Status:

```text
PROCESSING
COMPLETED
FAILED
```

## 33.2 Unique

```sql
CREATE UNIQUE INDEX ux_idempotency_scope_actor_key
ON txn.idempotency_records (
    scope,
    actor_id,
    idempotency_key
);
```

## 33.3 Query

Aynı key ve aynı request hash:

- Önceki response döner.

Aynı key ve farklı request hash:

```text
409
```

## 33.4 Retention

Transaction create idempotency kayıtları baseline’da:

```text
24 saat
```

saklanacaktır.

Demo ve test sırasında süre environment variable ile değiştirilebilir.

---

# 34. AI Database Genel Modeli

Ana tablolar:

```text
ai.datasets
ai.training_runs
ai.model_versions
ai.model_bundles
ai.predictions
ai.assignment_recommendations
ai.assignment_recommendation_candidates
ai.analyst_profile_projection
ai.analyst_workload_projection
ai.analyst_performance_projection
ai.prediction_feedback
ai.model_metric_snapshots
ai.outbox_messages
ai.inbox_messages
```

---

# 35. AI — datasets

Kolonlar:

```text
id
name
version
record_count
class_distribution
generator_version
random_seed
source_type
schema_version
data_checksum
created_at
```

Source type:

```text
SYNTHETIC
MIXED
IMPORTED
```

Unique:

```text
name + version
```

Dataset’in tamamı database’te tutulmak zorunda değildir.

Repository veya artifact path ve checksum ile izlenebilir.

---

# 36. AI — training_runs

Kolonlar:

```text
id
dataset_id
run_name
status
algorithm
parameters
train_record_count
validation_record_count
test_record_count
started_at
completed_at
metrics
source_commit_sha
created_at
```

Status:

```text
RUNNING
COMPLETED
FAILED
CANCELLED
```

`parameters` ve `metrics` JSONB olabilir.

Training run immutable tamamlanmış kayıt olarak davranır.

---

# 37. AI — model_versions

## 37.1 Kolonlar

```text
id
model_kind
semantic_version
training_run_id
algorithm
artifact_path
artifact_sha256
feature_schema_version
metrics
status
created_at
activated_at
retired_at
```

Model kind:

```text
RISK
FRAUD_TYPE
```

Status:

```text
CREATED
VALIDATED
ACTIVE
RETIRED
FAILED
```

Unique:

```sql
CREATE UNIQUE INDEX ux_model_versions_kind_version
ON ai.model_versions (model_kind, semantic_version);
```

Aynı model kind için tek aktif model:

```sql
CREATE UNIQUE INDEX ux_model_versions_active_kind
ON ai.model_versions (model_kind)
WHERE status = 'ACTIVE';
```

---

# 38. AI — model_bundles

## 38.1 Amaç

Bir inference deployment’ında birlikte kullanılan risk ve fraud-type modelini bağlar.

Kolonlar:

```text
id
bundle_version
risk_model_id
fraud_type_model_id
status
activated_at
retired_at
created_at
```

Status:

```text
CREATED
ACTIVE
RETIRED
```

Unique:

```text
bundle_version
```

Tek aktif bundle:

```sql
CREATE UNIQUE INDEX ux_model_bundles_active
ON ai.model_bundles ((status))
WHERE status = 'ACTIVE';
```

Prediction hangi model çiftinin kullanıldığını bu tablo üzerinden izler.

---

# 39. AI — predictions

## 39.1 Kolonlar

```text
id
transaction_id
source_event_id
correlation_id
model_bundle_id
risk_score
risk_level
decision
fraud_type
feature_snapshot
reason_codes
predicted_at
created_at
```

## 39.2 Unique

```sql
CREATE UNIQUE INDEX ux_predictions_source_event
ON ai.predictions (source_event_id);

CREATE UNIQUE INDEX ux_predictions_transaction_bundle
ON ai.predictions (transaction_id, model_bundle_id);
```

Bu ikinci unique aynı transaction’ın aynı model bundle ile tekrar skorlanmasını engeller.

Yeni model bundle ile kontrollü rescore yapılabilir.

## 39.3 Index’ler

```sql
CREATE INDEX ix_predictions_transaction
ON ai.predictions (transaction_id, predicted_at DESC);

CREATE INDEX ix_predictions_model_time
ON ai.predictions (model_bundle_id, predicted_at DESC);

CREATE INDEX ix_predictions_fraud_type
ON ai.predictions (fraud_type, predicted_at DESC);
```

---

# 40. AI — assignment_recommendations

Kolonlar:

```text
id
prediction_id
transaction_id
fraud_type
created_at
```

Her prediction için bir recommendation seti:

```sql
CREATE UNIQUE INDEX ux_assignment_recommendation_prediction
ON ai.assignment_recommendations (prediction_id);
```

---

# 41. AI — assignment_recommendation_candidates

Kolonlar:

```text
id
recommendation_id
analyst_id
rank
total_score
expertise_score
capacity_score
performance_score
explanation
created_at
```

Constraint:

```sql
CHECK (rank > 0)
CHECK (total_score >= 0 AND total_score <= 1)
CHECK (expertise_score >= 0 AND expertise_score <= 1)
CHECK (capacity_score >= 0 AND capacity_score <= 1)
CHECK (performance_score >= 0 AND performance_score <= 1)
```

Unique:

```sql
CREATE UNIQUE INDEX ux_recommendation_candidate
ON ai.assignment_recommendation_candidates (
    recommendation_id,
    analyst_id
);

CREATE UNIQUE INDEX ux_recommendation_rank
ON ai.assignment_recommendation_candidates (
    recommendation_id,
    rank
);
```

---

# 42. AI — analyst_profile_projection

Kolonlar:

```text
analyst_id
display_name
is_active
assignment_enabled
specialties
regions
identity_profile_version
last_source_event_id
source_updated_at
projection_updated_at
```

`specialties` ve `regions` JSONB array olarak tutulabilir; bunlar projection alanlarıdır.

Primary key:

```text
analyst_id
```

Index için PostgreSQL GIN değerlendirilebilir:

```sql
CREATE INDEX ix_ai_analyst_specialties
ON ai.analyst_profile_projection
USING gin (specialties);
```

Dataset küçükse application tarafında filtreleme de kabul edilebilir.

---

# 43. AI — analyst_workload_projection

Kolonlar:

```text
analyst_id
active_case_count
last_assigned_at
source_version
last_source_event_id
projection_updated_at
```

Constraint:

```sql
CHECK (active_case_count >= 0)
```

Bu değer tahmini projection’dır.

Transaction Service final capacity otoritesidir.

---

# 44. AI — analyst_performance_projection

Kolonlar:

```text
analyst_id
total_decisions
correct_decisions
false_positive_count
sla_compliant_count
average_decision_seconds
performance_score
last_source_event_id
projection_updated_at
```

Constraint:

```sql
CHECK (total_decisions >= 0)
CHECK (correct_decisions >= 0)
CHECK (false_positive_count >= 0)
CHECK (performance_score >= 0 AND performance_score <= 1)
```

Yeni analist için default performance:

```text
0.50
```

---

# 45. AI — prediction_feedback

## 45.1 Amaç

AI tahmini ile sonradan oluşan ground truth bilgisini eşleştirmek.

Kolonlar:

```text
id
prediction_id
transaction_id
case_id
ai_fraud_type
effective_fraud_type
ai_decision
final_decision
customer_response
is_fraud_type_correct
is_decision_agreement
is_false_positive
feedback_source
source_event_id
occurred_at
created_at
```

Feedback source:

```text
ANALYST_OVERRIDE
FINAL_CASE_DECISION
CUSTOMER_CONFIRMATION
CUSTOMER_FEEDBACK
```

Unique:

```sql
CREATE UNIQUE INDEX ux_prediction_feedback_source_event
ON ai.prediction_feedback (source_event_id);
```

Aynı prediction için birden fazla feedback kaydı olabilir; farklı business olaylarını temsil eder.

---

# 46. AI — model_metric_snapshots

Kolonlar:

```text
id
model_bundle_id
metric_scope
category
sample_count
accuracy
precision
recall
f1_score
false_positive_rate
decision_agreement_rate
calculated_at
period_start
period_end
```

Metric scope:

```text
OVERALL
FRAUD_TYPE
DECISION
```

Constraint:

```sql
CHECK (sample_count >= 0)
```

Unique:

```text
model_bundle_id
metric_scope
category
period_start
period_end
```

Dashboard son geçerli snapshot’ı okur.

---

# 47. Gamification Database Genel Modeli

Ana tablolar:

```text
game.analyst_profiles_projection
game.point_ledger
game.rule_evaluations
game.badge_definitions
game.earned_badges
game.analyst_score_summaries
game.analyst_daily_stats
game.analyst_weekly_stats
game.analyst_performance_summaries
game.analyst_fraud_type_stats
game.outbox_messages
game.inbox_messages
```

---

# 48. Gamification — analyst_profiles_projection

Kolonlar:

```text
analyst_id
display_name
is_active
created_at
updated_at
last_source_event_id
```

Primary key:

```text
analyst_id
```

Identity Service authoritative sahibidir.

Bu tablo yalnızca leaderboard ve profil gösterimi için kullanılır.

---

# 49. Gamification — point_ledger

## 49.1 Amaç

Bütün puan hareketlerinin immutable kayıt kaynağı.

## 49.2 Kolonlar

```text
id
analyst_id
source_event_id
case_id
transaction_id
rule_code
points
description
occurred_at
created_at
```

Rule code örnekleri:

```text
CASE_DECISION
FAST_DECISION
CONFIRMED_FRAUD
CRITICAL_WITHIN_SLA
SLA_BREACH
FALSE_POSITIVE
```

## 49.3 Unique

```sql
CREATE UNIQUE INDEX ux_point_ledger_event_rule
ON game.point_ledger (
    source_event_id,
    rule_code
);
```

Aynı event aynı rule için ikinci kez puan üretmez.

## 49.4 Constraint

```sql
CHECK (points <> 0)
```

Pozitif ve negatif hareketler desteklenir.

## 49.5 Index’ler

```sql
CREATE INDEX ix_point_ledger_analyst_time
ON game.point_ledger (analyst_id, occurred_at DESC);

CREATE INDEX ix_point_ledger_case
ON game.point_ledger (case_id)
WHERE case_id IS NOT NULL;

CREATE INDEX ix_point_ledger_daily
ON game.point_ledger (occurred_at, analyst_id);
```

Ledger append-only olacaktır.

---

# 50. Gamification — rule_evaluations

## 50.1 Amaç

Bir source event için hangi kuralların değerlendirildiğini kaydetmek.

Kolonlar:

```text
id
source_event_id
analyst_id
case_id
rule_code
result
reason
evaluated_at
```

Result:

```text
APPLIED
NOT_APPLICABLE
ALREADY_APPLIED
DEFERRED
```

Unique:

```text
source_event_id + rule_code
```

Bu tablo demo ve hata ayıklamada puanın neden verildiğini açıklar.

---

# 51. Gamification — badge_definitions

Seed edilen badge tanımları:

```text
FIRST_CATCH
SHARP_EYE
ZERO_ERROR
MARATHON
CRISIS_MANAGER
SPECIALIST_HUNTER
```

Kolonlar:

```text
id
code
display_name
description
criteria_version
is_active
created_at
updated_at
```

Unique:

```text
code
```

Badge criteria business kodunda versioned rule olarak uygulanır.

Definition tablosu UI metni ve aktiflik için kullanılır.

---

# 52. Gamification — earned_badges

Kolonlar:

```text
id
analyst_id
badge_id
source_event_id
earned_at
criteria_version
created_at
```

Unique:

```sql
CREATE UNIQUE INDEX ux_earned_badges_analyst_badge
ON game.earned_badges (analyst_id, badge_id);
```

Bir badge aynı analiste yalnızca bir kez verilir.

Index:

```sql
CREATE INDEX ix_earned_badges_analyst_time
ON game.earned_badges (analyst_id, earned_at DESC);
```

Append-only olacaktır.

---

# 53. Gamification — analyst_score_summaries

Kolonlar:

```text
analyst_id
total_points
level
total_decisions
total_badges
updated_at
version
```

Level:

```text
BRONZ
GUMUS
ALTIN
PLATIN
```

Constraint:

```sql
CHECK (total_decisions >= 0)
CHECK (total_badges >= 0)
```

`total_points` negatif olabilir mi?

Baseline kararı:

```text
Toplam puan minimum 0 olarak gösterilir.
```

Ledger toplamı negatif olsa bile summary:

```text
greatest(sum(points), 0)
```

olarak tutulur.

Bu davranış `11-GAMIFICATION-DESIGN.md` içinde kesinleştirilecektir.

---

# 54. Gamification — analyst_daily_stats

Composite primary key:

```text
analyst_id + stat_date
```

Kolonlar:

```text
analyst_id
stat_date
points
decision_count
fast_decision_count
confirmed_fraud_count
sla_breach_count
false_positive_count
average_decision_seconds
updated_at
version
```

Index:

```sql
CREATE INDEX ix_daily_stats_date_points
ON game.analyst_daily_stats (
    stat_date,
    points DESC,
    analyst_id
);
```

Günlük leaderboard bu tablodan üretilir.

---

# 55. Gamification — analyst_weekly_stats

Composite primary key:

```text
analyst_id + week_start_date
```

Kolonlar:

```text
analyst_id
week_start_date
points
decision_count
fast_decision_count
confirmed_fraud_count
sla_breach_count
false_positive_count
average_decision_seconds
updated_at
version
```

Hafta başlangıcı:

```text
Pazartesi 00:00 Europe/Istanbul
```

olarak kullanıcı gösterimi için yorumlanır.

Database’te period sınırı UTC olarak saklanabilir veya `date` kullanılabilir.

Index:

```sql
CREATE INDEX ix_weekly_stats_week_points
ON game.analyst_weekly_stats (
    week_start_date,
    points DESC,
    analyst_id
);
```

---

# 56. Gamification — analyst_performance_summaries

Kolonlar:

```text
analyst_id
total_decisions
correct_decisions
false_positive_count
sla_compliant_count
sla_breach_count
total_decision_seconds
average_decision_seconds
accuracy_rate
updated_at
version
```

Constraint:

```sql
CHECK (total_decisions >= 0)
CHECK (correct_decisions >= 0)
CHECK (accuracy_rate >= 0 AND accuracy_rate <= 1)
```

Bu tablo AI Service’e:

```text
analyst.performance.updated
```

event’i üretmek için kullanılır.

---

# 57. Gamification — analyst_fraud_type_stats

Composite primary key:

```text
analyst_id + fraud_type
```

Kolonlar:

```text
analyst_id
fraud_type
decision_count
confirmed_fraud_count
correct_decision_count
false_positive_count
accuracy_rate
updated_at
version
```

Bu tablo:

- Uzman Avcı badge’i
- Fraud türü bazlı performans
- AI assignment performance projection

için kullanılır.

---

# 58. Standart Outbox Tablosu

Her servis kendi schema’sında aynı mantıksal outbox tasarımına sahip olur.

Tablo isimleri:

```text
identity.outbox_messages
txn.outbox_messages
ai.outbox_messages
game.outbox_messages
```

## 58.1 Kolonlar

| Kolon             | Tip                     |
| ----------------- | ----------------------- |
| `id`              | `varchar(26)`           |
| `event_id`        | `varchar(26)`           |
| `event_type`      | `varchar(150)`          |
| `event_version`   | `integer`               |
| `routing_key`     | `varchar(200)`          |
| `payload`         | `jsonb`                 |
| `headers`         | `jsonb`                 |
| `occurred_at`     | `timestamptz`           |
| `created_at`      | `timestamptz`           |
| `published_at`    | `timestamptz` nullable  |
| `attempt_count`   | `integer`               |
| `next_attempt_at` | `timestamptz`           |
| `locked_until`    | `timestamptz` nullable  |
| `lock_owner`      | `varchar(100)` nullable |
| `last_error`      | `text` nullable         |

## 58.2 Unique

```sql
CREATE UNIQUE INDEX ux_outbox_event_id
ON {schema}.outbox_messages (event_id);
```

## 58.3 Worker Index’i

```sql
CREATE INDEX ix_outbox_pending
ON {schema}.outbox_messages (
    next_attempt_at,
    created_at
)
WHERE published_at IS NULL;
```

## 58.4 Worker Lock

Outbox worker:

```sql
SELECT ...
FROM outbox_messages
WHERE published_at IS NULL
AND next_attempt_at <= now()
AND (
    locked_until IS NULL
    OR locked_until < now()
)
ORDER BY created_at
FOR UPDATE SKIP LOCKED
LIMIT @batch_size;
```

kullanabilir.

## 58.5 Publish Sonrası

Publisher confirm alındığında:

```text
published_at = now
last_error = null
locked_until = null
lock_owner = null
```

olarak güncellenir.

---

# 59. Standart Inbox Tablosu

Tablo isimleri:

```text
identity.inbox_messages
txn.inbox_messages
ai.inbox_messages
game.inbox_messages
```

## 59.1 Kolonlar

```text
event_id
consumer_name
event_type
event_version
payload_hash
status
received_at
processed_at
attempt_count
last_error
correlation_id
```

Status:

```text
PROCESSING
PROCESSED
FAILED
```

Composite primary key:

```text
event_id + consumer_name
```

## 59.2 Consumer Transaction’ı

Consumer:

1. Inbox kaydını oluşturur.
2. Business değişikliğini yapar.
3. Gerekli outbox mesajlarını yazar.
4. Inbox status’ünü `PROCESSED` yapar.
5. Tek local transaction commit eder.
6. RabbitMQ mesajını ACK eder.

Aynı event tekrar geldiğinde primary key conflict oluşur.

Mevcut status `PROCESSED` ise:

- Business logic çalışmaz.
- Mesaj ACK edilir.

## 59.3 Payload Hash

Aynı `event_id` farklı payload ile gelirse güvenlik veya producer hatası kabul edilir.

Bu durumda:

- Payload hash karşılaştırılır.
- Mesaj işlenmez.
- Error loglanır.
- DLQ’ya yönlendirilir.
- Audit/alert oluşturulabilir.

---

# 60. Veri Transaction Sınırları

## 60.1 Transaction Oluşturma

Aynı database transaction içinde:

```text
idempotency_records insert
transactions insert
transaction.created outbox insert
```

Commit sonrası response döner.

## 60.2 AI Assessment Uygulama

Aynı transaction içinde:

```text
inbox insert/update
ai_assessments insert
transactions update
risk_cases insert gerekirse
case_assignments insert gerekirse
analyst_workloads update gerekirse
case_transitions insert
outbox messages insert
```

## 60.3 Case Kararı

Aynı transaction içinde:

```text
risk_cases update
transactions update
case_assignments update
analyst_workloads decrement
case_transitions insert
temporary_blocks finalize/release
case.decision.made outbox
audit.entry.requested outbox
notification outbox
```

## 60.4 Gamification Consumer

Aynı transaction içinde:

```text
inbox insert/update
rule_evaluations insert
point_ledger insert
analyst_score_summaries update
daily/weekly stats update
badge insert gerekirse
performance summary update
notification/performance outbox
```

## 60.5 Refresh Rotation

Aynı transaction içinde:

```text
old refresh session lock
old session revoke
new refresh session insert
replacement relation update
audit outbox insert
```

---

# 61. Foreign Key Politikası

## 61.1 Aynı Database İçinde

Aynı servis database’inde foreign key kullanılacaktır.

Örnek:

```text
risk_cases.transaction_id -> transactions.id
case_assignments.case_id -> risk_cases.id
customer_feedback.case_id -> risk_cases.id
```

## 61.2 Servisler Arasında

Cross-database foreign key kullanılmayacaktır.

Örnek:

```text
txn.transactions.customer_id
```

Identity Database’e foreign key değildir.

Bu alan opaque external identity reference’tır.

## 61.3 Delete Davranışı

Çoğu business ilişkide:

```text
ON DELETE RESTRICT
```

kullanılacaktır.

Cascade delete yalnızca child kayıt parent olmadan anlamsız ve business history taşımıyorsa kullanılabilir.

Baseline’da transaction/case/audit/ledger history için cascade delete kullanılmayacaktır.

---

# 62. Hard Delete ve Soft Delete Politikası

## 62.1 Hard Delete Yapılmayacak Veriler

```text
transactions
risk_cases
case_transitions
case_assignments
ai_assessments
predictions
prediction_feedback
point_ledger
earned_badges
audit_logs
customer_feedback
```

## 62.2 Deactivation Kullanılacak Veriler

```text
users
staff_profiles
specialties
regions
badge_definitions
model_versions
```

Bu tablolarda:

```text
is_active
deactivated_at
retired_at
```

gibi alanlar kullanılabilir.

## 62.3 Demo Reset

Demo verisinin silinmesi public business API ile yapılmayacaktır.

Ayrı local/demo reset script’i:

- Volume reset
- Database truncate
- Migration
- Seed

işlemlerini kontrollü olarak yapabilir.

Demo reset endpoint’i production profile’da bulunmamalıdır.

---

# 63. Veri Saklama Politikası

Case dokümanı yasal retention süresi tanımlamamaktadır.

FraudCell baseline aşağıdaki teknik retention değerlerini kullanır.

| Veri                      | Baseline Retention                |
| ------------------------- | --------------------------------- |
| Transaction ve case       | Otomatik silme yok                |
| Audit log                 | Otomatik silme yok                |
| Point ledger              | Otomatik silme yok                |
| AI prediction             | Otomatik silme yok                |
| Model metadata            | Otomatik silme yok                |
| OTP challenge             | 24 saat sonra cleanup             |
| Başarısız login detayları | 90 gün                            |
| Expired refresh session   | Expiry sonrası 30 gün             |
| Idempotency record        | 24 saat                           |
| Published outbox          | 7 gün                             |
| Processed inbox           | 30 gün                            |
| Failed/DLQ ilişkili inbox | Manuel inceleme tamamlanana kadar |
| Temporary worker lock     | Otomatik süresi dolar             |

Bu süreler environment/config üzerinden değiştirilebilir.

Yasal üretim retention politikası yarışma kapsamı dışında ayrıca belirlenmelidir.

---

# 64. Hassas Veri Sınıflandırması

## 64.1 Secret

- Database password
- RabbitMQ password
- JWT private key
- Raw refresh token
- OTP kodu
- Internal service secret

Secret veritabanında plaintext tutulmaz veya gerektiğinde secret store/environment üzerinden yönetilir.

## 64.2 Kişisel Veri

- Ad
- Soyad
- GSM
- E-posta
- IP address
- User agent
- Customer ID ile ilişkilendirilebilir işlem geçmişi

Bu veriler minimum servis sınırında tutulur.

## 64.3 Güvenlik Hassas Verisi

- Password hash
- Refresh token hash
- Security stamp
- Device fingerprint hash
- Login failure kayıtları
- Audit details

## 64.4 Operasyonel Veri

- Transaction amount
- Risk score
- Fraud type
- Case state
- SLA
- Assignment
- Puan
- Badge

## 64.5 Event Veri Minimizasyonu

Event payload yalnızca consumer’ın ihtiyacı olan alanları taşımalıdır.

Aşağıdakiler event’lere eklenmemelidir:

- Password hash
- OTP
- Refresh token
- Access token
- JWT private key
- Gereksiz GSM/e-posta
- Tam müşteri profili

---

# 65. PII ve Loglama

Database’te saklanan PII loglara otomatik olarak yazılmayacaktır.

Entity veya request nesnesinin tamamını serialize ederek loglamak yasaktır.

Loglarda:

```text
customer_id
transaction_id
case_id
correlation_id
```

kullanılması tercih edilir.

GSM gerekiyorsa maskelenir:

```text
+90******1234
```

E-posta gerekiyorsa maskelenir:

```text
f***@example.com
```

---

# 66. Device Fingerprint

Ham cihaz fingerprint değeri saklanmayacaktır.

Saklanacak değer:

```text
device_fingerprint_hash
```

Hash:

- Service-side salt/pepper ile üretilebilir
- Deterministik eşleşmeye izin vermelidir
- Orijinal cihaz bilgisini doğrudan açığa çıkarmamalıdır

AI feature üretimi için:

```text
is_new_device
device_age_days
```

gibi türetilmiş değerler event içinde taşınabilir.

---

# 67. Index Tasarım Prensipleri

Her foreign key otomatik olarak index almaz.

Query planına göre gerekli index açıkça oluşturulacaktır.

Index ekleme kriterleri:

- Sık kullanılan filter
- Join
- Sort
- Worker polling
- Unique invariant
- Dashboard aggregate
- Ownership query

Gereksiz index:

- Write maliyetini artırır
- Migration süresini artırır
- Disk kullanımını artırır

Her index’in hizmet ettiği query dokümante edilmelidir.

---

# 68. Ownership Query Index’leri

Customer transaction sorgusu:

```sql
WHERE customer_id = @customer_id
ORDER BY occurred_at DESC
```

Index:

```text
customer_id + occurred_at DESC
```

Analyst case sorgusu:

```sql
WHERE assigned_analyst_id = @analyst_id
AND status IN (...)
ORDER BY sla_priority, sla_deadline_at
```

Index:

```text
assigned_analyst_id + sla_priority + sla_deadline_at
```

IDOR savunması uygulama query’sinin parçası olduğu için ownership kolonları indekslenmelidir.

---

# 69. Worker Polling Index’leri

Aşağıdaki worker’lar partial index kullanır:

- Outbox publisher
- Assessment watchdog
- SLA breach worker
- Case closure worker
- Verification timeout worker
- Queue assignment worker
- Expired refresh cleanup
- OTP cleanup

Worker query’si index ile uyumlu tasarlanmalıdır.

Örnek yanlış yaklaşım:

```sql
WHERE date(sla_deadline_at) = current_date
```

Bu yaklaşım index kullanımını bozabilir.

Doğru:

```sql
WHERE sla_deadline_at <= @now
```

---

# 70. Pagination

Liste query’lerinde büyük offset kullanımından kaçınılacaktır.

Tercih:

```text
Cursor/keyset pagination
```

Örnek transaction cursor:

```text
occurred_at + id
```

Örnek case cursor:

```text
sla_deadline_at + id
```

İlk sürümde küçük dashboard listelerinde offset pagination kullanılabilir.

Ancak müşteri transaction geçmişi ve case listeleri keyset pagination’a uygun tasarlanmalıdır.

---

# 71. Materialized View Politikası

Baseline’da PostgreSQL materialized view zorunlu değildir.

Dashboard ve leaderboard:

- Normal aggregate query
- Summary projection table
- Indexed statistics table

üzerinden çalışacaktır.

Materialized view yalnızca:

- Ölçülmüş query problemi
- Açık refresh stratejisi
- Staleness kabulü

varsa ADR ile eklenebilir.

Gamification günlük/haftalık özet tabloları materialized projection görevi görür.

---

# 72. PostgreSQL Native Feature Kullanımı

Kullanılabilecek özellikler:

- Partial index
- Check constraint
- Unique constraint
- `FOR UPDATE SKIP LOCKED`
- JSONB
- GIN index gerektiğinde
- `timestamptz`
- `inet`
- Window function
- `ON CONFLICT`
- Transaction isolation
- Generated plan analysis

Baseline’da kullanılmayacak özellikler:

- Cross-database foreign data wrapper
- Logical replication ile business integration
- Trigger ile servisler arası event publish
- Database içinden HTTP çağrısı
- Stored procedure içine business state machine
- Shared database schema

---

# 73. Trigger Politikası

Business logic PostgreSQL trigger’larına taşınmayacaktır.

Trigger yalnızca aşağıdaki sınırlı alanlarda değerlendirilebilir:

- `updated_at` standardı
- Append-only tablo update/delete engeli
- Güvenlik guard’ı

State machine, puan hesaplama veya assignment trigger içinde yapılmayacaktır.

Örnek yasak:

```text
risk_cases update trigger
-> point_ledger insert
```

Bu servis sınırını bozar.

---

# 74. Migration Stratejisi

## 74.1 Araçlar

.NET servisleri:

```text
EF Core Migrations
```

AI Service:

```text
Alembic
```

## 74.2 Migration Sahipliği

Her servisin migration dosyası kendi klasöründe bulunur.

Örnek:

```text
src/Services/Identity/Migrations
src/Services/Transaction/Migrations
src/AI/alembic
src/Services/Gamification/Migrations
```

Bir servis başka servisin migration’ını içermez.

## 74.3 One-Shot Migration

Tercih edilen yaklaşım:

```text
Aynı service image
+
farklı migrate command
```

Örnek Compose servisleri:

```text
identity-migrate
transaction-migrate
ai-migrate
gamification-migrate
```

Migration başarıyla tamamlanmadan domain servisi ready olmamalıdır.

## 74.4 Startup Auto-Migration

Her application instance’ın startup sırasında otomatik migration çalıştırması yasaktır.

Nedenleri:

- Paralel migration yarışı
- Startup hatalarının gizlenmesi
- Schema değişikliğinin kontrolsüz uygulanması
- Runtime user’a gereksiz DDL yetkisi verilmesi

---

# 75. Migration Kuralları

Her migration:

- Tek servis database’ini etkiler
- Anlamlı isim taşır
- Geriye dönük etkisi değerlendirilir
- Seed business verisini gereksiz değiştirmez
- CI’da boş database’e uygulanır
- Mevcut schema snapshot’ından uygulanır
- Migration sonrası service build/test geçer

Örnek isim:

```text
20260722_AddRiskCaseSlaColumns
```

Yanlış:

```text
Migration1
UpdateDb
Fix
```

---

# 76. Expand-and-Contract

Breaking schema değişikliklerinde:

1. Yeni nullable kolon eklenir.
2. Uygulama hem eski hem yeni alanı okuyabilir.
3. Backfill yapılır.
4. Uygulama yeni alanı source of truth yapar.
5. Eski kolon daha sonraki migration’da kaldırılır.

Yarışma ortamında tek instance olsa bile güvenli migration pratiği korunacaktır.

---

# 77. Migration Rollback Politikası

Production benzeri ortamda destructive down migration’a güvenilmeyecektir.

Rollback yaklaşımı:

- Uygulama image rollback
- Forward-fix migration
- Gerekirse backup restore

`Down()` metodu geliştirme için bulunabilir; ancak veri kaybı riski açıkça değerlendirilmelidir.

Final öncesinde migration’lar temiz environment üzerinde doğrulanacaktır.

---

# 78. Seed Stratejisi

Seed iki kategoriye ayrılır.

## 78.1 Reference Seed

Her ortamda gerekli sabit veriler:

- Roller
- Specialties
- Regions
- Badge definitions
- Model metadata
- Specialties
- Regions
- Badge definitions
- Gamification rule codes

Reference seed idempotent olmalıdır.

Aynı seed tekrar çalıştığında duplicate veri oluşturmamalıdır.

## 78.2 Demo Seed

Yalnızca demo/local ortam:

- Müşteri
- Admin
- Supervisor
- Analistler
- Geçmiş transactions
- Performance geçmişi
- Leaderboard başlangıç verisi
- Yüksek risk demo senaryosu
- AI synthetic dataset/model artifact referansı

Demo seed production profile’da otomatik çalışmamalıdır.

---

# 79. Demo Kullanıcıları

Demo credential bilgileri root README’de belirtilir.

Database seed içinde plaintext password saklanmaz.

Seed işlemi:

- Password hasher üzerinden hash üretir
- OTP provider demo modunda `1234` kullanır
- Refresh session seed etmez
- Sabit kullanıcı ID’leri kullanabilir

Sabit demo ID kullanımı test ve demo tekrar üretilebilirliği için kabul edilir.

---

# 80. Demo Reset

Demo reset script’i:

1. Uygulama container’larını durdurur.
2. İlgili volume’ları temizler veya schema’ları resetler.
3. Migration’ları uygular.
4. Reference seed çalıştırır.
5. Demo seed çalıştırır.
6. Serv

Demo reset script’i:

1. Uygulama container’larını durdurisleri başlatır.
2. Health check bekler.
3. Smoke test çalıştırır.

Komutlar:

```bash
./scripts/demo-reset.sh
```

ve gerekirse:

```powershell
./scripts/demo-reset.ps1
```

Demo reset production environment’ta çalıştırılamamalıdır.

---

# 81. Backup ve Restore

Yarışma demo ortamında ana kurtarma yöntemi:

```text
Deterministik migration + seed + model artifact
```

olacaktır.

Bununla birlikte PostgreSQL backup desteği:

```text
pg_dump
pg_restore
```

ile sağlanabilir.

Her database ayrı yedeklenir.

Örnek:

```text
identity-backup.dump
transaction-backup.dump
ai-backup.dump
gamification-backup.dump
```

Ortak tek backup dosyasına bağımlı olunmayacaktır.

---

# 82. Veri Bütünlüğü Kontrolü

CI veya smoke test aşağıdaki invariant’ları kontrol edebilir:

- Bir transaction için birden fazla RiskCase yok
- Bir case için birden fazla aktif assignment yok
- Analyst workload `0–10` arasında
- Final case’lerde decision ve decided time var
- KAPANDI case’lerde closed time var
- Duplicate source event puan üretmemiş
- Duplicate assessment uygulanmamış
- Audit source event unique
- Refresh token hash unique
- Bir case için bir feedback var
- Bir analyst bir badge’i bir kez kazanmış
- Tek aktif AI model bundle var

---

# 83. Veri Drift Kontrolü

Projection ve summary tabloları zaman içinde drift gösterebilir.

Bu nedenle rebuild/verification işlemleri planlanacaktır.

## 83.1 Analyst Workload Verification

Transaction Service periyodik olarak:

```text
analyst_workloads.active_case_count
```

ile gerçek aktif assignment sayısını karşılaştırabilir.

Fark varsa:

- Error log
- Metric
- Controlled correction
- Audit

oluşturulur.

## 83.2 Score Summary Verification

Gamification Service:

```text
analyst_score_summaries.total_points
```

değerini `point_ledger` toplamıyla doğrulayabilir.

## 83.3 AI Projection Drift

AI analyst projection’ı:

- Son source event
- Source version
- Updated timestamp

üzerinden kontrol edilir.

Projection stale ise assignment önerisine confidence düşürülebilir.

---

# 84. Connection Pool

Her servis yalnızca kendi database connection pool’unu kullanır.

Pool boyutu service concurrency ve PostgreSQL limitine göre ayarlanır.

Demo baseline örneği:

```text
Minimum Pool Size = 0
Maximum Pool Size = 20
```

Her servis için ayrı pool vardır.

Pool exhaustion metric ve health bilgisi loglanmalıdır.

Uzun transaction’lar ve açık connection’lar önlenmelidir.

---

# 85. Transaction Isolation

Default isolation:

```text
READ COMMITTED
```

olacaktır.

Aşağıdaki kritik işlemlerde explicit locking veya daha yüksek isolation değerlendirilebilir:

- Analyst capacity increment
- Refresh token rotation
- Transaction number counter
- Concurrent case decision
- Idempotency key oluşturma
- Badge tek seferlik kazanım

Global olarak `SERIALIZABLE` kullanılmayacaktır.

Gerektiğinde dar transaction sınırında kullanılabilir.

---

# 86. Query Timeout

Uzun süren database query’leri sınırsız beklemeyecektir.

Command timeout service/config bazlı tanımlanır.

Demo baseline:

```text
5–10 saniye
```

Worker batch query’leri daha farklı limite sahip olabilir.

Timeout değerleri:

- Health check
- API query
- Migration
- Worker

için ayrı tanımlanabilir.

---

# 87. N+1 ve Projection Politikası

Liste endpoint’lerinde bütün entity graph yüklenmeyecektir.

EF Core ve SQLAlchemy query’leri:

- DTO projection
- Gerekli kolonlar
- Kontrollü join
- Pagination

kullanacaktır.

Örnek yanlış:

```text
100 case
-> her case için ayrı analyst query
-> her case için ayrı note query
```

Doğru:

- Batch projection
- Gerekli aggregate
- Ayrı detay endpoint’i

---

# 88. JSONB Versiyonlama

JSONB içinde saklanan versioned yapılar:

- Event payload
- Reason code
- Feature snapshot
- Model metrics
- Audit details

gerekirse kendi schema version alanını taşımalıdır.

Örnek:

```json
{
  "schemaVersion": 1,
  "items": []
}
```

JSONB alanı zaman içinde sessizce farklı anlamlara dönüştürülmeyecektir.

---

# 89. Database Error Mapping

Database constraint isimleri anlamlı olmalıdır.

Örnek:

```text
ux_transactions_no
ux_risk_cases_transaction
ux_case_assignments_active_case
ux_point_ledger_event_rule
ux_refresh_sessions_token_hash
```

Uygulama bilinen constraint violation’ları domain error code’a map eder.

Örnek:

```text
ux_customer_feedback_case
-> FEEDBACK_ALREADY_SUBMITTED
```

Bilinmeyen database error kullanıcıya internal detayla dönmez.

---

# 90. Veri Mimarisi Testleri

## 90.1 Migration Testleri

- Boş database’e bütün migration’lar uygulanır
- Migration sonrası service başlar
- Reference seed çalışır
- Migration ikinci kez duplicate üretmez
- Schema beklenen tablo ve index’leri içerir

## 90.2 Constraint Testleri

- Negatif amount reddedilir
- Risk score `1` üstü reddedilir
- Duplicate transaction number reddedilir
- Duplicate active assignment reddedilir
- Duplicate feedback reddedilir
- Analyst capacity `10` üstü reddedilir
- Block decision note olmadan final row oluşmaz
- Duplicate point ledger event/rule reddedilir
- Duplicate audit source event reddedilir

## 90.3 Index Testleri

Kritik query’ler için `EXPLAIN ANALYZE` kontrolü yapılabilir:

- Analyst active case listesi
- SLA worker
- Assessment watchdog
- Outbox worker
- Daily leaderboard
- Customer transaction history
- Audit search

## 90.4 Isolation Testleri

- AI credential ile Transaction DB’ye bağlantı başarısız
- Gamification credential ile Identity DB’ye bağlantı başarısız
- Gateway’den DB portuna erişim başarısız
- Runtime user schema değiştiremez
- Runtime user append-only tabloyu silemez

## 90.5 Concurrency Testleri

- Aynı idempotency key paralel
- Aynı refresh token paralel
- Aynı analyst kapasite sınırında paralel assignment
- Aynı case paralel karar
- Aynı event paralel consumer
- Aynı badge paralel kazanım

---

# 91. Veri Mimarisi Kabul Kriterleri

## Fiziksel İzolasyon

- Dört ayrı PostgreSQL container bulunur.
- Dört ayrı volume bulunur.
- Her servis yalnızca kendi data network’ündedir.
- Database portları host’a açık değildir.
- Her servisin ayrı runtime credential’ı vardır.

## Identity

- GSM ve e-posta unique korunur.
- Password ve OTP plaintext değildir.
- Refresh rotation atomiktir.
- Token reuse family revoke oluşturur.
- Audit log append-only ve source event bazında idempotenttir.

## Transaction

- Transaction number unique ve concurrency-safe üretilir.
- Transaction create idempotenttir.
- Bir transaction için tek RiskCase bulunur.
- Bir case için tek aktif assignment bulunur.
- Analyst workload `0–10` arasında korunur.
- SLA ve closure worker query’leri indekslidir.
- State geçmişi append-only tutulur.

## AI

- Model ve dataset version’ları izlenebilir.
- Prediction kullanılan model bundle ile ilişkilidir.
- Aynı source event duplicate prediction üretmez.
- Analyst candidate skorları açıklanabilir biçimde saklanır.
- Feedback ve metric hesaplamaları prediction’a bağlanabilir.

## Gamification

- Point ledger immutable’dır.
- Duplicate event aynı puanı ikinci kez vermez.
- Badge aynı analiste yalnızca bir kez verilir.
- Günlük ve haftalık leaderboard indexed summary tablolardan üretilir.
- Performance summary AI projection event’i için kullanılabilir.

## Messaging

- Her serviste outbox bulunur.
- Her consumer’da inbox bulunur.
- Outbox worker partial index kullanır.
- Publisher confirm sonrası `published_at` yazılır.
- Inbox ve business işlem aynı local transaction’da commit edilir.

## Operasyon

- Migration runtime’dan ayrıdır.
- Seed idempotenttir.
- Demo reset deterministiktir.
- Retention cleanup worker’ları tanımlıdır.
- Critical constraint ve isolation testleri CI’da çalışır.

---

# 92. Nihai Veri Karar Özeti

| Konu                 | Nihai Karar                                  |
| -------------------- | -------------------------------------------- |
| PostgreSQL sayısı    | 4 ayrı container                             |
| Database paylaşımı   | Yasak                                        |
| Cross-database query | Yasak                                        |
| Database portu       | Host’a kapalı                                |
| Internal ID          | ULID, `varchar(26)`                          |
| Timestamp            | `timestamptz`, UTC                           |
| Para                 | `numeric(18,2)`                              |
| Risk skoru           | `numeric(6,5)`                               |
| Enum                 | `varchar + CHECK`                            |
| Esnek payload        | Kontrollü JSONB                              |
| Concurrency          | `version bigint`                             |
| Transaction number   | Yıllık atomic counter                        |
| Transaction silme    | Yok                                          |
| Case silme           | Yok                                          |
| Audit                | Append-only                                  |
| Point ledger         | Immutable                                    |
| AI prediction        | Immutable snapshot                           |
| Outbox               | Her producer serviste                        |
| Inbox                | Her consumer serviste                        |
| Event garantisi      | At-least-once + idempotency                  |
| Migration            | EF Core ve Alembic                           |
| Migration çalıştırma | One-shot migrate command/container           |
| Runtime DDL hakkı    | Yok                                          |
| Seed                 | Reference + demo ayrımı                      |
| Demo reset           | Migration + deterministik seed               |
| Retention            | Teknik baseline, configurable                |
| Projection           | Yeniden oluşturulabilir, authoritative değil |

---

# 93. Son Veri İlkeleri

1. Her servis yalnızca kendi veritabanının sahibidir.
2. Database bir servisler arası entegrasyon aracı değildir.
3. Cross-database foreign key kullanılmaz.
4. Critical invariant hem domain hem database constraint ile korunur.
5. Immutable geçmiş tabloları güncellenmez.
6. Event ve business değişikliği aynı local transaction’da outbox’a yazılır.
7. Consumer sonucu ve inbox kaydı aynı local transaction’da commit edilir.
8. Duplicate event duplicate business sonucu üretemez.
9. AI’ın orijinal tahmini değiştirilmez.
10. Point ledger geçmişten silinmez.
11. Audit kayıtları append-only tutulur.
12. Transaction ve case hard delete edilmez.
13. Runtime user migration yapamaz.
14. Migration credential runtime servisine verilmez.
15. PII yalnızca gerekli servis sınırında saklanır.
16. Secret ve token plaintext olarak saklanmaz.
17. Worker query’leri partial index ile desteklenir.
18. Projection authoritative veri olarak değerlendirilmez.
19. Summary tabloları kaynak ledger/history üzerinden doğrulanabilir.
20. Her veri bütünlüğü iddiası integration veya constraint testiyle kanıtlanır.

---

# 94. Sonraki Doküman

Bu dokümandan sonra hazırlanacak dosya:

```text
07-API-DESIGN.md
```

Bu dosyada aşağıdakiler kesinleştirilecektir:

- Public ve internal API ayrımı
- Gateway route’ları
- Identity endpoint’leri
- Transaction endpoint’leri
- Case action endpoint’leri
- AI metric ve model endpoint’leri
- Gamification endpoint’leri
- Request ve response modelleri
- Standard response envelope
- Error code standardı
- Authentication ve authorization gereksinimleri
- Idempotency header’ı
- Optimistic concurrency sözleşmesi
- Pagination, filtering ve sorting
- OpenAPI üretimi
- API versioning
- Rate limit politikaları
- SSE endpoint ve event formatı
