# FraudCell — Gereksinim İzlenebilirlik Matrisi

**Dosya:** `docs/01-REQUIREMENTS-TRACEABILITY.md`  
**Durum:** Architecture Planning — Baseline v1.0  
**Kaynak:** Turkcell CodeNight 2026 Final — FraudCell Case, 18 sayfa  
**Amaç:** Case dokümanındaki hiçbir zorunluluğun geliştirme, test, dokümantasyon veya canlı demo sırasında kaybolmamasını sağlamak.

---

## 1. Bu Doküman Nasıl Kullanılacak?

Bu dosya projenin ana kontrol tablosudur. Her gereksinim:

1. Benzersiz bir kimlik alır.
2. Bir servis veya teknik bileşene atanır.
3. Kod/API/event/veritabanı karşılığıyla eşleştirilir.
4. Test yöntemiyle doğrulanır.
5. Gerekliyse canlı demo adımıyla kanıtlanır.
6. Geliştirme boyunca durum bilgisiyle takip edilir.

### Durum Değerleri

| Durum | Anlamı |
|---|---|
| `NOT_STARTED` | Henüz ele alınmadı |
| `DESIGNED` | Mimari ve davranış kararı dokümante edildi |
| `IN_PROGRESS` | Geliştirme devam ediyor |
| `IMPLEMENTED` | Kodlandı, ancak tüm doğrulamalar tamamlanmadı |
| `VERIFIED` | Test ve kabul kriterleri geçti |
| `DEMO_READY` | Canlı demo için seed/script/akış hazır |
| `BLOCKED` | Açık karar veya teknik engel var |
| `N/A` | Bu projede uygulanmıyor; gerekçesi yazılmalı |

### Öncelik Değerleri

| Öncelik | Anlamı |
|---|---|
| `P0` | Diskalifiye, temel mimari veya zorunlu demo riski |
| `P1` | Zorunlu fonksiyon, güvenlik veya yüksek puan etkisi |
| `P2` | Zorunlu kalite/dokümantasyon/UI gereksinimi |
| `P3` | Bonus veya farklılaştırıcı özellik |

### İzlenebilirlik Kuralı

Bir gereksinim yalnızca kodlandığında tamamlanmış sayılmaz. `VERIFIED` olabilmesi için aşağıdakilerden uygun olanların tamamı bulunmalıdır:

- Kod karşılığı
- Veritabanı veya event sözleşmesi
- Unit/integration/security testi
- OpenAPI veya Markdown dokümantasyonu
- Gerekliyse demo adımı

---

# 2. Sistem Seviyesi ve Mimari Gereksinimler

| ID | Öncelik | Kaynak | Gereksinim | Sahip/Bileşen | Uygulama Karşılığı | Doğrulama/Kanıt | Durum |
|---|---:|---|---|---|---|---|---|
| SYS-001 | P0 | s.1, s.3–4 | Sistem mikroservis mimarisinde olmalıdır. | Tüm sistem | Ayrı process/container olarak Identity, Transaction, AI, Gamification ve Edge Gateway | `docker compose ps`; mimari diyagram; servis kapatma testi | NOT_STARTED |
| SYS-002 | P0 | s.4 | En az dört bağımsız mikroservis bulunmalıdır. | Tüm sistem | `identity-service`, `transaction-service`, `ai-service`, `gamification-service` | Compose servis listesi ve health endpointleri | NOT_STARTED |
| SYS-003 | P0 | s.4 | Tüm istemci trafiği bir API Gateway üzerinden geçmelidir. | Edge Gateway | ASP.NET Core + YARP; dışarıya açılan tek uygulama portu | Doğrudan iç servis portlarına host erişiminin kapalı olması | NOT_STARTED |
| SYS-004 | P1 | s.4 | Gateway routing yapmalıdır. | Edge Gateway | `/api/v1/auth`, `/transactions`, `/cases`, `/ai`, `/game` route eşlemeleri | Gateway integration testleri | NOT_STARTED |
| SYS-005 | P1 | s.4 | Gateway rate limiting uygulamalıdır. | Edge Gateway | Route/policy bazlı ASP.NET Core rate limiter | Brute-force ve 429 security testi | NOT_STARTED |
| SYS-006 | P1 | s.4 | Gateway JWT doğrulamalıdır. | Edge Gateway | RSA public key ile issuer, audience, signature, expiry kontrolü | Geçersiz/değiştirilmiş/süresi dolmuş token testleri | NOT_STARTED |
| SYS-007 | P0 | s.1, s.4, s.17 | Her servis kendi veritabanına sahip olmalıdır. | Tüm servisler | Dört ayrı PostgreSQL container, kullanıcı, volume ve network | Compose topolojisi; connection string incelemesi | NOT_STARTED |
| SYS-008 | P0 | s.4, s.17 | Bir servis başka servisin veritabanına doğrudan erişmemelidir. | Tüm servisler | Servis-bazlı data network izolasyonu; ayrı DB credentials | Network erişim testi; kod taraması | NOT_STARTED |
| SYS-009 | P1 | s.4, s.12–13 | Servisler arası iletişim event tabanlı tasarlanmalıdır. | RabbitMQ + servisler | RabbitMQ topic exchange, durable queues, outbox/inbox | Event integration testleri; `EVENTS.md` | NOT_STARTED |
| SYS-010 | P1 | s.4 | REST çağrıları minimumda tutulmalıdır. | Tüm servisler | Ana işlem/AI akışı event-first; HTTP yalnızca sorgu/edge/internal operasyonlar | Mimari review ve çağrı envanteri | NOT_STARTED |
| SYS-011 | P0 | s.4, s.7, s.15 | Bir servis çöktüğünde diğer servisler çalışmaya devam etmelidir. | Tüm sistem | Outbox, durable queue, fallback state, bağımsız DB | AI/Gamification/RabbitMQ/Identity kapatma testleri | NOT_STARTED |
| SYS-012 | P0 | s.4, s.15, s.17 | Sistem `docker compose up` ile tek komutta ayağa kalkmalıdır. | Infrastructure | Kök dizinde `compose.yml`; migration, seed ve healthcheck akışı | Temiz makine/sıfır volume smoke testi | NOT_STARTED |
| SYS-013 | P2 | s.4, s.17 | Her servisin kendi README dosyası olmalıdır. | Her servis | Sorumluluk, endpoint, environment, run/test bilgileri | Dokümantasyon checklist’i | NOT_STARTED |
| SYS-014 | P1 | s.3 | Sistem gerçek zamanlı dolandırıcılık tespit platformu olarak çalışmalıdır. | Transaction + AI + Edge | Asenkron assessment, SSE sonuç bildirimi, SLA | Uçtan uca demo ve latency gözlemi | NOT_STARTED |
| SYS-015 | P1 | s.3 | Dört rol desteklenmelidir: müşteri, fraud analisti/personel, süpervizör, admin. | Identity + servis authorization | Role enum/policy; seed kullanıcılar | Yetki matrisi integration testleri | NOT_STARTED |
| SYS-016 | P2 | s.1 | En az bir frontend platformu bulunmalıdır. | Web | React + TypeScript web uygulaması | Responsive UI smoke testi | NOT_STARTED |

---

# 3. Rol ve Yetki Gereksinimleri

| ID | Öncelik | Kaynak | Gereksinim | Sahip | Uygulama Karşılığı | Doğrulama | Durum |
|---|---:|---|---|---|---|---|---|
| ROLE-001 | P1 | s.3, s.5 | Müşteri işlem oluşturabilmelidir. | Transaction | Customer-only create transaction policy | Customer token ile 201; diğer rollerle 403 | NOT_STARTED |
| ROLE-002 | P1 | s.3, s.5 | Müşteri yalnızca kendi işlem/vaka kayıtlarını görebilmelidir. | Transaction | Ownership filtresi query seviyesinde | IDOR testleri | NOT_STARTED |
| ROLE-003 | P1 | s.3, s.5 | Analist yalnızca kendisine atanmış vakaları görebilmelidir. | Transaction | `assigned_analyst_id == current_user_id` | Başka analistin case ID’siyle 404/403 | NOT_STARTED |
| ROLE-004 | P1 | s.3, s.5 | Süpervizör bütün işlem ve vakaları görebilmelidir. | Transaction | Supervisor policy | Integration test | NOT_STARTED |
| ROLE-005 | P1 | s.5 | Admin bütün kayıtları görebilmelidir. | İlgili servisler | Admin read policies | Integration test | NOT_STARTED |
| ROLE-006 | P1 | s.5, s.7 | Analist vaka durumunu izin verilen geçişlerle değiştirebilmelidir. | Transaction | Intent-based case action endpointleri | State machine testleri | NOT_STARTED |
| ROLE-007 | P1 | s.5, s.7 | Süpervizör vaka durumunu değiştirebilmelidir. | Transaction | Supervisor override policy ve audit | Integration + audit testi | NOT_STARTED |
| ROLE-008 | P1 | s.5, s.9 | Süpervizör manuel atama yapabilmelidir. | Transaction | `PUT /cases/{id}/assignment` | Yetki ve kapasite testleri | NOT_STARTED |
| ROLE-009 | P1 | s.5, s.7, s.9 | Analist ve süpervizör AI fraud türünü değiştirebilmelidir. | Transaction + AI | Override endpoint + feedback event | Override ve accuracy metriği testi | NOT_STARTED |
| ROLE-010 | P1 | s.5, s.11 | Süpervizör dashboard görüntüleyebilmelidir. | Gateway/Frontend/Servisler | Supervisor policy | Customer/analyst ile 403 | NOT_STARTED |
| ROLE-011 | P1 | s.5, s.11 | Admin dashboard görüntüleyebilmelidir. | Gateway/Frontend/Servisler | Admin policy | Integration test | NOT_STARTED |
| ROLE-012 | P1 | s.5 | Yalnızca admin personel hesabı oluşturabilmelidir. | Identity | Admin-only staff create endpoint | Yetki testi | NOT_STARTED |
| ROLE-013 | P1 | s.5–6 | Yalnızca admin audit log görüntüleyebilmelidir. | Identity | Admin-only audit query endpoint | Yetki testi | NOT_STARTED |
| ROLE-014 | P1 | s.5 | Yetkisiz endpoint erişimi 403 dönmeli ve audit edilmelidir. | Gateway + servis + Identity audit | Authorization failure event | 403 + audit record integration testi | NOT_STARTED |

