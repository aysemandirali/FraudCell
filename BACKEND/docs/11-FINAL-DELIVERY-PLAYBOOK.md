Kalan **6 büyük mimari dokümanı tek dosyada birleştiriyoruz**. Ayrı `12–16` dosyaları oluşturulmayacak.

Case’in zorunlu tuttuğu `README.md`, `EVENTS.md`, servis README’leri ve OpenAPI çıktıları ise teslimat formatı nedeniyle daha sonra ayrı ve kısa dosyalar olarak kalmak zorunda.

## Dosya adı

```text
11-FINAL-DELIVERY-PLAYBOOK.md
```

## Kaydedileceği yer

```text
FraudCell/docs/11-FINAL-DELIVERY-PLAYBOOK.md
```

## Bu dosyanın yerine geçtiği dokümanlar

```text
11-GAMIFICATION-DESIGN.md
12-RESILIENCE-AND-OBSERVABILITY.md
13-DOCKER-COMPOSE-AND-OPERATIONS.md
14-TEST-STRATEGY.md
15-DEMO-AND-JURY-DEFENSE.md
16-IMPLEMENTATION-ROADMAP-AND-DOD.md
```

## Dosya içeriği

````markdown
# FraudCell — Final Delivery Playbook

**Doküman:** `11-FINAL-DELIVERY-PLAYBOOK.md`
**Durum:** Accepted — Final Delivery Baseline v1.0
**Sistem:** FraudCell — Gerçek Zamanlı Dolandırıcılık Tespit Platformu
**Son güncelleme:** YYYY-MM-DD
**Bilgi sınıfı:** Internal Architecture

**Bu dokümanın yerine geçtiği belgeler:**

- `11-GAMIFICATION-DESIGN.md`
- `12-RESILIENCE-AND-OBSERVABILITY.md`
- `13-DOCKER-COMPOSE-AND-OPERATIONS.md`
- `14-TEST-STRATEGY.md`
- `15-DEMO-AND-JURY-DEFENSE.md`
- `16-IMPLEMENTATION-ROADMAP-AND-DOD.md`

**İlgili dokümanlar:**

- `00-START-HERE.md`
- `01-REQUIREMENTS-TRACEABILITY.md`
- `02-ARCHITECTURE-OVERVIEW.md`
- `03-TECH-STACK.md`
- `04-SERVICE-BOUNDARIES.md`
- `05-DOMAIN-AND-STATE-MACHINE.md`
- `06-DATA-ARCHITECTURE.md`
- `07-API-DESIGN.md`
- `08-EVENT-DRIVEN-ARCHITECTURE.md`
- `09-IDENTITY-SECURITY-AND-AUDIT.md`
- `10-AI-SERVICE-DESIGN.md`

---

# 1. Dokümanın Amacı

Bu doküman FraudCell sisteminin uygulamaya ve yarışma teslimatına dönük son kararlarını tek yerde toplar.

Kapsam:

1. Gamification tasarımı
2. Puan, badge, level ve leaderboard kuralları
3. Analyst performans hesapları
4. Servis arızalarında sistem davranışı
5. Health check ve observability
6. Docker Compose topolojisi
7. Local çalıştırma ve operasyon
8. Test stratejisi
9. CI/CD kalite kapıları
10. Canlı demo akışı
11. Jüri savunması
12. Uygulama yol haritası
13. Definition of Done
14. Final teslimat kontrol listesi

Bu dosya kalan mimari kararların ana otoritesidir.

---

# 2. Konsolidasyon Kararı

Ana mimari doküman sayısını gereksiz yere artırmamak için kalan altı konu bu dosyada birleştirilmiştir.

Aşağıdaki dosyalar oluşturulmayacaktır:

```text
12-RESILIENCE-AND-OBSERVABILITY.md
13-DOCKER-COMPOSE-AND-OPERATIONS.md
14-TEST-STRATEGY.md
15-DEMO-AND-JURY-DEFENSE.md
16-IMPLEMENTATION-ROADMAP-AND-DOD.md
```

Önceki dokümanlarda bu dosyalara verilen referanslar aşağıdaki dosyaya yönlendirilmiş kabul edilir:

```text
11-FINAL-DELIVERY-PLAYBOOK.md
```

---

# 3. Gamification Service’in Rolü

Gamification Service aşağıdaki alanların sahibidir:

- Immutable puan hareketleri
- Puan kuralları
- Rozetler
- Seviyeler
- Günlük leaderboard
- Haftalık leaderboard
- Analyst performans özetleri
- Fraud-type bazlı performans
- Gamification bildirimleri
- AI Service’e gönderilen analyst performance projection’ı

Gamification Service aşağıdaki işlemlerin sahibi değildir:

- Case state değiştirmek
- Case kararı vermek
- Analyst assignment yapmak
- SLA hesaplamak
- AI tahmini değiştirmek
- Identity rolü değiştirmek
- Transaction Database’e bağlanmak

Gamification yalnızca gerçekleşmiş business event’lerini tüketir.

---

# 4. Gamification Event Kaynakları

Gamification Service ağırlıklı olarak aşağıdaki event’leri tüketir:

```text
case.decision.made.v1
case.sla.breached.v1
case.closed.v1
customer.verification.responded.v1
customer.feedback.submitted.v1
identity.staff.created.v1
identity.staff.profile.updated.v1
identity.staff.deactivated.v1
```

Puanlar HTTP endpoint’i üzerinden eklenmeyecektir.

Aşağıdaki endpoint kesinlikle bulunmaz:

```text
POST /api/v1/game/add-points
```

Puanın tek kaynağı versioned business event’leridir.

---

# 5. Puan Kuralları

Canonical puan kuralları:

| Kural                  |  Puan | Tetikleyici                                     |
| ---------------------- | ----: | ----------------------------------------------- |
| Final vaka kararı      | `+10` | Analyst final karar verdi                       |
| Hızlı karar            |  `+5` | Karar 15 dakikadan kısa sürede verildi          |
| Doğrulanmış fraud      | `+15` | Final karar `BLOCK` ve fraud türü `TEMIZ` değil |
| Kritik vaka SLA içinde | `+15` | `KRITIK` vaka SLA aşılmadan çözüldü             |
| SLA ihlali             |  `-5` | Atanmış vaka SLA’yı aştı                        |
| False positive         |  `-8` | AI `BLOK` önerdi, final karar `APPROVE` oldu    |

Bir vaka birden fazla pozitif kuralı aynı anda sağlayabilir.

Örnek:

```text
Final karar                 +10
15 dakikadan hızlı karar     +5
Doğrulanmış fraud           +15
Kritik vaka SLA içinde      +15
--------------------------------
Toplam                      +45
```

---

# 6. Puan Kurallarının Kesin Tanımları

## 6.1 Final Karar Puanı

Koşul:

```text
decision IN (APPROVE, BLOCK)
```

Puan:

```text
+10
```

Her case için yalnızca bir kez uygulanır.

## 6.2 Hızlı Karar Bonusu

Koşul:

```text
decidedAt - caseCreatedAt < 15 dakika
```

Puan:

