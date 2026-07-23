# Gamification Service

Analist puan defteri, rozetler, seviyeler, performans projeksiyonu ve günlük/haftalık/
aylık liderlik tablolarının sahibidir. Karar, SLA, doğrulama ve feedback event'lerini
idempotent olarak tüketir.

Endpoint grupları: `/api/v1/game/profiles/*`, `/api/v1/game/badges`,
`/api/v1/game/leaderboard`, `/api/v1/game/performance/*`, health endpoint'leri.
Tam sözleşme: `BACKEND/contracts/openapi/gamification.json`; Development API UI:
`/scalar/v1`.

Başlıca ayarlar: `ConnectionStrings__GamificationDb`, `RabbitMq__*`, `Jwt__*`,
`Outbox__PollIntervalMilliseconds`, `ASPNETCORE_ENVIRONMENT`.
