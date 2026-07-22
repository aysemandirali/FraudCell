# FraudCell

FraudCell; müşteri işlemlerini AI ile değerlendiren, risk vakalarını personele
atayan ve analist performansını oyunlaştıran bir full-stack demo sistemidir.
Tarayıcının tek giriş noktası Edge Gateway'dir. Frontend, Identity,
Transaction, AI ve Gamification servislerinin gerçek akışlarıyla çalışır.

## Hızlı Başlangıç

Günlük geliştirme için önerilen mod hibrittir. Uygulamalar Windows üzerinde,
yalnızca PostgreSQL ve RabbitMQ Docker'da çalışır:

```bat
scripts\configure-wsl.bat --apply
scripts\start-all.bat
```

- Frontend: `http://127.0.0.1:5173`
- Gateway: `http://127.0.0.1:8080`

Tam Docker demosu için:

```bat
scripts\configure-pagefile.bat --apply
scripts\start-docker.bat
```

Bu mod frontend dahil bütün sistemi `http://127.0.0.1:8080` adresinde açar.
İlk komut Yönetici terminalinde bir kez çalıştırılmalıdır. Windows pagefile
kapalıyken tam Docker derlemesi sistemin commit belleğini tüketebilir.

Yerel demo yöneticisi:

```text
admin@fraudcell.local
ChangeMe123!
```

Bu bilgiler sadece `Development` ortamı içindir.

## Çalışma Modları

| Komut | Uygulamalar | Uzun süreli container | Adres |
|---|---|---:|---|
| `scripts\start-mock.bat` | Frontend + MSW | 0 | `5173` |
| `scripts\start-local.bat` | Tamamen Windows native | 0 | `5173`, `8080` |
| `scripts\start-hybrid.bat` | Native uygulamalar | 2 | `5173`, `8080` |
| `scripts\start-docker.bat` | Tam Docker + statik frontend | 7 | `8080` |

Tam Docker modu tek PostgreSQL sürecinde dört ayrı database ve dört ayrı login
rolü kullanır. Böylece veri sahipliği korunurken dört PostgreSQL container'ının
RAM/CPU maliyeti ödenmez. Yalnızca Gateway host portu açar. Compose hard RAM
limitlerinin toplamı 3.4 GiB'dir; build işlemleri `COMPOSE_PARALLEL_LIMIT=1`
ile seri yürütülür.

Docker kullanmadan çalıştırmak için PostgreSQL 18, RabbitMQ 4.x/Erlang,
.NET SDK 10, Node.js 22.13+ ve `uv` kurulu olmalıdır. Ardından
`BACKEND\.env.local.example` dosyasını `BACKEND\.env.local` olarak oluşturup
`POSTGRES_ADMIN_PASSWORD` değerini girin ve `scripts\start-local.bat` çalıştırın.

## Doğrulama

```bat
scripts\status.bat
scripts\smoke-backend.bat
scripts\test-fullstack.bat hybrid
scripts\test-fullstack.bat docker
scripts\check-contracts.bat
scripts\stop-all.bat
```

Full-stack baseline; .NET build, Python Ruff/Mypy/Pytest, gateway smoke,
OpenAPI snapshot kontrolü, frontend contract üretimi, Vitest, typecheck,
production build ve masaüstü/mobil Playwright akışlarını çalıştırır.

Ayrıntılı komutlar [scripts/README.md](scripts/README.md), kalan mühendislik
fazları [BACKEND/docs/12-BACKEND-COMPLETION-PLAN.md](BACKEND/docs/12-BACKEND-COMPLETION-PLAN.md)
dosyasındadır.