```text
+5
```

Tam 15 dakika bonus kapsamında değildir.

```text
14:59 -> bonus
15:00 -> bonus yok
```

## 6.3 Doğrulanmış Fraud Bonusu

Koşul:

```text
decision = BLOCK
AND effectiveFraudType != TEMIZ
```

Puan:

```text
+15
```

Customer response `NOT_MINE` ise kararın güven seviyesi ayrıca performance kaydına eklenebilir.

## 6.4 Kritik Vaka SLA Bonusu

Koşul:

```text
riskLevel = KRITIK
AND decision IN (APPROVE, BLOCK)
AND slaCompliant = true
```

Puan:

```text
+15
```

## 6.5 SLA İhlal Cezası

Koşul:

```text
case.sla.breached
AND assignedAnalystId IS NOT NULL
```

Puan:

```text
-5
```

Aynı case için yalnızca bir kez uygulanır.

## 6.6 False Positive Cezası

Koşul:

```text
aiDecision = BLOK
AND finalDecision = APPROVE
```

Puan:

```text
-8
```

`INCELEME → APPROVE` false positive cezası değildir.

---

# 7. Immutable Point Ledger

Bütün puan hareketleri:

```text
game.point_ledger
```

tablosuna append-only olarak yazılır.

Her satır:

- Analyst ID
- Source event ID
- Case ID
- Transaction ID
- Rule code
- Puan
- Açıklama
- Business zamanı
- Oluşturma zamanı

taşır.

Unique constraint:

```text
source_event_id + rule_code
```

olacaktır.

Bu constraint sayesinde aynı event tekrar teslim edilse bile aynı puan ikinci kez verilmez.

Ledger satırları:

- Güncellenemez
- Silinemez
- Public API ile oluşturulamaz
- Geriye dönük overwrite edilemez

Yanlış puan düzeltmesi gerekiyorsa ters işaretli yeni ledger satırı oluşturulur.

---

# 8. Puan Idempotency

Aynı `case.decision.made` event’i birden fazla kez gelebilir.

Gamification Service:

1. Inbox kaydı oluşturur.
2. Rule’ları değerlendirir.
3. Her rule için unique ledger kaydı ekler.
4. Summary tablolarını günceller.
5. Badge kurallarını değerlendirir.
6. Outbox event’lerini yazar.
7. Transaction commit eder.
8. Mesajı ACK eder.

Duplicate event:

- Duplicate puan oluşturmaz
- Duplicate badge oluşturmaz
- Leaderboard toplamını iki kez artırmaz
- Analyst decision count’u iki kez artırmaz

---

# 9. Toplam Puan ve Negatif Puan

Point ledger toplamı matematiksel olarak negatif olabilir.

Ancak kullanıcıya gösterilen toplam puan:

```text
max(sum(pointLedger.points), 0)
```

olacaktır.

Bu kararın amacı:

- Yeni analyst’in negatif seviyeye düşmesini önlemek
- Leaderboard gösterimini sade tutmak
- Cezaların etkisini korurken negatif profil puanını engellemek

Ledger’ın gerçek matematiksel toplamı audit ve debug için korunur.

---

# 10. Seviyeler

Canonical seviye eşikleri:

| Seviye   | Toplam Puan |
| -------- | ----------: |
| `BRONZ`  |     `0–249` |
| `GUMUS`  |   `250–749` |
| `ALTIN`  |  `750–1499` |
| `PLATIN` |     `1500+` |

Seviye aşağıdaki kaynaktan hesaplanır:

```text
displayTotalPoints
```

Seviye düşebilir.

Puan cezası sonrasında analyst alt seviyeye inerse:

```text
gamification.level.changed.v1
```

event’i üretilebilir.

Seviye client tarafından yazılamaz.

---

# 11. Rozetler

Baseline badge kataloğu:

| Kod                 | Rozet           | Kural                                       |
| ------------------- | --------------- | ------------------------------------------- |
| `FIRST_CATCH`       | İlk Yakalama    | İlk doğrulanmış fraud kararı                |
| `SHARP_EYE`         | Keskin Göz      | 10 doğrulanmış fraud kararı                 |
| `ZERO_ERROR`        | Sıfır Hata      | Art arda 20 kararda false positive olmaması |
| `MARATHON`          | Maraton         | 50 final karar                              |
| `CRISIS_MANAGER`    | Kriz Yöneticisi | 5 kritik vakayı SLA içinde çözmek           |
| `SPECIALIST_HUNTER` | Uzman Avcı      | Aynı fraud türünde 10 doğrulanmış karar     |

Kurallar:

1. Bir analyst aynı badge’i yalnızca bir kez kazanır.
2. Badge kazanımı append-only kaydedilir.
3. Badge silinmez.
4. Badge event’i duplicate kazanım üretmez.
5. Badge kazanıldığında notification oluşturulur.
6. Badge definition UI metni ile business rule birbirinden ayrılır.
7. Rule version metadata olarak saklanır.

---

# 12. Leaderboard

Desteklenen dönemler:

```text
DAILY
WEEKLY
```

Maksimum sonuç:

```text
Top 10
```

Gün sınırı:

```text
Europe/Istanbul
00:00–24:00
```

Hafta sınırı:

```text
Pazartesi 00:00
Pazartesi 00:00
```

Database event zamanlarını UTC tutar.

Dönem hesapları kullanıcı gösteriminde `Europe/Istanbul` zaman dilimine göre yapılır.

---

# 13. Leaderboard Tie-Break

Analyst’ler aynı puana sahipse sıralama:

1. Daha yüksek toplam puan
2. Daha fazla doğrulanmış fraud
3. Daha yüksek SLA compliance oranı
4. Daha düşük ortalama karar süresi
5. Lexicographic analyst ID

şeklinde belirlenir.

Sıralama deterministic olmalıdır.

Random tie-break kullanılmaz.

---

# 14. Analyst Performance Score

AI assignment algoritmasında kullanılacak performance score:

```text
0.0–1.0
```

aralığında olacaktır.

Canonical formül:

```text
performanceScore =
    accuracyScore       × 0.40
  + slaComplianceScore  × 0.30
  + speedScore          × 0.20
  + experienceScore     × 0.10
```

## Accuracy Score

```text
correctDecisions / totalEvaluatedDecisions
```

## SLA Compliance Score

```text
slaCompliantDecisions / slaEligibleDecisions
```

## Speed Score

Karar süresinin hedef süreye göre normalize edilmiş değeridir.

## Experience Score

```text
min(totalDecisions / 100, 1.0)
```

Yeni analyst için:

```text
performanceScore = 0.50
```

kullanılır.

Minimum örnek sayısı sağlanana kadar neutral değer korunabilir.

---

# 15. Analyst Performance Event’i

Gamification Service aşağıdaki full-snapshot event’i yayınlar:

```text
analyst.performance.updated.v1
```

Payload:

- Analyst ID
- Total decisions
- Correct decisions
- False positives
- SLA compliant count
- Average decision duration
- Accuracy rate
- Performance score
- Subject version
- Updated at

AI Service bu event’i kendi local projection’ına uygular.

