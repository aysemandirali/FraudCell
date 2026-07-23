# Edge Gateway

YARP reverse proxy, JWT doğrulama, security headers, rate limiting, correlation id,
SSE bildirim akışı ve React production bundle'ının tek dış giriş noktasıdır. Kalıcı
domain verisi tutmaz.

Route'lar: `/api/v1/auth|staff|reference|audit-logs` → Identity,
`/api/v1/transactions|cases|customer/verifications` → Transaction,
`/api/v1/game` → Gamification, `/api/v1/ai` → AI. `/health/live` ve
`/health/ready` gateway sağlığını verir; `/` SPA'i sunar.

Başlıca ayarlar: `ReverseProxy__Clusters__*__Address`, `Jwt__*`, `RabbitMq__*`,
`ASPNETCORE_ENVIRONMENT`. Docker Compose yalnızca `127.0.0.1:8080` portunu açar.