---

# 4. Identity Service Gereksinimleri

## 4.1 Kayıt ve Giriş

| ID | Öncelik | Kaynak | Gereksinim | Uygulama Karşılığı | Doğrulama | Durum |
|---|---:|---|---|---|---|---|
| IDN-001 | P1 | s.5 | Müşteri Turkcell GSM numarasıyla kayıt olabilmelidir. | Customer registration endpoint; normalized unique GSM | Duplicate/invalid GSM testleri | NOT_STARTED |
| IDN-002 | P1 | s.5 | Müşteri OTP ile doğrulanmalıdır. | OTP challenge/verify akışı | Doğru/yanlış/süresi geçen OTP testleri | NOT_STARTED |
| IDN-003 | P1 | s.5 | Demo OTP kodu sabit `1234` olarak simüle edilebilir. | Demo profile OTP provider | Demo login akışı | NOT_STARTED |
| IDN-004 | P1 | s.5 | Müşteri kayıt alanları ad, soyad, GSM ve opsiyonel e-posta olmalıdır. | DTO validation + DB columns | API contract test | NOT_STARTED |
| IDN-005 | P1 | s.5 | Personel hesapları admin tarafından oluşturulmalıdır. | Admin staff endpoint | Admin/non-admin testleri | NOT_STARTED |
| IDN-006 | P1 | s.5 | Personel e-posta + şifreyle giriş yapmalıdır. | Staff login endpoint | Başarılı/başarısız login testleri | NOT_STARTED |
| IDN-007 | P1 | s.5 | Personel oluşturulurken birden fazla uzmanlık atanabilmelidir. | Many-to-many analyst specialties | Persistence test | NOT_STARTED |
| IDN-008 | P1 | s.5 | Personel oluşturulurken birden fazla bölge atanabilmelidir. | Many-to-many analyst regions | Persistence test | NOT_STARTED |
| IDN-009 | P1 | s.5 | Şifre minimum 8 karakter olmalıdır. | Password validator | Boundary test | NOT_STARTED |
| IDN-010 | P1 | s.5 | Şifre en az bir büyük harf içermelidir. | Password validator | Negative test | NOT_STARTED |
| IDN-011 | P1 | s.5 | Şifre en az bir rakam içermelidir. | Password validator | Negative test | NOT_STARTED |
| IDN-012 | P1 | s.5 | Şifre en az bir özel karakter içermelidir. | Password validator | Negative test | NOT_STARTED |
| IDN-013 | P1 | s.5 | Şifre ihlalinde hangi kuralın ihlal edildiği açıkça dönmelidir. | Kodlanmış validation error listesi | Response contract test | NOT_STARTED |
| IDN-014 | P1 | s.5 | Şifreler bcrypt veya Argon2 ile hash’lenmelidir. | Argon2id custom hasher | DB’de plaintext bulunmadığının testi | NOT_STARTED |
| IDN-015 | P1 | s.5 | Beş başarısız girişte hesap 15 dakika kilitlenmelidir. | Persistent lockout counter/`locked_until` | 5. deneme ve süre testi | NOT_STARTED |
| IDN-016 | P1 | s.5 | Kilitli hesaba girişte kalan kilit süresi dönmelidir. | `ACCOUNT_LOCKED` error details | Clock-controlled integration test | NOT_STARTED |

## 4.2 Token Yönetimi

| ID | Öncelik | Kaynak | Gereksinim | Uygulama Karşılığı | Doğrulama | Durum |
|---|---:|---|---|---|---|---|
| IDN-017 | P1 | s.5 | Access token JWT olmalıdır. | RSA imzalı JWT | Token decode/validation testi | NOT_STARTED |
| IDN-018 | P1 | s.5 | Access token 15 dakika geçerli olmalıdır. | Token lifetime config | Clock test | NOT_STARTED |
| IDN-019 | P1 | s.5 | JWT payload’ında user_id bulunmalıdır. | `sub` claim | Claim test | NOT_STARTED |
| IDN-020 | P1 | s.5 | JWT payload’ında rol bulunmalıdır. | `role` claim | Claim test | NOT_STARTED |
| IDN-021 | P1 | s.5 | JWT payload’ında uzmanlık/bölge alanları bulunmalıdır. | Array claims | Claim test | NOT_STARTED |
| IDN-022 | P1 | s.5 | Refresh token 7 gün geçerli olmalıdır. | Refresh session expiry | Clock test | NOT_STARTED |
| IDN-023 | P1 | s.5 | Refresh token veritabanında saklanmalıdır. | Hashlenmiş refresh session kaydı | DB inspection test | NOT_STARTED |
| IDN-024 | P1 | s.5 | Refresh token kullanımında rotation yapılmalıdır. | Eski token revoke + yeni token üretimi | Rotation integration testi | NOT_STARTED |
| IDN-025 | P1 | s.5 | Eski refresh token geçersiz kılınmalıdır. | `revoked_at`, `replaced_by_id` | Reuse testi | NOT_STARTED |
| IDN-026 | P1 | s.5 | Geçersiz kılınmış refresh token tekrar kullanılırsa tüm kullanıcı oturumları sonlandırılmalıdır. | Token family revoke + security stamp | Token theft security testi | NOT_STARTED |
| IDN-027 | P1 | s.5 | Logout refresh token’ı geçersiz kılmalıdır. | Logout endpoint | Logout/refresh rejection testi | NOT_STARTED |

## 4.3 Audit Log

| ID | Öncelik | Kaynak | Gereksinim | Uygulama Karşılığı | Doğrulama | Durum |
|---|---:|---|---|---|---|---|
| AUD-001 | P1 | s.5–6 | Başarılı giriş audit log’a yazılmalıdır. | Append-only audit event | Login sonrası audit query | NOT_STARTED |
| AUD-002 | P1 | s.5–6 | Başarısız giriş audit log’a yazılmalıdır. | Append-only audit event | Invalid password testi | NOT_STARTED |
| AUD-003 | P1 | s.6 | Hesap kilitlenmesi audit log’a yazılmalıdır. | `ACCOUNT_LOCKED` event | 5. deneme testi | NOT_STARTED |
| AUD-004 | P1 | s.6 | Rol değişiklikleri audit log’a yazılmalıdır. | Role change audit event | Admin role update testi | NOT_STARTED |
| AUD-005 | P1 | s.6 | Yetkisiz erişim denemeleri audit log’a yazılmalıdır. | `AUTHORIZATION_DENIED` event | Customer→supervisor endpoint testi | NOT_STARTED |
| AUD-006 | P1 | s.6 | İşlem silme audit log’a yazılmalıdır. | Silme özelliği açılırsa zorunlu; aksi halde endpoint sağlanmaz | API inventory review | NOT_STARTED |
| AUD-007 | P1 | s.6 | Kritik durum değişiklikleri audit log’a yazılmalıdır. | Case transition audit eventleri | Approve/block testleri | NOT_STARTED |
| AUD-008 | P1 | s.6 | Audit kaydında user_id bulunmalıdır. | `actor_id` | Schema test | NOT_STARTED |
| AUD-009 | P1 | s.6 | Audit kaydında işlem tipi bulunmalıdır. | `action` | Schema test | NOT_STARTED |
| AUD-010 | P1 | s.6 | Audit kaydında timestamp bulunmalıdır. | UTC `occurred_at` | Schema test | NOT_STARTED |
| AUD-011 | P1 | s.6 | Audit kaydında IP bulunmalıdır. | Trusted proxy-aware client IP | Integration test | NOT_STARTED |
| AUD-012 | P1 | s.6 | Audit kaydında sonuç bulunmalıdır. | `SUCCESS`/`FAILURE` | Schema test | NOT_STARTED |
| AUD-013 | P1 | s.6 | Audit kaydında ilgili kaynak detayı bulunmalıdır. | Resource type/id + JSON details | Schema test | NOT_STARTED |

