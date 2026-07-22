using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace FraudCell.BuildingBlocks.Messaging.RabbitMq;

/// <summary>
/// Tek bir kuyrugu tuketen arka plan servisi icin ortak iskelet (dokuman §15/§23).
///
/// Retry/DLQ mantigi burada merkezilestirilmistir: her tuketici servis
/// (Identity, Transaction, Gamification, ...) yalnizca <see cref="HandleAsync"/>
/// icinde business/idempotency mantigini yazar; kuyruk deklarasyonu, yeniden
/// deneme zamanlamasi ve dead-letter yonlendirmesi burada tek yerde yapilir.
///
/// Bir mesaj basarisiz olduğunda ORIJINAL mesaj ACK edilir ve icerigi manuel
/// olarak retry/DLQ kuyruguna yeniden yayinlanir; bu sayede TTL tabanli gecikme
/// (dokuman §15: 5sn -> 30sn -> 2dk) native RabbitMQ mekanizmasiyla saglanir.
/// </summary>
public abstract class RabbitMqConsumerHostedService(
    RabbitMqConnectionProvider connectionProvider,
    IOptions<RabbitMqOptions> options,
    ILogger logger) : BackgroundService
{
    private const string RetryCountHeader = "x-fraudcell-retry-count";

    private readonly RabbitMqOptions _options = options.Value;

    /// <summary>Bu consumer'in kendi kuyrugu. Ornek: <c>identity.audit-events</c>.</summary>
    protected abstract string QueueName { get; }

    /// <summary>Ana exchange'e hangi routing key desenleriyle baglanacagi.</summary>
    protected abstract IReadOnlyCollection<string> RoutingKeys { get; }

    /// <summary>
    /// Business isleme. Exception firlatirsa mesaj retry/DLQ zincirine alinir.
    /// Idempotency (inbox) kontrolu implementasyonun sorumlulugundadir.
    /// </summary>
    protected abstract Task HandleAsync(EventEnvelope envelope, CancellationToken cancellationToken);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunConsumerLoopAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                // Broker kapali ya da baglanti koptu; kisa bir bekleme sonrasi tekrar dene.
                // Bu esnada business islemler etkilenmez, event'ler broker'da/outbox'ta bekler.
                logger.LogWarning(ex, "Consumer loop for queue {QueueName} failed; reconnecting.", QueueName);
                await Task.Delay(TimeSpan.FromSeconds(_options.ReconnectDelaySeconds), stoppingToken);
            }
        }
    }

    private async Task RunConsumerLoopAsync(CancellationToken stoppingToken)
    {
        var connection = await connectionProvider.GetConnectionAsync(stoppingToken);
        await using var channel = await connection.CreateChannelAsync(cancellationToken: stoppingToken);

        await RabbitMqTopology.DeclareConsumerQueueAsync(channel, _options, QueueName, RoutingKeys, stoppingToken);
        await channel.BasicQosAsync(0, _options.PrefetchCount, global: false, stoppingToken);

        var consumer = new AsyncEventingBasicConsumer(channel);
        consumer.ReceivedAsync += async (_, args) => await OnReceivedAsync(channel, args, stoppingToken);

        await channel.BasicConsumeAsync(QueueName, autoAck: false, consumer, stoppingToken);

        logger.LogInformation("Consumer started for queue {QueueName}.", QueueName);

        // Kanal acik oldugu surece bekle; kanal/baglanti koparsa disariya cikilir
        // ve ExecuteAsync yeniden baglanmayi dener.
        while (channel.IsOpen && !stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(TimeSpan.FromSeconds(1), stoppingToken);
        }
    }

    private async Task OnReceivedAsync(IChannel channel, BasicDeliverEventArgs args, CancellationToken cancellationToken)
    {
        try
        {
            var envelope = JsonSerializer.Deserialize<EventEnvelope>(args.Body.Span, Api.JsonDefaults.Events)
                ?? throw new InvalidOperationException("Event envelope deserialize edilemedi (null).");

            await HandleAsync(envelope, cancellationToken);
            await channel.BasicAckAsync(args.DeliveryTag, multiple: false, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to process message from {QueueName}; routing to retry/DLQ.", QueueName);
            await RequeueForRetryAsync(channel, args, cancellationToken);
        }
    }

    private async Task RequeueForRetryAsync(IChannel channel, BasicDeliverEventArgs args, CancellationToken cancellationToken)
    {
        var retryCount = GetRetryCount(args.BasicProperties);

        var properties = new BasicProperties(args.BasicProperties)
        {
            Headers = new Dictionary<string, object?>(args.BasicProperties.Headers ?? new Dictionary<string, object?>())
            {
                [RetryCountHeader] = retryCount + 1,
            },
        };

        if (retryCount < _options.RetryDelaysSeconds.Length)
        {
            var retryQueue = RabbitMqTopology.RetryQueueName(QueueName, _options.RetryDelaysSeconds[retryCount]);

            await channel.BasicPublishAsync(
                exchange: _options.RetryExchange,
                routingKey: retryQueue,
                mandatory: false,
                basicProperties: properties,
                body: args.Body,
                cancellationToken: cancellationToken);

            logger.LogInformation(
                "Message for {QueueName} scheduled for retry #{RetryCount} via {RetryQueue}.",
                QueueName, retryCount + 1, retryQueue);
        }
        else
        {
            await channel.BasicPublishAsync(
                exchange: _options.DeadLetterExchange,
                routingKey: QueueName,
                mandatory: false,
                basicProperties: properties,
                body: args.Body,
                cancellationToken: cancellationToken);

            logger.LogError(
                "Message for {QueueName} exhausted all retries and was sent to the dead-letter queue.", QueueName);
        }

        // Orijinal teslimat ACK edilir: bir kopyasi retry/DLQ zincirine zaten yayinlandi.
        await channel.BasicAckAsync(args.DeliveryTag, multiple: false, cancellationToken);
    }

    private static int GetRetryCount(IReadOnlyBasicProperties properties)
    {
        if (properties.Headers is not { } headers || !headers.TryGetValue("x-fraudcell-retry-count", out var raw))
        {
            return 0;
        }

        return raw switch
        {
            int i => i,
            long l => (int)l,
            byte[] bytes => int.TryParse(Encoding.UTF8.GetString(bytes), out var parsed) ? parsed : 0,
            _ => 0,
        };
    }
}