---

# 16. Gamification Failure Davranışı

Gamification Service kapalıysa:

- Case kararı başarılı olmaya devam eder.
- `case.decision.made` event’i durable queue’da bekler.
- Analyst kararının transaction sonucu değişmez.
- Puan geçici olarak UI’da görünmeyebilir.
- Servis geri geldiğinde backlog işlenir.
- Ledger doğru business zamanına göre güncellenir.
- Leaderboard yeniden hesaplanır.
- Notification daha sonra gönderilir.

Gamification arızası case kararını rollback etmez.

---

# 17. Resilience İlkeleri

FraudCell aşağıdaki dayanıklılık prensiplerini uygular:

1. Her servis kendi database’ine dayanır.
2. Başka servisin anlık erişilebilirliği business commit için zorunlu değildir.
3. RabbitMQ kapalıyken event outbox’ta korunur.
4. Consumer kapalıyken event durable queue’da korunur.
5. Duplicate event idempotent işlenir.
6. Bir servisin database arızası diğer servislerin readiness durumunu bozmaz.
7. Health check bütün sistemi zincirleme bağımlı hale getirmez.
8. Retry yalnızca transient hatalarda kullanılır.
9. Permanent hata sonsuz retry edilmez.
10. Kullanıcıya eventual-consistency durumu açıkça gösterilir.

---

# 18. Failure Matrix

| Arıza                        | Beklenen Davranış                                                             |
| ---------------------------- | ----------------------------------------------------------------------------- |
| AI Service kapalı            | Transaction kaydedilir, `PENDING`, timeout sonrası `BELIRSIZ` ve manual queue |
| AI Database kapalı           | AI unready olur, mesaj ACK edilmez, Transaction fallback çalışır              |
| Transaction Service kapalı   | Yeni transaction/case API çağrıları kullanılamaz; diğer servisler çalışır     |
| Transaction Database kapalı  | Yalnızca Transaction Service unready olur                                     |
| Identity Service kapalı      | Login ve refresh kullanılamaz; mevcut valid access token’lar çalışabilir      |
| Identity Database kapalı     | Login/refresh reddedilir; diğer servisler çalışır                             |
| Gamification kapalı          | Case kararı başarılı; puan event’i queue’da bekler                            |
| Gamification Database kapalı | Gamification unready; diğer servisler çalışır                                 |
| RabbitMQ kapalı              | Business commit + outbox başarılı; health degraded                            |
| Edge kapalı                  | Public erişim kesilir; iç servis ve queue state’i korunur                     |
| SSE bağlantısı koptu         | Client reconnect eder ve authoritative API state’ini tekrar çeker             |

---

# 19. Timeout Politikası

| İşlem                    |             Timeout |
| ------------------------ | ------------------: |
| Normal API query         |            5 saniye |
| Normal API command       |           10 saniye |
| Dashboard query          |           10 saniye |
| Internal diagnostic HTTP |            5 saniye |
| Database command         |         5–10 saniye |
| AI assessment watchdog   | Demo için 10 saniye |
| Graceful shutdown        |           20 saniye |
| Outbox lock              |           30 saniye |

SSE bağlantısına normal HTTP request timeout uygulanmaz.

---

# 20. Retry Politikası

Retry yalnızca transient hatalarda uygulanır.

Retry yapılabilecek durumlar:

- Database connection reset
- Database deadlock
- RabbitMQ bağlantı hatası
- Geçici timeout
- Startup sırasında dependency hazır olmaması

Retry yapılmayacak durumlar:

- Geçersiz request
- Geçersiz event schema
- Desteklenmeyen event version
- Geçersiz state transition
- Unauthorized erişim
- Risk score range ihlali
- Duplicate event
- Business invariant ihlali

Command endpoint’lerinde kontrolsüz otomatik retry yapılmaz.

Transaction create idempotency key ile güvenli biçimde tekrar gönderilebilir.

---

# 21. Health Check Modeli

Her servis iki health endpoint’ine sahip olacaktır:

```text
/health/live
/health/ready
```

## Liveness

Process’in çalıştığını gösterir.

Liveness:

- Başka servislere bağlanmaz
- RabbitMQ kontrolünü zorunlu yapmaz
- Bütün sistemi taramaz
- Process deadlock veya fatal durumunu gösterir

## Readiness

Servisin kendi temel görevini güvenli biçimde yapıp yapamadığını gösterir.

---

# 22. Servis Bazlı Readiness

## Identity Service

Critical:

- Identity Database
- Signing private key
- Data Protection key erişimi

Degraded:

- RabbitMQ kapalı

## Transaction Service

Critical:

- Transaction Database

Degraded:

- RabbitMQ kapalı
- Identity projection gecikmiş

AI Service’in kapalı olması Transaction readiness’i bozmaz.

## AI Service

Critical:

- AI Database
- Active model artifact
- Model checksum
- Feature schema
- Smoke inference

Degraded:

- RabbitMQ kapalı
- Analyst projection stale

## Gamification Service

Critical:

- Gamification Database

Degraded:

- RabbitMQ kapalı

## Edge

Critical:

- Route configuration
- Static frontend asset’leri

Degraded:

- RabbitMQ notification bağlantısı kapalı

---

# 23. Observability Standardı

FraudCell aşağıdaki üç observability kaynağını kullanır:

```text
Logs
Metrics
Health
```

Tam kapsamlı external tracing sistemi yarışma baseline’ında zorunlu değildir.

Ancak aşağıdaki kimlikler uçtan uca taşınır:

```text
traceId
correlationId
eventId
causationId
transactionId
caseId
userId
```

---

# 24. Structured Logging

Loglar structured JSON veya structured console formatında olacaktır.

Her log mümkün olduğunda:

```text
timestamp
level
service
environment
eventName
traceId
correlationId
userId
transactionId
caseId
eventId
durationMs
result
```

alanlarını taşır.

Loglarda bulunmayacaklar:

- Şifre
- OTP
- Access token
- Refresh token
- Cookie
- Private key
- Database password
- RabbitMQ password
- Tam GSM
- Gereksiz e-posta
- Full event payload
- Full decision note

---

# 25. Temel Metrikler

## API

```text
http_requests_total
http_request_duration_ms
http_errors_total
rate_limit_rejections_total
```

## Database

```text
db_query_duration_ms
db_connection_errors_total
db_pool_active
db_pool_waiting
```

## Outbox

```text
outbox_pending_count
outbox_oldest_pending_seconds
outbox_publish_success_total
outbox_publish_failure_total
```

## Consumer

```text
events_processed_total
events_duplicate_total
events_retried_total
events_dead_lettered_total
event_processing_duration_ms
```

## Business

```text
transactions_created_total
cases_active_total
cases_critical_total
manual_queue_count
sla_breach_total
ai_assessment_duration_ms
gamification_points_awarded_total
```

---

# 26. Operasyon Eşikleri