---

# 5. Transaction Service Gereksinimleri

## 5.1 İşlem Oluşturma

| ID | Öncelik | Kaynak | Gereksinim | Uygulama Karşılığı | Doğrulama | Durum |
|---|---:|---|---|---|---|---|
| TRX-001 | P1 | s.7 | İşlem girdisi tutar içermelidir. | Positive decimal amount | Validation test | NOT_STARTED |
| TRX-002 | P1 | s.7 | İşlem tipi `ODEME`, `TRANSFER`, `FATURA`, `CEKIM` değerlerinden biri olmalıdır. | Enum validation | Contract test | NOT_STARTED |
| TRX-003 | P1 | s.7 | İşlem girdisi alıcı içermelidir. | Recipient value/object | Validation test | NOT_STARTED |
| TRX-004 | P1 | s.7 | İşlem girdisi kaynak cihaz içermelidir. | Device identifier/metadata | Validation test | NOT_STARTED |
| TRX-005 | P1 | s.7 | İşlem girdisi konum/şehir içermelidir. | City/country fields | Validation test | NOT_STARTED |
| TRX-006 | P1 | s.7 | İşlem girdisi zaman içermelidir. | UTC occurrence timestamp | Timezone test | NOT_STARTED |
| TRX-007 | P1 | s.7 | İşlem form veya simülatör üzerinden üretilebilmelidir. | Customer transaction form + demo presets | UI/demo test | NOT_STARTED |
| TRX-008 | P1 | s.7 | Her işlem AI değerlendirmesini otomatik tetiklemelidir. | `transaction.created.v1` event | Event integration testi | NOT_STARTED |
| TRX-009 | P0 | s.7 | AI erişilemezken işlem yine kaydedilmelidir. | `assessment_status=PENDING`; outbox | AI down resilience testi | NOT_STARTED |
| TRX-010 | P0 | s.7 | AI erişilemezken risk `BELIRSIZ` gösterilmelidir. | Nullable risk + display projection | UI/integration testi | NOT_STARTED |
| TRX-011 | P0 | s.7 | AI erişilemezken karar `INCELEME` olmalıdır. | Safe fallback decision | Resilience testi | NOT_STARTED |
| TRX-012 | P0 | s.7 | AI erişilemezken işlem manuel inceleme kuyruğuna düşmelidir. | Queue projection/reason | Supervisor dashboard testi | NOT_STARTED |
| TRX-013 | P1 | s.7 | İşlem numarası sistem genelinde benzersiz ve okunabilir olmalıdır. | `TRX-YYYY-NNNNNN`; unique constraint | Concurrency/uniqueness testi | NOT_STARTED |
| TRX-014 | P1 | Tasarım | Tekrarlanan istemci isteği çift işlem oluşturmamalıdır. | `Idempotency-Key` + response persistence | Duplicate POST testi | NOT_STARTED |

## 5.2 Risk Vakası State Machine

| ID | Öncelik | Kaynak | Gereksinim | Uygulama Karşılığı | Doğrulama | Durum |
|---|---:|---|---|---|---|---|
| CASE-001 | P1 | s.7 | Yüksek/inceleme gerektiren işlemler risk vakasına dönüşmelidir. | Assessment decision policy | Boundary testleri | NOT_STARTED |
| CASE-002 | P1 | s.7 | `YENI → ATANDI` yalnızca sistem/AI önerisi veya süpervizör tarafından yapılmalıdır. | Assignment use case | Role/state test | NOT_STARTED |
| CASE-003 | P1 | s.7 | `YENI → ATANDI` için analist belirlenmiş olmalıdır. | Invariant | Negative test | NOT_STARTED |
| CASE-004 | P1 | s.7 | `ATANDI → INCELENIYOR` yalnızca atanmış analist tarafından yapılmalıdır. | Start review action | Ownership/state test | NOT_STARTED |
| CASE-005 | P1 | s.7 | `INCELENIYOR → MUSTERI_DOGRULAMA` analist tarafından yapılmalıdır. | Verification request action | State/role test | NOT_STARTED |
| CASE-006 | P1 | s.7 | `MUSTERI_DOGRULAMA → INCELENIYOR` müşteri yanıtı sonrası sistem tarafından yapılmalıdır. | Customer response handler | Event/state test | NOT_STARTED |
| CASE-007 | P1 | s.7 | `INCELENIYOR → ONAYLANDI` analist tarafından yapılmalıdır. | Approve decision | State/role test | NOT_STARTED |
| CASE-008 | P1 | s.7 | `INCELENIYOR → BLOKLANDI` analist tarafından yapılmalıdır. | Block decision | State/role test | NOT_STARTED |
| CASE-009 | P1 | s.7 | Blok kararında karar notu zorunludur. | Domain invariant | Empty note 422 testi | NOT_STARTED |
| CASE-010 | P1 | s.7 | `ONAYLANDI → KAPANDI` sistem tarafından 48 saat sonra yapılmalıdır. | Closure background worker | Clock-controlled test | NOT_STARTED |
| CASE-011 | P1 | s.7 | Kural dışı state geçişi 422 dönmelidir. | Domain exception mapping | Full transition matrix test | NOT_STARTED |
| CASE-012 | P1 | Tasarım/ADR | `BLOKLANDI → KAPANDI` kapanış yolu tanımlanmalıdır. | ADR-012; 48 saat sonra sistem geçişi önerisi | Mentor onayı + test | BLOCKED |
| CASE-013 | P1 | Tasarım | Eşzamanlı iki karar yalnızca bir kez uygulanmalıdır. | Optimistic concurrency/version | Parallel request 409 testi | NOT_STARTED |
| CASE-014 | P1 | Tasarım | Her geçiş geçmiş kaydı oluşturmalıdır. | `case_transition_history` | Persistence/audit testi | NOT_STARTED |

## 5.3 Fraud Türleri, Risk ve Karar

| ID | Öncelik | Kaynak | Gereksinim | Uygulama Karşılığı | Doğrulama | Durum |
|---|---:|---|---|---|---|---|
| RISK-001 | P1 | s.7, s.9 | Fraud türü `CALINTI_KART` olabilmelidir. | Enum/model class | Contract/model test | NOT_STARTED |
| RISK-002 | P1 | s.7, s.9 | Fraud türü `HESAP_ELE_GECIRME` olabilmelidir. | Enum/model class | Contract/model test | NOT_STARTED |
| RISK-003 | P1 | s.7, s.9 | Fraud türü `PARA_AKLAMA` olabilmelidir. | Enum/model class | Contract/model test | NOT_STARTED |
| RISK-004 | P1 | s.7, s.9 | Fraud türü `SUPHELI_DAVRANIS` olabilmelidir. | Enum/model class | Contract/model test | NOT_STARTED |
| RISK-005 | P1 | s.7, s.9 | Fraud türü `TEMIZ` olabilmelidir. | Enum/model class | Contract/model test | NOT_STARTED |
| RISK-006 | P1 | s.7 | Fraud türünü başlangıçta AI atamalıdır. | AI assessment result | E2E test | NOT_STARTED |
| RISK-007 | P1 | s.7, s.9 | Analist/süpervizör fraud türünü override edebilmelidir. | Override endpoint | Role/state test | NOT_STARTED |
| RISK-008 | P1 | s.7, s.9 | Override AI Service’e doğruluk takibi için bildirilmelidir. | `case.fraud_type.overridden.v1` | Event/metric test | NOT_STARTED |
| RISK-009 | P1 | s.7 | Risk seviyeleri `DUSUK`, `ORTA`, `YUKSEK`, `KRITIK` olmalıdır. | Enum + mapping policy | Mapping test | NOT_STARTED |
| RISK-010 | P1 | s.7, s.9 | Risk skoru `> 0.9` olduğunda seviye `KRITIK` olmalıdır. | Threshold policy | `0.9000/0.9001` boundary test | NOT_STARTED |
| RISK-011 | P1 | s.7, s.9 | Risk skoru `> 0.9` olduğunda işlem otomatik geçici bloklanmalıdır. | Transaction temporary block flag | Boundary/E2E test | NOT_STARTED |
| RISK-012 | P1 | s.7 | Süpervizör risk seviyesini manuel değiştirebilmelidir. | Override endpoint + audit | Authorization/audit test | NOT_STARTED |

## 5.4 SLA

