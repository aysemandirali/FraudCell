@echo off
rem ===========================================================================
rem  FraudCell - Tek tiklamayla tum sistemi Docker ile ayaga kaldirir.
rem
rem  Kullanim: bu dosyaya cift tikla ya da terminalden calistir:
rem     scripts\start-fraudcell.bat
rem
rem  Yaptiklari:
rem    1. Docker Desktop kurulu ve calisiyor mu diye kontrol eder
rem    2. BACKEND\.env yoksa .env.example'dan otomatik olusturur
rem    3. Tum imajlari build eder ve stack'i ayaga kaldirir
rem    4. Edge Gateway saglikli olana kadar bekler
rem    5. Erisim adreslerini ve demo giris bilgilerini yazar
rem
rem  Sifirdan ilk calistirmada imaj indirme + build 10-20 dakika surebilir.
rem ===========================================================================

setlocal EnableExtensions
title FraudCell - Sistem Baslatiliyor

set "SCRIPT_DIR=%~dp0"
set "BACKEND_DIR=%SCRIPT_DIR%..\BACKEND"

echo.
echo  ============================================================
echo    FraudCell - Fraud Tespit Sistemi
echo    Docker ile tam sistem baslatma
echo  ============================================================
echo.

rem ---------------------------------------------------------------------------
rem  1) Docker kontrolu
rem ---------------------------------------------------------------------------
echo  [1/5] Docker kontrol ediliyor...

where docker >nul 2>&1
if errorlevel 1 goto :no_docker

docker info >nul 2>&1
if errorlevel 1 goto :docker_down

docker compose version >nul 2>&1
if errorlevel 1 goto :no_compose

echo        [OK] Docker calisiyor.

rem ---------------------------------------------------------------------------
rem  2) .env dosyasi
rem ---------------------------------------------------------------------------
echo  [2/5] Ortam dosyasi ^(.env^) hazirlaniyor...

if exist "%BACKEND_DIR%\.env" goto :env_ok
if not exist "%BACKEND_DIR%\.env.example" goto :no_example

copy /Y "%BACKEND_DIR%\.env.example" "%BACKEND_DIR%\.env" >nul
if errorlevel 1 goto :env_fail
echo        [OK] .env olusturuldu ^(varsayilan yerel/demo sifreleriyle^).
goto :build

:env_ok
echo        [OK] .env zaten var, korunuyor.

rem ---------------------------------------------------------------------------
rem  3) Build + Up
rem ---------------------------------------------------------------------------
:build
echo  [3/5] Imajlar build ediliyor ve servisler baslatiliyor...
echo        ^(ilk calistirmada bu adim uzun surebilir, lutfen bekleyin^)
echo.

pushd "%BACKEND_DIR%"
docker compose up -d --build
set "COMPOSE_RC=%ERRORLEVEL%"
popd

if not "%COMPOSE_RC%"=="0" goto :compose_fail
echo.
echo        [OK] Konteynerler ayaga kalkti.

rem ---------------------------------------------------------------------------
rem  4) Saglik bekleme
rem ---------------------------------------------------------------------------
echo  [4/5] Sistem sagligi bekleniyor ^(Edge Gateway^)...

rem  Tum bekleme dongusu tek PowerShell cagrisinda: 60 deneme x 5 sn = ~5 dk.
rem  Bu sekilde "timeout"/"ping" gibi harici komutlara bagimli degiliz.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$u='http://127.0.0.1:8080/health/ready'; $ok=$false; for($i=0;$i -lt 60;$i++){ try{ $r=Invoke-WebRequest -UseBasicParsing $u -TimeoutSec 4; if($r.Content.Trim() -eq 'Healthy'){ $ok=$true; break } }catch{}; Write-Host -NoNewline '.'; Start-Sleep -Seconds 5 }; Write-Host ''; if($ok){ exit 0 } else { exit 1 }"
if errorlevel 1 goto :wait_timeout

echo        [OK] Sistem hazir.
goto :status

:wait_timeout
echo.
echo  [UYARI] Gateway 5 dakikada "Healthy" olmadi.
echo          Servisler hala baslaniyor olabilir. Durumu gormek icin:
echo             cd BACKEND ^&^& docker compose ps
echo             cd BACKEND ^&^& docker compose logs -f edge-gateway
echo.

rem ---------------------------------------------------------------------------
rem  5) Ozet + erisim bilgileri
rem ---------------------------------------------------------------------------
:status
echo  [5/5] Konteyner durumu:
echo.
pushd "%BACKEND_DIR%"
docker compose ps
popd

echo.
echo  ============================================================
echo    FraudCell HAZIR
echo  ============================================================
echo.
echo    Uygulama ^(tarayicida ac^):   http://127.0.0.1:8080
echo.
echo    --- Demo giris bilgileri ---
echo    Personel ^(Admin^):
echo       E-posta : admin@fraudcell.local
echo       Sifre   : ChangeMe123!
echo.
echo    Musteri ^(once "Yeni musteri" ile kayit^):
echo       Telefon : 5551112233   ^(herhangi bir 5xx numara^)
echo       OTP kodu: 1234         ^(sabit demo kodu^)
echo.
echo    --- Faydali komutlar ---
echo    Loglari izle : cd BACKEND ^&^& docker compose logs -f
echo    Durum        : cd BACKEND ^&^& docker compose ps
echo    Durdur       : scripts\stop-fraudcell.bat
echo  ============================================================
echo.
echo    Tarayici aciliyor...
start "" "http://127.0.0.1:8080"
echo.
pause
exit /b 0

rem ===========================================================================
rem  Hata cikislari
rem ===========================================================================
:no_docker
echo.
echo  [HATA] Docker bulunamadi.
echo         Docker Desktop kurulu degil ya da PATH'te degil.
echo         Kurulum: https://www.docker.com/products/docker-desktop/
goto :fail

:docker_down
echo.
echo  [HATA] Docker calismyor.
echo         Once Docker Desktop uygulamasini acin, balina ikonu
echo         "Running" olana kadar bekleyin, sonra tekrar calistirin.
goto :fail

:no_compose
echo.
echo  [HATA] "docker compose" ^(v2^) bulunamadi.
echo         Docker Desktop'i guncelleyin ^(Compose v2 dahildir^).
goto :fail

:no_example
echo.
echo  [HATA] BACKEND\.env.example bulunamadi. Repo eksik klonlanmis olabilir.
goto :fail

:env_fail
echo.
echo  [HATA] .env olusturulamadi ^(yazma izni?^).
goto :fail

:compose_fail
echo.
echo  [HATA] docker compose baslatilamadi ^(kod %COMPOSE_RC%^).
echo         Ustteki cikti nedeni gosterir. Sik cozum:
echo         Docker Desktop'a daha fazla RAM verin ^(Settings^>Resources, en az 6 GB^).
goto :fail

:fail
echo.
echo  Baslatma basarisiz. Yukaridaki mesaji kontrol edin.
echo.
pause
exit /b 1
