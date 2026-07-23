# Transaction Service

İşlem kaydı, AI assessment projeksiyonu, risk case state machine'i, atama, müşteri
doğrulaması, SLA, karar, override ve feedback'in sahibidir. AI kesintisinde 2 saniyelik
watchdog işlemi `TIMED_OUT` yapıp manuel vaka kuyruğuna taşır.

Endpoint grupları: `/api/v1/transactions*`, `/api/v1/cases*`,
`/api/v1/customer/verifications/*`, `/health/live`, `/health/ready`. Tam sözleşme:
`BACKEND/contracts/openapi/transaction.json`; Development API UI: `/scalar/v1`.

Başlıca ayarlar: `ConnectionStrings__TransactionDb`, `RabbitMq__*`, `Jwt__*`,
`Assessment__DeadlineSeconds`, `Assessment__CustomerVerificationTimeoutMinutes`,
`Outbox__PollIntervalMilliseconds/BatchSize`, `ASPNETCORE_ENVIRONMENT`.