| ID | Öncelik | Kaynak | Gereksinim | Uygulama Karşılığı | Doğrulama | Durum |
|---|---:|---|---|---|---|---|
| SLA-001 | P1 | s.8 | `KRITIK` vaka SLA süresi 15 dakikadır. | Deadline calculator | Unit test | NOT_STARTED |
| SLA-002 | P1 | s.8 | `YUKSEK` vaka SLA süresi 1 saattir. | Deadline calculator | Unit test | NOT_STARTED |
| SLA-003 | P1 | s.8 | `ORTA` vaka SLA süresi 4 saattir. | Deadline calculator | Unit test | NOT_STARTED |
| SLA-004 | P1 | s.8 | `DUSUK` vaka SLA süresi 24 saattir. | Deadline calculator | Unit test | NOT_STARTED |
| SLA-005 | P1 | s.8 | SLA vaka oluşturulduğu anda başlamalıdır. | `sla_started_at`, `sla_deadline_at` | Clock test | NOT_STARTED |
| SLA-006 | P1 | s.8 | Karar verildiğinde SLA durmalıdır. | `decision_at`; active timer projection | Approve/block test | NOT_STARTED |
| SLA-007 | P1 | s.8 | KRITIK SLA aşımında işlem geçici bloklanmalıdır. | Breach handler | Clock/E2E test | NOT_STARTED |
| SLA-008 | P1 | s.8, s.11 | KRITIK SLA aşmış vaka supervisor panelinde en üstte kırmızı görünmelidir. | Priority query + UI severity | Dashboard UI test | NOT_STARTED |
| SLA-009 | P1 | s.8 | YUKSEK SLA aşımı turuncu işaretlenmelidir. | UI severity | UI test | NOT_STARTED |
| SLA-010 | P2 | s.8 | ORTA SLA aşımı görsel uyarı göstermelidir. | UI warning | UI test | NOT_STARTED |
| SLA-011 | P2 | s.8 | DUSUK SLA aşımı görsel uyarı göstermelidir. | UI warning | UI test | NOT_STARTED |
| SLA-012 | P1 | s.8 | Kalan SLA analist ekranında görünmelidir. | Server deadline + client countdown | UI/E2E test | NOT_STARTED |
| SLA-013 | P1 | s.8 | Kalan SLA süpervizör ekranında görünmelidir. | Dashboard query | UI/E2E test | NOT_STARTED |
| SLA-014 | P1 | s.13 | SLA aşımı event olarak yayınlanmalıdır. | `case.sla.breached.v1` | Event integration test | NOT_STARTED |

## 5.5 Müşteri Doğrulama ve Geri Bildirim

| ID | Öncelik | Kaynak | Gereksinim | Uygulama Karşılığı | Doğrulama | Durum |
|---|---:|---|---|---|---|---|
| VER-001 | P1 | s.8 | Şüpheli işlemde müşteriye uygulama içi doğrulama bildirimi gönderilmelidir. | Notification event + SSE | E2E test | NOT_STARTED |
| VER-002 | P1 | s.8 | Müşteri “Bu işlemi ben yaptım” diyebilmelidir. | Verification response endpoint | Ownership/state test | NOT_STARTED |
| VER-003 | P1 | s.8 | Müşteri “Ben yapmadım” diyebilmelidir. | Verification response endpoint | Ownership/state test | NOT_STARTED |
| VER-004 | P1 | s.8 | Müşteri yanıtı vaka kararına girdi olmalıdır. | Case evidence record | Analyst UI/E2E test | NOT_STARTED |
| VER-005 | P1 | s.8 | “Ben yapmadım” yanıtı risk skorunu yükseltmelidir. | Policy: `max(existing, 0.91)` — ADR ile sabitlenecek | Unit/E2E test | BLOCKED |
| VER-006 | P1 | s.8 | “Ben yapmadım” yanıtı işlemi blok kararına yaklaştırmalıdır. | Temporary block + analyst evidence | E2E test | NOT_STARTED |
| FDB-001 | P1 | s.8 | Müşteri yalnızca `KAPANDI` vakaya 1–5 yıldız verebilmelidir. | Feedback endpoint/state policy | Boundary/state test | NOT_STARTED |
| FDB-002 | P1 | s.8 | Puanlama tek seferlik olmalıdır. | Unique case/customer constraint | Duplicate feedback 409 testi | NOT_STARTED |
| FDB-003 | P1 | s.8 | Geri bildirim verildiğinde Gamification event’i yayınlanmalıdır. | `customer.feedback.submitted.v1` | Event test | NOT_STARTED |

---

# 6. AI Service Gereksinimleri

## 6.1 Risk Skorlama ve Karar

| ID | Öncelik | Kaynak | Gereksinim | Uygulama Karşılığı | Doğrulama | Durum |
|---|---:|---|---|---|---|---|
| AI-001 | P1 | s.9 | AI girdisi tutar içermelidir. | Feature schema | Contract test | NOT_STARTED |
| AI-002 | P1 | s.9 | AI girdisi işlem tipi içermelidir. | Feature schema | Contract test | NOT_STARTED |
| AI-003 | P1 | s.9 | AI girdisi konum içermelidir. | Feature schema | Contract test | NOT_STARTED |
| AI-004 | P1 | s.9 | AI girdisi cihaz içermelidir. | Feature schema | Contract test | NOT_STARTED |
| AI-005 | P1 | s.9 | AI girdisi zaman içermelidir. | Feature schema | Contract test | NOT_STARTED |
| AI-006 | P1 | s.9 | AI girdisi geçmiş işlem sıklığı içermelidir. | Velocity features | Feature test | NOT_STARTED |
| AI-007 | P1 | s.9 | AI çıktısı 0.0–1.0 risk skoru içermelidir. | Calibrated probability | Range/model test | NOT_STARTED |
| AI-008 | P1 | s.9 | Risk `< 0.4` ise karar `ONAY` olmalıdır. | Threshold policy | Boundary test | NOT_STARTED |
| AI-009 | P1 | s.9 | Risk `0.4–0.9` aralığında ise karar `INCELEME` olmalıdır. | Inclusive policy | 0.4 ve 0.9 testleri | NOT_STARTED |
| AI-010 | P1 | s.9 | Risk `> 0.9` ise karar `BLOK` olmalıdır. | Threshold policy | 0.9001 test | NOT_STARTED |
| AI-011 | P0 | s.17 | AI sabit/mock çıktı üretmemelidir. | Eğitilmiş model + değişken feature sonuçları | Model variability/inference tests | NOT_STARTED |
| AI-012 | P3 | s.9, s.16 | Kendi veri seti ve eğitilmiş model kullanılmalıdır. | Sentetik dataset ve training pipeline | Repo artefact review | NOT_STARTED |
| AI-013 | P3 | s.9 | Eğitim verisi repository’de paylaşılmalıdır. | `ai/data` veya üretim script’i | Repo checklist | NOT_STARTED |
| AI-014 | P3 | s.9, s.17 | Eğitim süreci README/AI dokümanında anlatılmalıdır. | `10-AI-SERVICE-DESIGN.md` + service README | Documentation review | NOT_STARTED |
| AI-015 | P2 | s.9 | En az 100 gerçekçi Türkçe örnek önerisi karşılanmalı/aşılmalıdır. | Hedef 10.000 sentetik kayıt | Dataset stats test | NOT_STARTED |
| AI-016 | P2 | Tasarım | Tahmin model sürümüyle izlenebilmelidir. | `model_version`, feature snapshot | Prediction persistence test | NOT_STARTED |
| AI-017 | P2 | Tasarım | Risk nedeni/operasyonel açıklama gösterilmelidir. | Reason code layer | UI/E2E test | NOT_STARTED |

## 6.2 Fraud Türü Sınıflandırma

| ID | Öncelik | Kaynak | Gereksinim | Uygulama Karşılığı | Doğrulama | Durum |
|---|---:|---|---|---|---|---|
| AI-018 | P1 | s.9 | AI beş fraud sınıfından birini üretmelidir. | Multiclass classifier | Class coverage test | NOT_STARTED |
| AI-019 | P1 | s.9 | Fraud türü analist ekranında görünmelidir. | Case detail projection | UI/E2E test | NOT_STARTED |
| AI-020 | P2 | s.9 | Fraud türü analistin inceleme yönünü desteklemelidir. | Reason/evidence panel | UX review | NOT_STARTED |

## 6.3 Akıllı Analist Ataması

| ID | Öncelik | Kaynak | Gereksinim | Uygulama Karşılığı | Doğrulama | Durum |
|---|---:|---|---|---|---|---|
| ASN-001 | P1 | s.9 | Risk vakası uygun analiste otomatik atanmalıdır. | Candidate ranking + Transaction commit | E2E test | NOT_STARTED |
| ASN-002 | P1 | s.9 | Atama skorlama algoritmasına dayanmalıdır. | Deterministic formula | Unit test | NOT_STARTED |
| ASN-003 | P1 | s.9 | Uzmanlık eşleşmesi skora dahil edilmelidir. | Weight `0.50` | Unit test | NOT_STARTED |
| ASN-004 | P1 | s.9 | Boşluk/kapasite oranı skora dahil edilmelidir. | Weight `0.30` | Unit test | NOT_STARTED |
| ASN-005 | P1 | s.9 | Performans skora dahil edilmelidir. | Weight `0.20` | Unit test | NOT_STARTED |
| ASN-006 | P1 | s.9 | Analist kapasitesi 10 aktif vakadır. | Capacity invariant | Boundary/concurrency test | NOT_STARTED |
| ASN-007 | P1 | s.9 | En yüksek skorlu uygun analist seçilmelidir. | Ordered candidates | Deterministic ranking test | NOT_STARTED |
| ASN-008 | P1 | s.9 | Kapasite yoksa vaka kuyruğa alınmalıdır. | `assignment_status=QUEUED` | E2E test | NOT_STARTED |
| ASN-009 | P1 | s.9 | Süpervizör manuel atama yapabilmelidir. | Supervisor endpoint | Authorization test | NOT_STARTED |
| ASN-010 | P1 | Tasarım | AI yalnızca önerir; atamayı Transaction Service atomik kesinleştirir. | Capacity recheck + concurrency token | Parallel assignment test | NOT_STARTED |
| ASN-011 | P2 | Tasarım | Eşit skorlar deterministic tie-break ile çözülmelidir. | Active count, performance, last assigned, ID | Unit test | NOT_STARTED |