| Metric                  |  Warning | Critical |
| ----------------------- | -------: | -------: |
| Outbox oldest pending   |  `30 sn` |   `5 dk` |
| AI queue oldest message |   `2 sn` |  `30 sn` |
| Manual queue count      |     `10` |     `50` |
| DLQ message count       |      `1` |     `10` |
| API error rate          |     `%5` |    `%15` |
| Database query P95      | `500 ms` |   `2 sn` |
| SLA breach rate         |     `%5` |    `%15` |

Yarışma demosunda external alerting sistemi zorunlu değildir.

Metric ve log görünürlüğü yeterlidir.

---

# 27. Docker Compose Topolojisi

FraudCell’in uzun süre çalışan container’ları:

```text
1. edge
2. identity-service
3. transaction-service
4. ai-service
5. gamification-service
6. identity-db
7. transaction-db
8. ai-db
9. gamification-db
10. rabbitmq
```

Toplam:

```text
10 long-running container
```

Migration, seed ve topology init container’ları one-shot olarak çalışabilir ve bu sayıya dahil edilmez.

---

# 28. Frontend Dağıtımı

React uygulaması:

1. Vite ile build edilir.
2. Static output Edge image’ına kopyalanır.
3. Edge aynı origin üzerinden frontend’i sunar.
4. API route’larını YARP ile yönlendirir.
5. SSE endpoint’ini aynı origin’den sağlar.

Public port:

```text
8080
```

Kullanıcı:

```text
http://localhost:8080
```

adresinden bütün sisteme erişir.

---

# 29. Docker Network’leri

## Edge Network

```text
fraudcell-edge
```

Üyeler:

- Edge
- Identity Service
- Transaction Service
- AI Service
- Gamification Service

## Application Network

```text
fraudcell-app
```

Üyeler:

- Domain servisleri
- RabbitMQ
- Edge notification consumer

## Data Network’leri

```text
identity-data
transaction-data
ai-data
gamification-data
```

Her database yalnızca kendi servisiyle aynı data network’ünde bulunur.

---

# 30. Host Port Politikası

Default olarak host’a açılacak tek uygulama portu:

```text
8080
```

RabbitMQ Management UI yalnızca debug profile’da:

```text
15672
```

portundan açılabilir.

Database portları default profile’da host’a açılmaz.

İç servis portları host’a açılmaz.

---

# 31. Docker Volume’ları

Persistent volume’lar:

```text
identity-db-data
transaction-db-data
ai-db-data
gamification-db-data
rabbitmq-data
identity-data-protection
edge-data-protection
```

Model artifact read-only mount veya image layer içinde kontrollü build artifact olarak sağlanabilir.

Model artifact user upload volume’u bulunmaz.

---

# 32. Compose Profile’ları

## Default

Normal demo:

```bash
docker compose up -d --build
```

## Debug

RabbitMQ Management UI ve gerekirse database debug portları:

```bash
docker compose --profile debug up -d
```

## Training

AI model eğitimi:

```bash
docker compose --profile training run --rm ai-training
```

## Test

Integration ve smoke test kaynakları:

```bash
docker compose --profile test up
```

Production-benzeri demo default profile ile çalışmalıdır.

---

# 33. Migration Akışı

Her database için one-shot migration işlemi bulunur:

```text
identity-migrate
transaction-migrate
ai-migrate
gamification-migrate
```

Akış:

1. Database healthy olur.
2. Migration command çalışır.
3. Migration başarılı olur.
4. Reference seed uygulanır.
5. Domain service başlar.
6. Service readiness başarılı olur.

Application process’in her başlangıçta otomatik migration yapması yasaktır.

---

# 34. Startup Bağımlılıkları

`depends_on` yalnızca container başlatma sırası olarak kabul edilmez.

Servisler:

- Database hazır olana kadar retry eder.
- RabbitMQ hazır değilse degraded başlar.
- AI Service model warmup tamamlamadan ready olmaz.
- Edge servisler geç açıldığında kontrollü `503` döndürür.
- Startup sonsuz hızlı retry döngüsü oluşturmaz.

Exponential backoff ve maksimum log tekrar sınırı kullanılmalıdır.

---

# 35. Environment ve Secret Yönetimi

Repository’de bulunabilecek dosya:

```text
.env.example
```

Bu dosya gerçek secret içermez.

Gerçek local değer:

```text
.env
```

dosyasında tutulabilir ve `.gitignore` içinde olmalıdır.

Production-benzeri kullanımda:

- Docker secret
- Read-only mounted file
- CI secret

tercih edilir.

Her servise yalnızca ihtiyacı olan credential sağlanır.

---

# 36. Container Güvenliği

Uygulama container’ları:

- Non-root user ile çalışır
- Minimal runtime image kullanır
- Gereksiz build tool içermez
- Privileged mode kullanmaz
- Secret image içine kopyalamaz
- Health check içerir
- Graceful shutdown destekler
- Gerekirse read-only root filesystem kullanır
- Gereksiz Linux capability’lerini kaldırır

---

# 37. Kaynak Sınırları

Demo ortamı için başlangıç limitleri:

| Container      |    CPU |   Memory |
| -------------- | -----: | -------: |
| Edge           | `0.50` | `256 MB` |
| Identity       | `0.50` | `512 MB` |
| Transaction    | `0.75` | `768 MB` |
| AI             | `2.00` |   `2 GB` |
| Gamification   | `0.50` | `512 MB` |
| Her PostgreSQL | `0.50` | `512 MB` |
| RabbitMQ       | `0.75` | `768 MB` |

Bu değerler demo makinesine göre ayarlanabilir.

AI container diğer servislerden daha yüksek kaynak alır.

---

# 38. Temel Operasyon Komutları

Sistemi build edip başlatmak:

```bash
docker compose up -d --build
```

Container durumları:

```bash
docker compose ps
```

Logları izlemek:

```bash
docker compose logs -f
```

Belirli servis logu:

```bash
docker compose logs -f transaction-service
```

AI Service’i durdurmak:

```bash
docker compose stop ai-service
```

AI Service’i başlatmak:

```bash
docker compose start ai-service
```

Gamification Service’i durdurmak:

```bash
docker compose stop gamification-service
```

RabbitMQ’yu durdurmak:

```bash
docker compose stop rabbitmq
```

Sistemi kapatmak:

```bash
docker compose down
```

Verileri de temizlemek:

```bash
docker compose down -v
```

Volume silme komutu yalnızca reset gerektiğinde kullanılmalıdır.

---

# 39. Demo Reset

Repository’de aşağıdaki script’ler bulunmalıdır:

```text
scripts/demo-reset.sh
scripts/demo-reset.ps1
```

Reset akışı:

1. Container’ları durdur
2. Demo volume’larını temizle
3. Image’ları build et
4. Database’leri başlat
5. Migration uygula
6. Reference seed uygula
7. Demo seed uygula
8. Servisleri başlat
9. Health kontrolü yap
10. Smoke test çalıştır
11. Demo kullanıcılarını doğrula

Reset işlemi production profile’da çalışmamalıdır.

---

# 40. Preflight Kontrolü

Canlı demo öncesi:

```text
scripts/preflight.sh
scripts/preflight.ps1
```

çalıştırılmalıdır.

Kontroller:

