# FraudCell Tamamlama Durumu ve Sonraki Fazlar

Güncelleme: 23 Temmuz 2026

Bu belge çalışan full-stack baseline ile gerçek production hazırlığını ayırır.
Demo akışının tamamlanmış olması; secret yönetimi, gözlemlenebilirlik, yük ve
recovery testlerinin de tamamlandığı anlamına gelmez.

## Mevcut Baseline

- Edge Gateway tek public giriş ve production SPA host'udur.
- Identity: staff login, müşteri OTP, refresh/logout, session, staff ve audit.
- Transaction: transaction, AI sonucu, vaka, ETag, atama, karar ve doğrulama.
- AI: model bootstrap, RabbitMQ consumer, prediction, metrik ve outbox.
- Gamification: profil, puan, rozet, performans ve leaderboard.
- Realtime: 30 saniyelik tek kullanımlık ticket ile kullanıcıya özel SSE.
- Frontend: CUSTOMER, ANALYST, SUPERVISOR ve ADMIN akışlarında geçici route yok.
- Contract: dört servis için izlenen OpenAPI snapshot ve üretilen frontend tipi.

## Tamamlanan Fazlar

### Faz 0: Host ve Docker Koruması

Durum: Tamamlandı.

- WSL için 8 GiB RAM, 6 CPU ve 4 GiB swap şablonu.
- Windows pagefile kontrol/uygulama scripti.
- Seri Docker build ve container başına CPU/RAM/PID limitleri.
- Güvenli build-cache bakımı; otomatik volume prune yok.

### Faz 1: Çalıştırma Modları

Durum: Tamamlandı.

- Mock: backend ve Docker gerektirmez.
- Local: PostgreSQL/RabbitMQ dahil tamamen Docker'sız.
- Hybrid: günlük önerilen, yalnız PostgreSQL + RabbitMQ Docker'da.
- Docker: frontend dahil 7 container, tek host portu.
- Eski `.env` dosyaları mevcut değerleri koruyarak eksik anahtarlarla yükseltilir.

### Faz 2: Kimlik ve Sözleşme

Durum: Tamamlandı.

- Gerçek staff/customer girişleri ve session yenileme/iptal.
- Response schema'ları ve OpenAPI drift kontrolü.
- Staff yönetimi ve append-only audit ekranı.

### Faz 3: Transaction, AI ve Vaka

Durum: Tamamlandı.

- Idempotent transaction create.
- RabbitMQ transaction -> AI prediction -> risk case zinciri.
- Analist inceleme/karar, müşteri doğrulama ve supervisor override/atama.
- Taze database başlangıcında AI şema oluşturma ve model bootstrap.

### Faz 4: Realtime ve Gamification

Durum: Tamamlandı.

- Kısa ömürlü, tek kullanımlık SSE ticket.
- Kullanıcıya özel bounded channel ve reconnect.
- Canlı bildirim cache'i, vaka invalidation ve toast.
- Puan, performans, rozet ve leaderboard ekranları.

### Faz 5: Frontend Tamamlama ve Performans

Durum: Tamamlandı.

- Müşteri bildirim/doğrulama/profil ekranları.
- Supervisor dashboard/vaka/atama kuyruğu/detay ekranları.
- Admin personel ve audit ekranları.
- Route-level code splitting; ana uygulama chunk'ı yaklaşık 423 kB.
- Masaüstü ve mobil gerçek backend E2E akışları.

### Faz 6: Kalite Kapısı ve Dokümantasyon

Durum: Tamamlandı.

- Tek komut full-stack baseline.
- Python Ruff, Mypy ve Pytest.
- Frontend Vitest, typecheck, build ve Playwright.
- CI'da .NET, AI, frontend ve compose config işleri.
- Yerel çalışma ve kaynak rehberleri.

## Açık Production Fazları

### Faz 7: Kalıcı Şema ve Test Derinliği

Öncelik: Yüksek.

- AI `metadata.create_all` başlangıcını versioned Alembic migration'a geçir.
- Identity/Transaction/Gamification için gerçek database entegrasyon testleri ekle.
- Consumer idempotency, ETag conflict ve refresh-token reuse testlerini genişlet.
- Kalıcı notification inbox/read API'si ekle; mevcut SSE cache oturum ömrü kadardır.

Kapanış: Taze ve bir önceki sürüm database'lerinden upgrade testleri CI'da geçer.

### Faz 8: Gözlemlenebilirlik ve Recovery

Öncelik: Yüksek.

- OpenTelemetry trace/metric export ve correlation dashboard'ları.
- RabbitMQ, AI ve Gamification down/up outbox recovery testleri.
- DLQ gözlemleme ve kontrollü replay aracı.
- SLO, alert ve log saklama politikaları.

Kapanış: Tek servis arızasında veri kaybı olmadan toparlanma kanıtlanır.

### Faz 9: Yük, Güvenlik ve Dağıtım

Öncelik: Production öncesi zorunlu.

- k6 benzeri araçla login, transaction, case list ve SSE yük profili.
- Secret manager, TLS, anahtar rotasyonu ve production seed kapatma.
- Dependency/container image taraması ve SBOM.
- Staging deployment, backup/restore ve rollback provası.

Kapanış: Hedef yükte SLO sağlanır; security ve recovery checklist kapanır.

## Kalite Komutu

```powershell
.\scripts\test-fullstack.ps1 -Mode hybrid -KeepRunning
.\scripts\test-fullstack.ps1 -Mode docker -KeepRunning
```

Windows host'ta tam Docker testinden önce pagefile açık olmalıdır.