## 6.4 Doğruluk Takibi

| ID | Öncelik | Kaynak | Gereksinim | Uygulama Karşılığı | Doğrulama | Durum |
|---|---:|---|---|---|---|---|
| AIM-001 | P1 | s.9 | Analist/süpervizör türü değiştirirse yanlış sınıflandırma kaydedilmelidir. | Override feedback record | E2E/metric test | NOT_STARTED |
| AIM-002 | P1 | s.9, s.11 | Dashboard genel AI doğruluk oranını göstermelidir. | Accuracy query/read model | Dashboard test | NOT_STARTED |
| AIM-003 | P3 | s.9, s.16 | Dashboard kategori bazlı AI doğruluk kırılımı göstermelidir. | Per-class accuracy | Bonus acceptance test | NOT_STARTED |
| AIM-004 | P1 | s.11 | Dashboard risk kararı isabet oranını göstermelidir. | Decision agreement metric | Metric test | NOT_STARTED |
| AIM-005 | P1 | s.11 | Dashboard yanlış pozitif oranını göstermelidir. | False-positive metric | Metric test | NOT_STARTED |
| AIM-006 | P2 | Tasarım | Metric ground-truth tanımları açıkça belgelenmelidir. | AI design doc/ADR | Documentation review | BLOCKED |

---

# 7. Gamification Service Gereksinimleri

## 7.1 Event-Driven Çalışma

| ID | Öncelik | Kaynak | Gereksinim | Uygulama Karşılığı | Doğrulama | Durum |
|---|---:|---|---|---|---|---|
| GAM-001 | P1 | s.10 | Gamification Transaction event’leriyle tetiklenmelidir. | RabbitMQ consumer’ları | E2E event test | NOT_STARTED |
| GAM-002 | P1 | s.10 | Gamification business puanı için doğrudan servis çağrısı kullanılmamalıdır. | `POST /add-points` yok; internal ledger rules | API inventory review | NOT_STARTED |
| GAM-003 | P1 | Tasarım | Duplicate event aynı puanı ikinci kez vermemelidir. | Inbox + unique `source_event_id/rule_code` | Duplicate delivery test | NOT_STARTED |

## 7.2 Puan Kuralları

| ID | Öncelik | Kaynak | Gereksinim | Uygulama Karşılığı | Doğrulama | Durum |
|---|---:|---|---|---|---|---|
| PTS-001 | P1 | s.10 | Her doğru vaka kararı +10 puan vermelidir. | `CASE_DECISION +10` | Rule test | NOT_STARTED |
| PTS-002 | P1 | s.10 | 15 dakikadan kısa karar +5 bonus vermelidir. | `FAST_DECISION +5` | Boundary test | NOT_STARTED |
| PTS-003 | P1 | s.10 | Müşteri teyitli gerçek dolandırıcılık +15 vermelidir. | `CONFIRMED_FRAUD +15` | E2E rule test | NOT_STARTED |
| PTS-004 | P1 | s.10 | KRITIK vaka SLA içinde çözülürse +15 vermelidir. | `CRITICAL_WITHIN_SLA +15` | Clock test | NOT_STARTED |
| PTS-005 | P1 | s.10 | Her SLA aşımı -5 vermelidir. | `SLA_BREACH -5` | Event/rule test | NOT_STARTED |
| PTS-006 | P1 | s.10 | Yanlış blok -8 vermelidir. | `FALSE_POSITIVE -8` | Feedback/ground truth test | NOT_STARTED |
| PTS-007 | P2 | Tasarım | Puan hareketleri immutable ledger olarak saklanmalıdır. | `point_ledger` | Persistence test | NOT_STARTED |

## 7.3 Rozetler

| ID | Öncelik | Kaynak | Gereksinim | Doğrulama | Durum |
|---|---:|---|---|---|---|
| BDG-001 | P1 | s.10 | “İlk Yakalama”: ilk dolandırıcılık vakasını çözünce kazanılmalıdır. | Rule test | NOT_STARTED |
| BDG-002 | P1 | s.10 | “Keskin Göz”: 15 dakikanın altında 10 karar sonrası kazanılmalıdır. | Counter/boundary test | NOT_STARTED |
| BDG-003 | P1 | s.10 | “Sıfır Hata”: 50 vakada yanlış pozitif olmadan kazanılmalıdır. | Aggregate test | NOT_STARTED |
| BDG-004 | P1 | s.10 | “Maratoncu”: bir günde 20 vaka kararı sonrası kazanılmalıdır. | Date-boundary test | NOT_STARTED |
| BDG-005 | P1 | s.10 | “Kriz Yöneticisi”: 10 KRITIK vakayı SLA içinde çözünce kazanılmalıdır. | Aggregate test | NOT_STARTED |
| BDG-006 | P1 | s.10 | “Uzman Avcı”: tek türde 50 dolandırıcılık yakalayınca kazanılmalıdır. | Per-type aggregate test | NOT_STARTED |
| BDG-007 | P1 | s.10 | Rozet kazanıldığı anda toast/modal gösterilmelidir. | `badge.earned` + SSE | UI/E2E test | NOT_STARTED |

## 7.4 Seviye, Liderlik ve Profil

| ID | Öncelik | Kaynak | Gereksinim | Doğrulama | Durum |
|---|---:|---|---|---|---|
| LVL-001 | P1 | s.10 | Bronz seviye 0–499 puandır. | Boundary test | NOT_STARTED |
| LVL-002 | P1 | s.10 | Gümüş seviye 500–1499 puandır. | Boundary test | NOT_STARTED |
| LVL-003 | P1 | s.10 | Altın seviye 1500–2999 puandır. | Boundary test | NOT_STARTED |
| LVL-004 | P1 | s.10 | Platin seviye 3000+ puandır. | Boundary test | NOT_STARTED |
| LDB-001 | P1 | s.10 | Günlük liderlik tablosu ilk 10 kişiyi göstermelidir. | Query/API test | NOT_STARTED |
| LDB-002 | P1 | s.10 | Haftalık liderlik tablosu ilk 10 kişiyi göstermelidir. | Query/API test | NOT_STARTED |
| LDB-003 | P1 | s.10 | Liderlik tablosu gerçek zamanlı veya yenilemede güncel olmalıdır. | SSE veya fresh query | E2E test | NOT_STARTED |
| PRF-001 | P1 | s.10 | Profil toplam puanı göstermelidir. | UI/API test | NOT_STARTED |
| PRF-002 | P1 | s.10 | Profil seviyeyi göstermelidir. | UI/API test | NOT_STARTED |
| PRF-003 | P1 | s.10 | Profil kazanılan rozetleri göstermelidir. | UI/API test | NOT_STARTED |
| PRF-004 | P1 | s.10 | Profil günlük sıralamayı göstermelidir. | UI/API test | NOT_STARTED |
| PRF-005 | P1 | s.10 | Profil haftalık sıralamayı göstermelidir. | UI/API test | NOT_STARTED |
| PRF-006 | P1 | s.10 | Profil çözülen vaka sayısını göstermelidir. | UI/API test | NOT_STARTED |
| PRF-007 | P1 | s.10 | Profil ortalama puanı göstermelidir. | Metric definition + test | NOT_STARTED |

---

# 8. Süpervizör Dashboard Gereksinimleri

| ID | Öncelik | Kaynak | Gereksinim | Veri Sahibi/Projection | Doğrulama | Durum |
|---|---:|---|---|---|---|---|
| DSH-001 | P1 | s.11 | Fraud türü bazlı işlem/vaka dağılımı pasta veya bar grafik olmalıdır. | Transaction/AI dashboard query | UI/API test | NOT_STARTED |
| DSH-002 | P1 | s.11 | Risk seviyesi dağılımı gösterilmelidir. | Transaction query | UI/API test | NOT_STARTED |
| DSH-003 | P1 | s.11 | Risk trendi gösterilmelidir. | Time-series aggregate | UI/API test | NOT_STARTED |
| DSH-004 | P1 | s.11 | SLA uyum oranı gösterilmelidir. | Transaction aggregate | Metric test | NOT_STARTED |
| DSH-005 | P1 | s.11 | SLA aşmış aktif vakalar gösterilmelidir. | Transaction query | UI/API test | NOT_STARTED |
| DSH-006 | P1 | s.11 | AI risk kararı isabet oranı gösterilmelidir. | AI metric | UI/API test | NOT_STARTED |
| DSH-007 | P1 | s.11 | Yanlış pozitif oranı gösterilmelidir. | AI metric | UI/API test | NOT_STARTED |
| DSH-008 | P1 | s.11 | Analist karar sayısı gösterilmelidir. | Gamification/Transaction projection | UI/API test | NOT_STARTED |
| DSH-009 | P1 | s.11 | Analist ortalama karar süresi gösterilmelidir. | Performance projection | Metric test | NOT_STARTED |
| DSH-010 | P1 | s.11 | Analist doğru karar oranı gösterilmelidir. | Performance projection | Metric test | NOT_STARTED |
| DSH-011 | P1 | s.11 | `BELIRSIZ` vakalar bekleyen kuyruğunda gösterilmelidir. | Transaction queue query | AI-down demo | NOT_STARTED |
| DSH-012 | P1 | s.11 | Kapasite bekleyen vakalar kuyrukta gösterilmelidir. | Assignment queue query | Capacity test | NOT_STARTED |
| DSH-013 | P1 | s.11 | Kuyruktan manuel atama yapılabilmelidir. | Assignment endpoint | E2E test | NOT_STARTED |