- Docker çalışıyor mu?
- Gerekli portlar boş mu?
- Bütün image’lar build oluyor mu?
- Bütün container’lar healthy mi?
- Active AI model yüklenmiş mi?
- RabbitMQ queue’ları hazır mı?
- Migration’lar tamam mı?
- Demo kullanıcıları var mı?
- Security test kullanıcıları var mı?
- Transaction create çalışıyor mu?
- SSE bağlantısı kuruluyor mu?
- Leaderboard veri döndürüyor mu?
- DLQ boş mu?

---

# 41. Test Stratejisi

FraudCell aşağıdaki test katmanlarını kullanır:

```text
Unit Tests
Integration Tests
Contract Tests
API Tests
Frontend Tests
End-to-End Tests
Security Tests
Resilience Tests
AI Model Tests
Compose Smoke Tests
```

Amaç yalnızca yüksek coverage değil, kritik mimari iddiaları kanıtlamaktır.

---

# 42. Unit Testler

Unit test kapsamında:

## Identity

- Password policy
- Lockout sınırı
- Token expiry
- Refresh rotation policy
- Refresh reuse policy
- Role policy mapping
- GSM normalization

## Transaction

- Risk threshold boundary’leri
- State machine transition’ları
- SLA hesapları
- Customer response policy
- Temporary block
- Final karar invariants
- Case closure

## AI

- Risk policy
- Safety policy
- Reason code
- Assignment score
- Tie-break
- Feature validation

## Gamification

- Puan kuralları
- Badge kuralları
- Level hesaplama
- Leaderboard tie-break
- Performance score

---

# 43. Integration Testler

Gerçek altyapıya yakın integration testlerde Testcontainers kullanılacaktır.

.NET servisleri:

```text
xUnit
WebApplicationFactory
Testcontainers
```

AI Service:

```text
Pytest
Testcontainers
```

Integration testlerde:

- Gerçek PostgreSQL
- Gerçek RabbitMQ
- Gerçek migration
- Gerçek constraint
- Gerçek serialization

kullanılır.

SQLite veya in-memory database kritik database davranışının yerine geçmez.

---

# 44. Contract Testler

Contract testleri:

- OpenAPI request/response uyumu
- Event JSON Schema uyumu
- Producer serialization
- Consumer deserialization
- Enum compatibility
- Required field kontrolü
- Unknown optional field kontrolü
- Event version kontrolü
- Response envelope kontrolü

dosyalarını doğrular.

Zorunlu OpenAPI:

```text
Transaction Service
AI Service
```

Hedef OpenAPI:

```text
Identity
Transaction
AI
Gamification
```

---

# 45. Frontend Testleri

Frontend test araçları:

```text
Vitest
React Testing Library
Playwright
```

Test edilecek kritik ekranlar:

- Customer login/OTP
- Staff login
- Transaction oluşturma
- Pending AI durumu
- Analyst case listesi
- Case detail
- Customer verification
- Final case kararı
- Leaderboard
- Dashboard
- SSE notification
- Unauthorized route

Frontend testleri backend authorization testlerinin yerine geçmez.

---

# 46. End-to-End Senaryoları

Minimum E2E senaryoları:

1. Customer OTP login
2. Customer transaction oluşturma
3. AI assessment completion
4. RiskCase oluşturma
5. Analyst assignment
6. Analyst review başlatma
7. Customer verification request
8. Customer `NOT_MINE` cevabı
9. Analyst block kararı
10. Gamification puanı
11. Badge kazanımı
12. Leaderboard güncelleme
13. Customer feedback
14. Unauthorized dashboard erişimi
15. IDOR saldırısı

---

# 47. Security Testleri

Minimum security testleri:

```text
SQL injection
RBAC
IDOR
JWT manipulation
Expired JWT
Refresh-token reuse
XSS
Brute force
CSRF
Mass assignment
Internal endpoint access
Missing If-Match
Rate limiting
```

Repository script’i:

```text
scripts/security-test.sh
scripts/security-test.ps1
```

olmalıdır.

---

# 48. Resilience Testleri

Minimum failure testleri:

1. AI Service kapalıyken transaction oluşturma
2. AI geri geldiğinde backlog işleme
3. Gamification kapalıyken case kararı
4. Gamification geri geldiğinde puan işleme
5. RabbitMQ kapalıyken outbox birikmesi
6. RabbitMQ geri geldiğinde publish
7. Identity kapalıyken mevcut JWT ile Transaction erişimi
8. Consumer commit sonrası ACK öncesi crash
9. Publisher confirm sonrası `published_at` öncesi crash
10. Duplicate event
11. Poison message
12. DLQ oluşumu
13. Bir database kapalıyken diğer servislerin çalışması

---

# 49. AI Testleri

AI için:

- Dataset validation
- Dataset reproducibility
- Leakage kontrolü
- Train/validation/test ayrımı
- Model comparison
- Calibration
- Category metrics
- Confusion matrix
- Artifact checksum
- Smoke inference
- Boundary test
- Performance benchmark
- Duplicate prediction
- Model missing failure
- Invalid feature rejection

testleri bulunmalıdır.

Model accuracy değeri kod içine yazılmamalıdır.

Metric eğitim çıktısından okunmalıdır.

---

# 50. Coverage Politikası

Coverage tek kalite ölçüsü değildir.

Başlangıç kalite hedefleri:

```text
Domain/policy modülleri: en az %90 line coverage
Backend genel: en az %70 line coverage
AI policy/assignment kodu: en az %90
```

Buna rağmen aşağıdaki kritik kuralların tamamı açık testlere sahip olmalıdır:

- Risk boundary
- State transition
- Refresh reuse
- Analyst capacity
- Point idempotency
- Case decision concurrency
- Outbox/inbox duplicate davranışı

---

# 51. CI Pipeline

GitHub Actions pipeline sırası:

1. Source checkout
2. Dependency restore
3. Format/lint
4. Secret scan
5. .NET build
6. Python lint/type/test
7. Frontend lint/type/test
8. Unit tests
9. Integration tests
10. Event schema validation
11. OpenAPI validation
12. Migration test
13. Container image build
14. Vulnerability scan
15. Compose smoke test
16. Test report artifact
17. OpenAPI artifact
18. AI metric artifact

Başarısız bir kalite kapısı merge’i engeller.

---

# 52. CI Kalite Kapıları

Pull request aşağıdaki durumda merge edilemez:

- Build başarısız
- Unit test başarısız
- Integration test başarısız
- Event schema geçersiz
- OpenAPI geçersiz
- Migration boş DB’ye uygulanamıyor
- Container image build olmuyor
- Critical secret bulunuyor
- Kabul edilmemiş critical vulnerability var
- AI model smoke test başarısız
- Compose smoke test başarısız

---

# 53. Canlı Demo Hedefi

Canlı demo şu hikâyeyi göstermelidir:

> FraudCell yalnızca fraud skoru üreten bir ekran değildir. İşlemi güvenli biçimde kaydeden, AI ile değerlendiren, vakaya dönüştüren, doğru analiste atayan, insan kararı alan, müşteriyi doğrulayan, puan üreten ve servis arızalarında çalışmaya devam eden bir platformdur.

