# Identity Service

GSM+OTP müşteri kimliği, personel login/yönetimi, JWT+refresh rotation, session,
RBAC ve audit kayıtlarının sahibidir. Kendi `fraudcell_identity` database'ini kullanır.

Endpoint grupları: `/api/v1/auth/*`, `/api/v1/staff/*`, `/api/v1/reference/*`,
`/api/v1/audit-logs/*`, `/health/live`, `/health/ready`. Tam sözleşme:
`BACKEND/contracts/openapi/identity.json`; Development API UI: `/scalar/v1`.

Başlıca ayarlar: `ConnectionStrings__IdentityDb`, `RabbitMq__Host/UserName/Password`,
`Jwt__Issuer/Audience/PublicKeyPath`, `Seed__AdminEmail/Password`,
`ASPNETCORE_ENVIRONMENT`. Docker Compose güvenli varsayılanları `BACKEND/.env`
üzerinden sağlar.