---

# 9. API Tasarım Gereksinimleri

| ID | Öncelik | Kaynak | Gereksinim | Uygulama Karşılığı | Doğrulama | Durum |
|---|---:|---|---|---|---|---|
| API-001 | P1 | s.12 | API RESTful prensiplere göre tasarlanmalıdır. | Resource/action semantics | API design review | NOT_STARTED |
| API-002 | P1 | s.12 | `/api/v1/auth/**` Identity’ye route edilmelidir. | YARP route | Gateway test | NOT_STARTED |
| API-003 | P1 | s.12 | `/api/v1/transactions/**` Transaction’a route edilmelidir. | YARP route | Gateway test | NOT_STARTED |
| API-004 | P1 | s.12 | `/api/v1/ai/**` AI’a route edilmelidir. | YARP route/policy | Gateway test | NOT_STARTED |
| API-005 | P1 | s.12 | `/api/v1/game/**` Gamification’a route edilmelidir. | YARP route | Gateway test | NOT_STARTED |
| API-006 | P1 | s.12 | İşlem oluşturma endpoint’i bulunmalıdır. | `POST /api/v1/transactions` | OpenAPI/E2E | NOT_STARTED |
| API-007 | P1 | s.12 | Risk skorlama endpoint’i veya eşdeğer iç sözleşme bulunmalıdır. | Internal AI score endpoint + event consumer | Contract test | NOT_STARTED |
| API-008 | P1 | s.12 | Liderlik endpoint’i period parametresini desteklemelidir. | `GET /game/leaderboard?period=daily|weekly` | API test | NOT_STARTED |
| API-009 | P1 | s.12 | Vaka karar endpoint’i bulunmalıdır. | `PATCH /cases/{id}/decision` | API/state test | NOT_STARTED |
| API-010 | P1 | s.12 | Standart response `{success,data,error}` formatı kullanılmalıdır. | Response envelope/problem mapping | Contract test | NOT_STARTED |
| API-011 | P1 | s.12, s.17 | Transaction Service OpenAPI ile dokümante edilmelidir. | Generated OpenAPI | CI schema generation | NOT_STARTED |
| API-012 | P1 | s.12, s.17 | AI Service OpenAPI ile dokümante edilmelidir. | FastAPI OpenAPI | CI schema validation | NOT_STARTED |
| API-013 | P2 | Tasarım | Hatalarda trace/correlation ID bulunmalıdır. | `meta.traceId` | Contract test | NOT_STARTED |
| API-014 | P2 | Tasarım | Liste endpointleri pagination/filter/sort standardı kullanmalıdır. | Query convention | API test | NOT_STARTED |

---

# 10. Event Tasarımı Gereksinimleri

| ID | Öncelik | Kaynak | Gereksinim | Uygulama Karşılığı | Doğrulama | Durum |
|---|---:|---|---|---|---|---|
| EVT-001 | P1 | s.12–13 | Servisler arası olay tasarımı dokümante edilmelidir. | `08-EVENT-DRIVEN-ARCHITECTURE.md`, `contracts/events` | Documentation/contract review | NOT_STARTED |
| EVT-002 | P1 | s.12 | Vaka bloklandığında event yayınlanmalıdır. | `case.decision.made.v1`/blocked outcome | E2E test | NOT_STARTED |
| EVT-003 | P1 | s.12 | Gamification blok/karar event’ini dinlemelidir. | Durable consumer | E2E test | NOT_STARTED |
| EVT-004 | P1 | s.12 | Gamification karar süresini değerlendirmelidir. | Event payload timestamps | Rule test | NOT_STARTED |
| EVT-005 | P1 | s.12 | Gamification puan eklemelidir. | Point ledger | E2E test | NOT_STARTED |
| EVT-006 | P1 | s.12 | Gamification rozet koşullarını kontrol etmelidir. | Badge evaluator | E2E test | NOT_STARTED |
| EVT-007 | P1 | s.12 | Rozet kazanımı frontend’e yansıtılmalıdır. | `badge.earned` → SSE | Demo | NOT_STARTED |
| EVT-008 | P1 | s.12–13 | Event payload’ında event_type bulunmalıdır. | Standard envelope | Schema test | NOT_STARTED |
| EVT-009 | P1 | s.12–13 | Event payload’ında timestamp bulunmalıdır. | UTC `occurredAt` | Schema test | NOT_STARTED |
| EVT-010 | P1 | s.12–13 | Blok event’inde case_id bulunmalıdır. | Payload schema | Contract test | NOT_STARTED |
| EVT-011 | P1 | s.12–13 | Blok event’inde analyst_id bulunmalıdır. | Payload schema | Contract test | NOT_STARTED |
| EVT-012 | P1 | s.12–13 | Blok event’inde fraud_type bulunmalıdır. | Payload schema | Contract test | NOT_STARTED |
| EVT-013 | P1 | s.12–13 | Blok event’inde risk_level bulunmalıdır. | Payload schema | Contract test | NOT_STARTED |
| EVT-014 | P1 | s.12–13 | Blok event’inde amount bulunmalıdır. | Payload schema | Contract test | NOT_STARTED |
| EVT-015 | P1 | s.12–13 | Blok event’inde created_at ve decided_at bulunmalıdır. | Payload schema | Contract test | NOT_STARTED |
| EVT-016 | P1 | s.13 | İşlem oluşturuldu event’i tasarlanmalıdır. | `transaction.created.v1` | Contract/E2E test | NOT_STARTED |
| EVT-017 | P1 | s.13 | Fraud türü değiştirildi event’i tasarlanmalıdır. | `case.fraud_type.overridden.v1` | Contract/E2E test | NOT_STARTED |
| EVT-018 | P1 | s.13 | Müşteri doğruladı event’i tasarlanmalıdır. | `customer.verification.responded.v1` | Contract/E2E test | NOT_STARTED |
| EVT-019 | P1 | s.13 | SLA aşıldı event’i tasarlanmalıdır. | `case.sla.breached.v1` | Contract/E2E test | NOT_STARTED |
| EVT-020 | P1 | Tasarım | Event yayınları transactional outbox kullanmalıdır. | Per-service outbox table/worker | Broker-down test | NOT_STARTED |
| EVT-021 | P1 | Tasarım | Consumer’lar idempotent inbox kullanmalıdır. | Per-consumer inbox/unique key | Duplicate event test | NOT_STARTED |
| EVT-022 | P1 | Tasarım | Retry ve dead-letter policy bulunmalıdır. | Retry queues + DLQ | Poison message test | NOT_STARTED |
| EVT-023 | P2 | Tasarım | Event’ler versioned olmalıdır. | `eventVersion` | Schema compatibility test | NOT_STARTED |
| EVT-024 | P2 | Tasarım | Event’lerde correlation/causation kimlikleri bulunmalıdır. | Standard envelope | Trace test | NOT_STARTED |

---

# 11. Güvenlik Gereksinimleri