Demo teknik özellik listesi gibi değil, uçtan uca business akışı gibi sunulmalıdır.

---

# 54. 15 Dakikalık Sunum Akışı

|          Süre | İçerik                     |
| ------------: | -------------------------- |
|   `0:00–1:30` | Problem ve çözüm           |
|   `1:30–4:30` | Mimari ve servis sınırları |
|  `4:30–10:30` | Uçtan uca canlı demo       |
| `10:30–12:30` | Servis arızası ve recovery |
| `12:30–13:30` | Güvenlik testi             |
| `13:30–14:30` | AI modeli ve doğruluk      |
| `14:30–15:00` | Kapanış ve ana mesaj       |

Jüri soru süresi ayrılmışsa ana anlatım 13–14 dakikada bitirilmelidir.

---

# 55. Demo Öncesi Mimari Anlatım

Gösterilecek tek ana mimari diyagram şunları içermelidir:

```text
React + Edge
Identity Service
Transaction Service
AI Service
Gamification Service
4 PostgreSQL
RabbitMQ
Outbox/Inbox
SSE
```

Vurgulanacak kararlar:

- Database per service
- Gateway tek giriş
- Async-first AI
- RabbitMQ
- Transactional outbox
- Idempotent inbox
- AI önerir, Transaction karar verir
- Immutable point ledger
- Bir servis kapalıyken diğerlerinin çalışması

---

# 56. Uçtan Uca Demo Akışı

## Adım 1 — Customer Login

- Customer GSM girer
- Demo OTP `1234`
- Access token alınır
- Refresh cookie oluşturulur

## Adım 2 — Yüksek Riskli Transaction

Örnek:

```text
25.000 TRY
TRANSFER
Yeni cihaz
Yeni alıcı
Berlin / DE
Gece saati
Yüksek transaction velocity
```

Transaction oluşturulur.

İlk response:

```text
assessmentStatus = PENDING
displayRiskLevel = BELIRSIZ
```

## Adım 3 — AI Sonucu

Kısa süre sonra UI güncellenir:

```text
riskScore > 0.90
riskLevel = KRITIK
decision = BLOK
fraudType = CALINTI_KART veya HESAP_ELE_GECIRME
```

Gösterilecekler:

- Model version
- Reason code
- Inference süresi
- Analyst candidate breakdown

## Adım 4 — Case ve Assignment

- RiskCase oluşturulur
- Transaction temporary block olur
- Analyst atanır
- SLA sayacı başlar
- Analyst SSE notification alır

## Adım 5 — Analyst Review

- Analyst case’i açar
- Review başlatır
- Not ekler
- Customer verification ister

## Adım 6 — Customer Response

Customer:

```text
NOT_MINE
```

cevabı verir.

Gösterilecekler:

- Effective risk `KRITIK`
- Temporary block
- Analyst notification
- Case tekrar `INCELENIYOR`

## Adım 7 — Final Block

Analyst blok kararı verir.

Karar notu zorunlu gösterilir.

Gösterilecekler:

- Case `BLOKLANDI`
- Transaction `BLOCKED`
- SLA compliance
- Audit kaydı

## Adım 8 — Gamification

SSE ile:

```text
+45 puan
Yeni badge
Leaderboard güncellemesi
```

gösterilir.

---

# 57. Failure Demo

Minimum bir service-stop senaryosu canlı gösterilmelidir.

Tercih edilen senaryo:

```bash
docker compose stop gamification-service
```

Ardından yeni bir case kararı verilir.

Gösterilecekler:

1. Case kararı başarılı
2. Transaction state güncel
3. Gamification queue’da mesaj bekliyor
4. Leaderboard henüz güncellenmedi

Servis yeniden başlatılır:

```bash
docker compose start gamification-service
```

Gösterilecekler:

1. Queue mesajı tüketilir
2. Puan ledger’a yazılır
3. Leaderboard güncellenir
4. Duplicate puan oluşmaz

Bu senaryo kısa, görünür ve düşük risklidir.

---

# 58. Alternatif AI Failure Demo

Zaman uygunsa:

```bash
docker compose stop ai-service
```

Yeni transaction oluşturulur.

Gösterilecekler:

- Transaction başarıyla kaydedildi
- Assessment `PENDING`
- Sistem çalışıyor
- Event queue’da bekliyor
- Timeout sonrası manual queue
- Risk `BELIRSIZ`

AI geri başlatılır:

```bash
docker compose start ai-service
```

Late assessment’in insan sürecini bozmadığı gösterilir.

---

# 59. Güvenlik Demo Seçimi

Canlı güvenlik testinde en güçlü ve kısa senaryo:

```text
Customer token ile supervisor dashboard çağrısı
```

Beklenen:

```text
403 Forbidden
```

Ardından admin audit ekranında:

```text
ACCESS_DENIED
actor
role
route
IP
timestamp
result
```

gösterilir.

İkinci hızlı test olarak JWT payload role değeri değiştirilip request gönderilebilir.

Beklenen:

```text
401 Unauthorized
```

---

# 60. AI Model Kanıtı

Jüriye aşağıdakiler gösterilir:

1. Sentetik dataset boyutu
2. Fraud sınıf dağılımı
3. Training komutu
4. Karşılaştırılan modeller
5. Champion model
6. Risk PR-AUC
7. Fraud-type Macro F1
8. Kategori bazlı precision/recall/F1
9. Confusion matrix
10. Model version
11. Aynı işlemde feature değişince skorun değişmesi

Gösterilmeyecek yanlış ifade:

```text
Modelimiz yüzde 99 doğru.
```

Doğru ifade:

```text
Sabit test setimizde risk PR-AUC X ve fraud-type Macro F1 Y ölçtük.
```

---

# 61. Jüri Sorularına Temel Cevaplar

## “Neden mikroservis?”

Servislerin farklı veri sahipliği, failure davranışı ve teknoloji ihtiyacı vardır. AI Python çalışırken diğer servisler .NET kullanır. Her servisin kendi database’i vardır ve bağımsız kapanabilir.

## “AI neden senkron değil?”

AI arızasının transaction kaydını engellememesi gerekir. Transaction önce güvenli biçimde kaydedilir; AI event üzerinden değerlendirme yapar.

## “Exactly once sağlıyor musunuz?”

Hayır. At-least-once teslim modelini kabul ediyoruz. Outbox event kaybını, inbox ve unique constraint duplicate business sonucunu engelliyor.

## “AI analyst’i atıyor mu?”

AI adayları sıralar. Transaction Service güncel kapasiteyi doğrular ve assignment’ı kesinleştirir.

## “Shared database neden yok?”

Her servis kendi verisinin sahibidir. Cross-service database erişimi bağımsız deploy ve failure izolasyonunu bozar.

## “RabbitMQ kapalıysa ne olur?”

Business işlem kendi database’ine ve outbox’a yazılır. RabbitMQ geri geldiğinde event yayınlanır.

## “Model gerçekten ML mi?”

