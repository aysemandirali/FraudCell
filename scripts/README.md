# FraudCell Yerel Komutları

Komutları repository kökünde çalıştırın. Scriptler Docker Desktop'ı kendiliğinden
başlatmaz ve açık onay olmadan volume silmez.

## Günlük Modlar

| Komut | Mod | Container | Frontend |
|---|---|---:|---|
| `scripts\start-mock.bat` | Frontend + MSW | 0 | `http://127.0.0.1:5173` |
| `scripts\start-local.bat` | Tamamen Docker'sız | 0 | `http://127.0.0.1:5173` |
| `scripts\start-hybrid.bat` | Native uygulama + Docker infra | 2 | `http://127.0.0.1:5173` |
| `scripts\start-all.bat` | Önerilen hibrit mod alias'ı | 2 | `http://127.0.0.1:5173` |
| `scripts\start-docker.bat` | Tam Docker, frontend Edge içinde | 7 | `http://127.0.0.1:8080` |

`start-docker.bat` imajları seri olarak yeniden derler, eski compose
container'larını volume'lara dokunmadan kaldırır ve sadece Gateway'i host'a
açar. Tek PostgreSQL instance'ında servis başına ayrı database/login bulunur.

Docker'sız mod için PostgreSQL 18, RabbitMQ 4.x/Erlang, .NET SDK 10,
Node.js 22.13+ ve `uv` gerekir:

```powershell
Copy-Item BACKEND\.env.local.example BACKEND\.env.local
# BACKEND\.env.local içindeki POSTGRES_ADMIN_PASSWORD değerini girin.
scripts\start-local.bat
```

## Operasyon

```text
scripts\preflight.bat [mock|local|hybrid|docker]
scripts\status.bat
scripts\logs.bat [identity|transaction|gamification|ai|edge|frontend]
scripts\stop-all.bat
scripts\test-fullstack.bat [local|hybrid|docker]
```

`test-fullstack.bat`, istenen mod kapalıysa onu başlatır. .NET/Python/frontend
kontrolleri, smoke, AI readiness, OpenAPI drift ve Playwright E2E tamamlanınca
yalnızca kendisinin başlattığı yığını durdurur. Çalışır bırakmak için doğrudan:

```powershell
.\scripts\test-fullstack.ps1 -Mode docker -KeepRunning
```

## OpenAPI Sözleşmeleri

```text
scripts\export-openapi.bat
scripts\check-contracts.bat
```

Identity, Transaction, Gamification ve AI snapshot'ları
`BACKEND\contracts\openapi` altındadır. Docker modu servislerin host portlarını
açmadan container ağı üzerinden export/check yapar. Frontend tipleri:

```powershell
Set-Location FRONTEND\app
npm.cmd run contracts:generate
```

## Kaynak Korumaları

```text
scripts\configure-wsl.bat --apply
scripts\configure-pagefile.bat --apply
scripts\docker-maintenance.bat report
scripts\docker-maintenance.bat prune-build-cache
```

Pagefile komutu Yönetici terminali ister. Bakım scripti volume silmez. Hibrit
veriyi silmek ayrı ve açık onay isteyen `scripts\reset-hybrid-data.bat`
komutudur.