| ID | Öncelik | Kaynak | Gereksinim/Saldırı | Savunma | Doğrulama | Durum |
|---|---:|---|---|---|---|---|
| SEC-001 | P1 | s.14 | SQL injection engellenmelidir. | Parametreli EF Core/SQLAlchemy; raw SQL kısıtı | `' OR 1=1 --` security testi | NOT_STARTED |
| SEC-002 | P1 | s.14 | Müşteri token’ıyla supervisor endpoint erişimi engellenmelidir. | Gateway + service policy | 403 + audit testi | NOT_STARTED |
| SEC-003 | P1 | s.14 | IDOR ile başka kullanıcının verisi okunamamalıdır. | Ownership query-level filter | Değiştirilmiş ID testi | NOT_STARTED |
| SEC-004 | P1 | s.14 | Süresi dolmuş JWT reddedilmelidir. | Expiry validation | 401 testi | NOT_STARTED |
| SEC-005 | P1 | s.14 | Manipüle edilmiş JWT reddedilmelidir. | Signature/alg/issuer/audience validation | 401 testi | NOT_STARTED |
| SEC-006 | P1 | s.14 | Revoke edilmiş refresh token reuse tespit edilmelidir. | Token family theft detection | Tüm session revoke testi | NOT_STARTED |
| SEC-007 | P1 | s.14 | XSS girdileri çalıştırılmamalıdır. | Plain text, output escaping, CSP | `<script>` security testi | NOT_STARTED |
| SEC-008 | P1 | s.14 | Brute-force/rate-limit saldırısı engellenmelidir. | Gateway rate limit + account lockout | Rapid request testi | NOT_STARTED |
| SEC-009 | P2 | Tasarım | İç servisler doğrudan internet/host erişimine açılmamalıdır. | Docker internal networks | Port scan/compose review | NOT_STARTED |
| SEC-010 | P2 | Tasarım | Refresh token browser’da HttpOnly cookie olmalıdır. | Secure/SameSite cookie | Browser/security test | NOT_STARTED |
| SEC-011 | P2 | Tasarım | Secret ve private key repository’ye girmemelidir. | `.env`, secret generation, gitignore | Secret scan CI | NOT_STARTED |
| SEC-012 | P2 | Tasarım | Güvenlik header’ları uygulanmalıdır. | CSP, nosniff, frame policy vb. | Header integration test | NOT_STARTED |
| SEC-013 | P2 | Tasarım | Request body ve metin alanlarına boyut sınırı uygulanmalıdır. | Gateway/API limits | Oversized request testi | NOT_STARTED |

---

# 12. Kullanıcı Akışları ve Canlı Demo Gereksinimleri

## 12.1 Müşteri Akışı

| ID | Öncelik | Kaynak | Akış Adımı | Kanıt | Durum |
|---|---:|---|---|---|---|
| UX-CUS-001 | P1 | s.15 | GSM + OTP ile giriş | Canlı demo | NOT_STARTED |
| UX-CUS-002 | P1 | s.15 | Yurt dışı/yüksek riskli işlem oluşturma | Canlı demo | NOT_STARTED |
| UX-CUS-003 | P1 | s.15 | AI risk skoru, türü ve kararını görme | SSE/UI demo | NOT_STARTED |
| UX-CUS-004 | P1 | s.15 | Doğrulama bildirimi alma | SSE/UI demo | NOT_STARTED |
| UX-CUS-005 | P1 | s.15 | “Yaptım/Yapmadım” yanıtı verme | Canlı demo | NOT_STARTED |
| UX-CUS-006 | P1 | s.15 | Vaka sonucunu takip etme | UI demo | NOT_STARTED |
| UX-CUS-007 | P1 | s.15 | Süreç sonrası 1–5 yıldız verme | UI demo | NOT_STARTED |

## 12.2 Analist Akışı

| ID | Öncelik | Kaynak | Akış Adımı | Kanıt | Durum |
|---|---:|---|---|---|---|
| UX-ANA-001 | P1 | s.15 | Personel girişi | Canlı demo | NOT_STARTED |
| UX-ANA-002 | P1 | s.15 | Atanan vakaları risk sıralı görme | UI/API demo | NOT_STARTED |
| UX-ANA-003 | P1 | s.15 | AI skoru ve fraud türünü görme | UI demo | NOT_STARTED |
| UX-ANA-004 | P1 | s.15 | Müşteri doğrulamasını görme | UI demo | NOT_STARTED |
| UX-ANA-005 | P1 | s.15 | Onay/blok kararı ve not verme | UI/state demo | NOT_STARTED |
| UX-ANA-006 | P1 | s.15 | Puan ve rozet kazanma | SSE/leaderboard demo | NOT_STARTED |

## 12.3 Zorunlu Demo

| ID | Öncelik | Kaynak | Zorunlu Adım | Hazırlık/Kanıt | Durum |
|---|---:|---|---|---|---|
| DEMO-001 | P0 | s.15 | `docker compose up` ile sistemi ayağa kaldırma | Temiz ortam script’i | NOT_STARTED |
| DEMO-002 | P0 | s.15 | Gece, yurt dışı, yüksek tutarlı işlem oluşturma | Hazır demo preset | NOT_STARTED |
| DEMO-003 | P0 | s.15 | AI risk skoru + fraud türü + kararı gösterme | Deterministic seed/model | NOT_STARTED |
| DEMO-004 | P0 | s.15 | Doğru uzmanlıktaki analiste atamayı gösterme | Seed analyst profiles | NOT_STARTED |
| DEMO-005 | P0 | s.15 | Analistin vakayı inceleyip bloklaması | Demo script | NOT_STARTED |
| DEMO-006 | P0 | s.15 | Puanın leaderboard’a yansımasını gösterme | SSE/fresh query | NOT_STARTED |
| DEMO-007 | P0 | s.15 | Bir servisi durdurup geri kalanın çalışmasını kanıtlama | `docker compose stop ai-service` | NOT_STARTED |
| DEMO-008 | P0 | s.15 | Jürinin güvenlik testlerine hazır olma | Security scripts/checklist | NOT_STARTED |
| DEMO-009 | P0 | s.15 | Servis geri geldiğinde pending işin toparlandığını gösterme | AI restart/recovery | NOT_STARTED |

---

# 13. Değerlendirme ve Bonus İzlenebilirliği

## 13.1 Ana Puanlar

| ID | Ağırlık | Kaynak | Hedeflenen Kanıt | Durum |
|---|---:|---|---|---|
| SCORE-ARCH | 25 | s.16 | Bağımsız servisler, ayrı DB, event tasarımı, gateway, clean code, commit history | NOT_STARTED |
| SCORE-FUNC | 25 | s.16 | Dört servisin zorunlu fonksiyonları, AI üç görevi, state machine, gamification, edge case | NOT_STARTED |
| SCORE-SEC | 15 | s.16 | Security testleri, rotation, RBAC/ownership, audit, rate limit | NOT_STARTED |
| SCORE-UI | 10 | s.16 | Tutarlı responsive UI; loading/error/empty state | NOT_STARTED |
| SCORE-TESTDOC | 10 | s.16 | Unit/integration, Swagger, README, EVENTS, AI dokümanı | NOT_STARTED |
| SCORE-DEMO | 15 | s.16 | Eksiksiz canlı demo, servis kapatma, karar savunması | NOT_STARTED |

## 13.2 Bonuslar

| ID | Puan | Kaynak | Gereksinim | Kanıt | Durum |
|---|---:|---|---|---|---|
| BONUS-ML | +8 | s.16 | Kendi eğitilmiş ML modeli, veri ve süreç dokümantasyonu | Dataset, scripts, metrics, model artefact | NOT_STARTED |
| BONUS-MQ | +5 | s.16 | Message queue ile event iletimi | RabbitMQ + outbox/inbox | NOT_STARTED |
| BONUS-AI-METRIC | +3 | s.16 | Kategori bazlı AI doğruluk | Dashboard + tests | NOT_STARTED |
| BONUS-REALTIME | +2 | s.16 | Gerçek zamanlı bildirim | SSE demo | NOT_STARTED |
| BONUS-CICD | +2 | s.16 | CI/CD pipeline | GitHub Actions | NOT_STARTED |

**Hedef bonus:** `+20 / +20`

---

# 14. Kurallar ve Diskalifiye Riskleri

| ID | Öncelik | Kaynak | Kural/Risk | Koruma | Durum |
|---|---:|---|---|---|---|
| RULE-001 | P0 | s.17 | Takım 3 kişidir ve değiştirilemez. | Organizasyonel kontrol | NOT_STARTED |
| RULE-002 | P0 | s.17 | Önceden yazılmış iş mantığıyla başlanamaz. | Commit başlangıç tarihi ve anlamlı geçmiş | NOT_STARTED |
| DQ-001 | P0 | s.17 | Monolith değerlendirme dışıdır. | Dört bağımsız servis/container | NOT_STARTED |
| DQ-002 | P0 | s.17 | `docker compose up` çalışmazsa değerlendirme dışıdır. | Clean-machine CI/smoke test | NOT_STARTED |
| DQ-003 | P0 | s.17 | AI mock/hardcoded ise değerlendirme dışıdır. | Gerçek eğitim/inference pipeline | NOT_STARTED |
| DQ-004 | P0 | s.17 | Servisler ortak DB paylaşıyorsa değerlendirme dışıdır. | Dört ayrı DB container/network | NOT_STARTED |
| DQ-005 | P0 | s.17 | Proje build edilemiyorsa değerlendirme dışıdır. | CI build/test; pinned dependencies | NOT_STARTED |

---

# 15. Teslimat Gereksinimleri

## 15.1 Kod

| ID | Öncelik | Kaynak | Teslimat | Kanıt | Durum |
|---|---:|---|---|---|---|
| DEL-001 | P1 | s.17 | GitHub/GitLab repository sunulmalıdır. | Repo erişimi | NOT_STARTED |
| DEL-002 | P1 | s.17 | Monorepo veya servis bazlı repo kabul edilir; monorepo seçilmiştir. | Repo structure | NOT_STARTED |
| DEL-003 | P1 | s.17 | Ana branch çalışır durumda olmalıdır. | Branch protection + CI | NOT_STARTED |
| DEL-004 | P2 | s.16–17 | Commit geçmişi anlamlı olmalıdır. | Conventional/feature commits | NOT_STARTED |
| DEL-005 | P0 | s.17 | Kök dizinde compose dosyası bulunmalıdır. | `compose.yml` | NOT_STARTED |
| DEL-006 | P1 | s.17 | Compose tüm servis, DB ve gateway’i içermelidir. | Compose config validation | NOT_STARTED |
| DEL-007 | P1 | s.17 | Servis başına `.env.example` bulunmalıdır. | Repo checklist | NOT_STARTED |