Dataset generator, training pipeline, model karşılaştırması, artifact, checksum ve test metrikleri repository’de bulunuyor. Skor hardcoded değildir.

## “Güvenliği yalnızca Gateway mi yapıyor?”

Hayır. Gateway kaba kontrol yapar; business servis role, ownership, assignment ve state kontrollerini yeniden uygular.

---

# 62. Demo Risk Azaltma

Canlı demo öncesinde:

- Laptop yeniden başlatılır
- Docker cache hazırlanır
- Image’lar önceden build edilir
- İnternet bağımlılıkları kaldırılır
- Demo reset çalıştırılır
- Preflight çalıştırılır
- Browser sekmeleri hazırlanır
- Terminal komutları hazır tutulur
- Demo credential’lar doğrulanır
- Queue ve DLQ kontrol edilir
- AI model warmup yapılır
- Aynı demo en az üç kez baştan sona prova edilir

Sunum günü ilk defa build yapılmaz.

---

# 63. Demo Fallback Planı

Canlı demo sorununda kullanılacak fallback’ler:

1. Tek komutla demo reset
2. Hazır seed transaction
3. Hazır yüksek risk case
4. Önceden hazırlanmış API request collection
5. Sistem mimarisi ekran görüntüsü
6. AI metric raporu
7. Kısa yedek demo videosu

Yedek video ana demo yerine kullanılmamalıdır.

Yalnızca teknik ortam arızasında son çare olmalıdır.

---

# 64. Uygulama Yol Haritası

Uygulama aşağıdaki milestone’lara bölünür.

## M0 — Repository ve Foundation

- Monorepo oluştur
- Service skeleton’ları
- Shared contract klasörleri
- Docker Compose başlangıcı
- Dört PostgreSQL
- RabbitMQ
- CI başlangıcı
- Health endpoint’leri

## M1 — Identity

- Staff login
- Customer OTP
- Argon2id
- JWT
- Refresh rotation
- Lockout
- Role policy
- Audit altyapısı

## M2 — Transaction Domain

- Transaction create
- Idempotency
- RiskCase
- State machine
- SLA
- Assignment
- Customer verification
- Feedback

## M3 — Messaging

- RabbitMQ topology
- Event envelope
- Outbox
- Inbox
- Retry
- DLQ
- Audit event’leri
- Projection event’leri

## M4 — AI

- Dataset generator
- Feature pipeline
- Model training
- Model selection
- Prediction consumer
- Reason code
- Analyst ranking
- AI metrics

## M5 — Gamification

- Point ledger
- Puan kuralları
- Badge
- Level
- Leaderboard
- Performance score
- AI performance event’i

## M6 — Frontend

- Auth ekranları
- Customer transaction ekranı
- Analyst work queue
- Case detail
- Customer verification
- Supervisor dashboard
- Gamification profile
- SSE notifications

## M7 — Hardening

- Security testleri
- Resilience testleri
- Concurrency testleri
- Rate limit
- CSP
- Health/metrics
- Container security
- Vulnerability scan

## M8 — Delivery

- Root README
- EVENTS.md
- Service README’leri
- OpenAPI export
- Demo reset
- Preflight
- Sunum
- Jüri Q&A provası

---

# 65. Critical Path

Critical path:

```text
Transaction create
→ transaction.created event
→ AI assessment
→ RiskCase
→ Assignment
→ Analyst decision
→ Gamification
→ Leaderboard
```

Bu zincir tamamlanmadan ikincil dashboard veya görsel iyileştirmelere geçilmemelidir.

Öncelik sırası:

```text
P0: Zorunlu iş akışı
P1: Bonus ve jüri etkisi
P2: Görsel iyileştirme
```

---

# 66. P0 Kapsamı

P0 tamamlanmadan proje teslim edilemez:

- Docker Compose çalışıyor
- Gateway çalışıyor
- Dört servis çalışıyor
- Dört ayrı database var
- Customer login
- Staff login
- Transaction create
- Gerçek AI modeli
- Fraud-type tahmini
- RiskCase
- Analyst assignment
- State machine
- SLA
- Final karar
- Gamification puanı
- Leaderboard
- Security temel testleri
- AI failure fallback
- Servis stop demosu

---

# 67. P1 Kapsamı

P1 yarışma puanını yükseltir:

- RabbitMQ bonusu
- Kendi ML modeli
- Kategori bazlı doğruluk
- SSE
- CI/CD
- Badge
- Model comparison
- Refresh-token reuse
- Audit dashboard
- Outbox/inbox recovery demosu
- Security script’i

---

# 68. P2 Kapsamı

Zaman kalırsa:

- Gelişmiş grafikler
- Ek badge’ler
- Model drift ekranı
- Gelişmiş notification geçmişi
- Daha fazla dashboard filter’ı
- Ek benchmark
- Daha gelişmiş visual polish

P2 özelliği P0 stabilitesini riske atamaz.

---

# 69. Scope Freeze

Final demodan önce scope freeze uygulanır.

Freeze sonrası yalnızca:

- Critical bug
- Security bug
- Demo-blocking bug
- Build failure
- Data corruption
- Disqualification riski

düzeltilir.

Yeni feature eklenmez.

---

# 70. Feature Definition of Done

Bir feature tamamlanmış sayılabilmesi için:

1. Requirement ile bağlantısı var
2. Service owner belli
3. Domain kuralı yazılmış
4. Database migration var
5. API veya event contract var
6. Authentication uygulanmış
7. Authorization uygulanmış
8. Validation uygulanmış
9. Error code tanımlı
10. Audit gereksinimi uygulanmış
11. Outbox/inbox değerlendirilmiş
12. Unit test var
13. Integration test var
14. Negative test var
15. OpenAPI/AsyncAPI güncel
16. Log ve metric var
17. Failure davranışı tanımlı
18. README güncel
19. Demo adımı varsa prova edilmiş
20. Code review tamamlanmış

---

# 71. Service Definition of Done

Bir servis tamamlanmış sayılabilmesi için:

- Build oluyor
- Kendi database’i var
- Migration çalışıyor
- Runtime credential ayrı
- Health endpoint’leri var
- Structured log var
- Correlation ID taşıyor
- Outbox/inbox gerekiyorsa var
- Docker image non-root
- Host portu açık değil
- Unit testleri geçiyor
- Integration testleri geçiyor
- Service README var
- OpenAPI veya event contract güncel
- Failure testi yapılmış
- Compose içinde healthy oluyor

---

# 72. Release Definition of Done

FraudCell release adayı aşağıdaki şartları sağlamalıdır:

1. `docker compose up -d --build` başarılı
2. Bütün zorunlu container’lar healthy
3. Dört ayrı PostgreSQL container var
4. Shared database yok
5. Migration sıfırdan uygulanıyor
6. Demo seed deterministik
7. Customer login çalışıyor
8. Staff login çalışıyor
9. Transaction create çalışıyor
10. AI gerçek model sonucu üretiyor
11. Fraud-type üretiliyor
12. Case ve SLA oluşuyor
13. Analyst assignment çalışıyor
14. Final karar çalışıyor
15. Gamification puanı oluşuyor
16. Leaderboard güncelleniyor
17. AI kapalıyken fallback çalışıyor
18. Bir servis kapatıldığında diğerleri çalışıyor
19. SQLi testi geçiyor
20. RBAC testi geçiyor
21. IDOR testi geçiyor
22. JWT manipulation testi geçiyor
23. Refresh reuse testi geçiyor
24. XSS testi geçiyor
25. Brute-force lockout çalışıyor
26. Transaction ve AI OpenAPI mevcut
27. EVENTS.md mevcut
28. Root README mevcut
29. Service README’leri mevcut
30. Demo 15 dakika içinde tamamlanıyor

---

# 73. Final Teslimat Dosyaları

Ana mimari dokümanlar:

```text
docs/00-START-HERE.md
docs/01-REQUIREMENTS-TRACEABILITY.md
docs/02-ARCHITECTURE-OVERVIEW.md
docs/03-TECH-STACK.md
docs/04-SERVICE-BOUNDARIES.md
docs/05-DOMAIN-AND-STATE-MACHINE.md
docs/06-DATA-ARCHITECTURE.md
docs/07-API-DESIGN.md
docs/08-EVENT-DRIVEN-ARCHITECTURE.md
docs/09-IDENTITY-SECURITY-AND-AUDIT.md
docs/10-AI-SERVICE-DESIGN.md
docs/11-FINAL-DELIVERY-PLAYBOOK.md
```

Ayrı kalması zorunlu veya operasyonel teslimatlar:

```text
README.md
EVENTS.md
docker-compose.yml

src/Identity/README.md
src/Transaction/README.md
src/AI/README.md
src/Gamification/README.md

contracts/api/transaction.openapi.json
contracts/api/ai.openapi.json
contracts/events/asyncapi.yaml
contracts/events/schemas/*.json
```

Bu ayrı dosyalar yeni mimari doküman değildir.

Case teslimat formatını karşılayan kısa operasyonel belgelerdir.

---

# 74. Disqualification Kontrolü

Teslimden önce kesin olarak doğrulanmalıdır:

```text
[ ] Sistem monolith değil
[ ] En az dört business service var
[ ] Gateway var
[ ] Docker Compose çalışıyor
[ ] Shared database yok
[ ] Her servis ayrı database kullanıyor
[ ] AI mock veya hardcoded değil
[ ] Build başarılı
[ ] Transaction ve AI OpenAPI mevcut
[ ] Servis README'leri mevcut
[ ] AI arızasında fallback çalışıyor
```

Bu maddelerden herhangi birinin ihlali görsel iyileştirmelerden daha kritiktir.

---

# 75. Yarışma Puanı Kontrolü

## Mimari

```text
[ ] Mikroservis sınırları açık
[ ] Database per service
[ ] API Gateway
[ ] Event-driven iletişim
[ ] Failure isolation
```

## Fonksiyon

```text
[ ] Authentication
[ ] Transaction
[ ] AI risk
[ ] Fraud type
[ ] Assignment
[ ] State machine
[ ] SLA
[ ] Gamification
[ ] Dashboard
```

## Güvenlik

```text
[ ] Argon2id
[ ] Lockout
[ ] JWT validation
[ ] Refresh rotation
[ ] Token reuse
[ ] RBAC
[ ] IDOR
[ ] Audit
[ ] SQLi
[ ] XSS
```

## Bonus

```text
[ ] Kendi ML modeli
[ ] RabbitMQ
[ ] Kategori bazlı doğruluk
[ ] SSE
[ ] CI/CD
```

---

# 76. Nihai Karar Özeti

| Konu                    | Nihai Karar                                 |
| ----------------------- | ------------------------------------------- |
| Puan kaynağı            | Yalnızca business event’leri                |
| Point storage           | Immutable ledger                            |
| Duplicate puan koruması | `sourceEventId + ruleCode`                  |
| Seviyeler               | BRONZ, GUMUS, ALTIN, PLATIN                 |
| Leaderboard             | Günlük ve haftalık Top 10                   |
| Leaderboard timezone    | Europe/Istanbul                             |
| Performance çıktısı     | AI Service’e event                          |
| Health                  | Liveness + readiness                        |
| RabbitMQ arızası        | Business commit, outbox bekler              |
| AI arızası              | BELIRSIZ + INCELEME + manual queue          |
| Gamification arızası    | Case kararı başarılı, event bekler          |
| Identity arızası        | Login/refresh yok, valid JWT devam edebilir |
| Public port             | Yalnızca Edge `8080`                        |
| Uzun süreli container   | 10                                          |
| Database                | Dört ayrı PostgreSQL                        |
| Migration               | One-shot command/container                  |
| Test DB                 | Gerçek PostgreSQL Testcontainer             |
| Event testi             | Gerçek RabbitMQ Testcontainer               |
| Frontend E2E            | Playwright                                  |
| CI                      | GitHub Actions                              |
| Ana demo                | Yüksek riskli transaction → block → puan    |
| Failure demo            | Gamification veya AI stop/recovery          |
| Security demo           | 403 + audit veya JWT manipulation           |
| Yol haritası            | M0–M8 milestone                             |
| Kalan mimari belgeler   | Bu dosyada birleştirildi                    |

---

# 77. Nihai Uygulama İlkeleri

1. Gamification yalnızca gerçekleşmiş event’lerden sonuç üretir.
2. Puan ledger geçmişi değiştirilmez.
3. Duplicate event duplicate puan oluşturmaz.
4. AI assignment önerir; Transaction kesinleştirir.
5. Bir servis arızası diğer servislerin business state’ini bozmaz.
6. RabbitMQ kapalıyken event kaybolmaz.
7. Health check servisleri zincirleme bağımlı hale getirmez.
8. Database arızası yalnızca sahibi olan servisi unready yapar.
9. Yalnızca Edge public port açar.
10. Migration runtime servisinden ayrıdır.
11. Testlerde kritik altyapının gerçek karşılığı kullanılır.
12. Security testleri pozitif testler kadar önemlidir.
13. AI metric’i uydurulmaz; rapordan okunur.
14. Demo business hikâyesi üzerinden ilerler.
15. Jüriye “exactly once” iddiası yapılmaz.
16. Zorunlu akış tamamlanmadan görsel ek özelliklere geçilmez.
17. P0 stabilitesi P2 özelliklerinden önemlidir.
18. Demo öncesinde scope freeze uygulanır.
19. Her mimari iddia test veya canlı failure demosuyla kanıtlanır.
20. FraudCell yalnızca çalışan değil, neden çalıştığı açıklanabilen bir sistem olarak teslim edilir.

---

# 78. Dokümantasyon Durumu

Bu dosyayla birlikte ana mimari doküman seti tamamlanmıştır.

Ana doküman sayısı:

```text
12
```

Sonraki çalışmalar yeni uzun mimari doküman oluşturmak yerine aşağıdaki kısa ve zorunlu teslimat dosyalarına odaklanacaktır:

```text
README.md
EVENTS.md
Servis README'leri
OpenAPI çıktıları
Event schema dosyaları
```
````