## 15.2 Dokümantasyon

| ID | Öncelik | Kaynak | Teslimat | Karşılık | Durum |
|---|---:|---|---|---|---|
| DOC-001 | P1 | s.17 | Ana README sistem genel bakışını içermelidir. | Root `README.md` | NOT_STARTED |
| DOC-002 | P1 | s.17 | Ana README mimari diyagram içermelidir. | Mermaid/PNG diagram | NOT_STARTED |
| DOC-003 | P1 | s.17 | Ana README `docker compose up` kurulumunu anlatmalıdır. | Runbook | NOT_STARTED |
| DOC-004 | P1 | s.17 | Ana README seed sürecini anlatmalıdır. | Seed command | NOT_STARTED |
| DOC-005 | P1 | s.17 | Ana README demo kullanıcılarını içermelidir. | Demo credentials section | NOT_STARTED |
| DOC-006 | P1 | s.17 | Her servis README’si sorumluluğu açıklamalıdır. | Service READMEs | NOT_STARTED |
| DOC-007 | P1 | s.17 | Her servis README’si endpoint listesini içermelidir. | Service READMEs/OpenAPI link | NOT_STARTED |
| DOC-008 | P1 | s.17 | Her servis README’si environment değişkenlerini açıklamalıdır. | Service READMEs | NOT_STARTED |
| DOC-009 | P1 | s.13, s.17 | Tüm event’ler ve payload’lar dokümante edilmelidir. | `08-EVENT...` + schemas | NOT_STARTED |
| DOC-010 | P1 | s.17 | AI yaklaşımı ve seçilme nedeni açıklanmalıdır. | `10-AI-SERVICE-DESIGN.md` | NOT_STARTED |
| DOC-011 | P1 | s.17 | Model eğitimi/verisi/süreci açıklanmalıdır. | AI docs + scripts | NOT_STARTED |
| DOC-012 | P1 | s.17 | Transaction ve AI OpenAPI sunulmalıdır. | Generated specs | NOT_STARTED |

## 15.3 Sunum

| ID | Öncelik | Kaynak | Sunum Kuralı | Hazırlık | Durum |
|---|---:|---|---|---|---|
| PRES-001 | P0 | s.17 | Sunum maksimum 15 dakika olmalıdır. | Rehearsal timer | NOT_STARTED |
| PRES-002 | P0 | s.17 | Canlı demo 6–7 dakika olmalıdır. | Script ve prova | NOT_STARTED |
| PRES-003 | P1 | s.17 | Mimari anlatımı yaklaşık 4 dakika olmalıdır. | 4 dakikalık narrative | NOT_STARTED |
| PRES-004 | P1 | s.17 | Zorluklar ve çözümler yaklaşık 2 dakika olmalıdır. | Prepared section | NOT_STARTED |
| PRES-005 | P1 | s.17 | Soru-cevap ve güvenlik testine zaman bırakılmalıdır. | Time buffer | NOT_STARTED |

---

# 16. Açık Kararlar ve Belirsizlikler

Aşağıdaki maddeler case dokümanında tam tanımlanmamıştır. Sessiz varsayım yapılmayacak; ADR veya mentor cevabıyla kapatılacaktır.

| OPEN ID | Konu | Case’teki Belirsizlik | Önerilen Karar | Kapanış Yöntemi | Durum |
|---|---|---|---|---|---|
| OPEN-001 | Bloklanan vakanın kapanması | Yalnızca `ONAYLANDI → KAPANDI` yazılmıştır. | `BLOKLANDI → KAPANDI`, sistem, 48 saat | ADR-012 + mentor doğrulaması | OPEN |
| OPEN-002 | “Yüksek riskli” vaka eşiği | Vaka oluşturma cümlesi eşik belirtmez. | `INCELEME` ve `BLOK` kararları vaka üretir; `ONAY` üretmez | ADR | OPEN |
| OPEN-003 | “Ben yapmadım” risk artışı | Ne kadar artacağı belirtilmez. | `max(current, 0.91)` + geçici blok; final kararı analist | ADR + mentor | OPEN |
| OPEN-004 | AI doğruluk ground truth | “Doğru/toplam” denir ancak doğruluk kaynağı detaylandırılmaz. | Type override accuracy, decision agreement ve false-positive ayrı metrikler | AI metric ADR | OPEN |
| OPEN-005 | “Doğru karar” puanı | Hangi doğrulamayla doğru sayıldığı net değildir. | Final ground truth/müşteri teyidi sonrası puan kesinleşir veya provisional ledger | Gamification ADR | OPEN |
| OPEN-006 | Audit log merkezi | Audit Identity sorumluluğunda; olaylar diğer servislerde oluşur. | `audit.entry.requested` eventiyle Identity append-only kayıt | Event/Audit ADR | OPEN |
| OPEN-007 | Personel rol adları | Analist/uzman/operatör/sorumlu terimleri birlikte geçer. | Domain’de ana rol `ANALYST`; uzmanlık ayrı alan | Identity ADR/mentor | OPEN |
| OPEN-008 | Risk seviye eşikleri | Yalnızca `>0.9 KRITIK` kesin; diğer seviye aralıkları verilmez. | Eşikler ayrıca tanımlanacak ve test edilecek | Risk ADR | OPEN |
| OPEN-009 | SLA aşımı sonrası aktif durum | Görsel/puan/blok etkisi var; state değişimi belirtilmez. | Vaka state’i korunur, `sla_breached_at` işaretlenir | Domain ADR | OPEN |
| OPEN-010 | İşlem silme | Audit şartı var, fonksiyonel silme endpoint’i yok. | İşlem silme endpoint’i sunmamak; gerekiyorsa soft delete admin-only | Security/Domain ADR | OPEN |

---

# 17. Faz Bazlı Çıkış Kriterleri

## Faz 1 — Mimari Freeze

Aşağıdakiler tamamlanmadan scaffold dışı iş mantığı başlanmaz:

- `00-START-HERE.md`
- Bu izlenebilirlik matrisi
- `02-ARCHITECTURE-OVERVIEW.md`
- `03-TECH-STACK.md`
- `04-SERVICE-BOUNDARIES.md`
- Açık kararlar için ADR taslakları

**Çıkış kriteri:** Tüm P0/P1 gereksinimlerinin sahibi ve doğrulama yöntemi tanımlı.

## Faz 2 — İlk Vertical Slice

Akış:

```text
Customer login
→ transaction create
→ transaction.created
→ AI assessment
→ case create/assign
→ analyst decision
→ gamification points
→ leaderboard
```

**Çıkış kriteri:** Compose üzerinde tek uçtan uca happy-path integration testi geçer.

## Faz 3 — Güvenlik ve Dayanıklılık

**Çıkış kriteri:**

- SQLi, IDOR, JWT manipulation, refresh reuse, XSS ve brute-force testleri geçer.
- AI, RabbitMQ ve Gamification kapatma testleri geçer.
- Event kaybı ve duplicate puan oluşmaz.

## Faz 4 — Demo Freeze

**Çıkış kriteri:**

- Temiz makinede `docker compose up`
- Seed ve demo reset script’i
- 7 dakikanın altında zorunlu demo
- Servis kapatma + recovery
- Güvenlik script’leri
- Tüm P0 maddeleri `DEMO_READY`

---

# 18. Güncelleme Prosedürü

Bir gereksinim değiştiğinde:

1. Bu dosyadaki ilgili satır güncellenir.
2. Mimari karar değişiyorsa yeni ADR yazılır; eski ADR `Superseded` yapılır.
3. API/event contract değişiyorsa sürüm ve consumer etkisi kaydedilir.
4. Test güncellenmeden gereksinim `VERIFIED` olamaz.
5. Demo akışını etkiliyorsa `15-DEMO-AND-JURY-DEFENSE.md` güncellenir.

---

# 19. Baseline Kontrol Özeti

| Kategori | Hedef |
|---|---:|
| Diskalifiye riski taşıyan P0 gereksinimler | %100 verified |
| Zorunlu P1 gereksinimler | %100 verified |
| P2 kalite gereksinimleri | En az %95 verified |
| Bonus | +20 / +20 |
| Zorunlu demo adımları | 9 / 9 demo ready |
| Açık mimari karar | Demo freeze öncesi 0 |
| Kritik güvenlik testi | Tamamı otomatik + manuel doğrulanmış |

---

## Son İlke

> Case dokümanında bulunan hiçbir madde “aklımızda” tutulmayacaktır. Her madde bu matriste bir kimliğe, sahibine, uygulama karşılığına ve kanıta sahip olacaktır.
