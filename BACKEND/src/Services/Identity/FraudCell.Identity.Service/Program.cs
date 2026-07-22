using System.Text.Json;
using FraudCell.BuildingBlocks.Api;
using FraudCell.BuildingBlocks.Correlation;
using FraudCell.BuildingBlocks.Messaging.Outbox;
using FraudCell.BuildingBlocks.Messaging.RabbitMq;
using FraudCell.BuildingBlocks.Persistence;
using FraudCell.BuildingBlocks.Time;
using FraudCell.Identity.Service.BackgroundJobs;
using FraudCell.Identity.Service.Common;
using FraudCell.Identity.Service.Domain;
using FraudCell.Identity.Service.Features.Audit.GetAuditLogs;
using FraudCell.Identity.Service.Features.Auth.Logout;
using FraudCell.Identity.Service.Features.Auth.RefreshToken;
using FraudCell.Identity.Service.Features.Auth.RegisterCustomer;
using FraudCell.Identity.Service.Features.Auth.RequestOtp;
using FraudCell.Identity.Service.Features.Auth.StaffLogin;
using FraudCell.Identity.Service.Features.Auth.VerifyOtp;
using FraudCell.Identity.Service.Features.Staff.CreateStaff;
using FraudCell.Identity.Service.Features.Users.GetCurrentUser;
using FraudCell.Identity.Service.Messaging;
using FraudCell.Identity.Service.Persistence;
using FraudCell.Identity.Service.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, services, configuration) => configuration
    .ReadFrom.Configuration(context.Configuration)
    .Enrich.FromLogContext()
    .Enrich.WithProperty("service", "identity-service")
    .Enrich.WithEnvironmentName()
    .WriteTo.Console(new Serilog.Formatting.Json.JsonFormatter()));

// --- Cross-cutting ---
builder.Services.AddSingleton<IClock, SystemClock>();
builder.Services.AddScoped<CorrelationContext>();
builder.Services.AddSingleton(new ServiceIdentity("identity-service"));
builder.Services.AddSingleton(JsonDefaults.Create());

builder.Services.Configure<JwtSigningOptions>(builder.Configuration.GetSection(JwtSigningOptions.SectionName));
builder.Services.Configure<OtpOptions>(builder.Configuration.GetSection(OtpOptions.SectionName));
builder.Services.Configure<RabbitMqOptions>(builder.Configuration.GetSection(RabbitMqOptions.SectionName));
builder.Services.Configure<OutboxOptions>(builder.Configuration.GetSection(OutboxOptions.SectionName));

// --- Persistence ---
builder.Services.AddDbContext<IdentityServiceDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("IdentityDb")));

builder.Services.AddScoped<IMessagingDbContext>(sp => sp.GetRequiredService<IdentityServiceDbContext>());

// --- Identity ---
builder.Services
    .AddIdentityCore<ApplicationUser>(options =>
    {
        // Dokuman §7.1 IDN-009..012: min 8 karakter, buyuk harf, rakam, ozel karakter.
        options.Password.RequiredLength = 8;
        options.Password.RequireDigit = true;
        options.Password.RequireUppercase = true;
        options.Password.RequireNonAlphanumeric = true;
        options.Password.RequireLowercase = false;
        options.Password.RequiredUniqueChars = 1;

        // Dokuman §7.1 IDN-015/016: 5 basarisiz denemede 15 dakika kilit.
        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
        options.Lockout.AllowedForNewUsers = true;

        options.User.RequireUniqueEmail = true;
        options.SignIn.RequireConfirmedAccount = false;
    })
    .AddRoles<ApplicationRole>()
    .AddEntityFrameworkStores<IdentityServiceDbContext>()
    .AddDefaultTokenProviders();

// Varsayilan PBKDF2 hasher yerine Argon2id (dokuman §8.3).
builder.Services.AddScoped<IPasswordHasher<ApplicationUser>, Argon2idPasswordHasher>();

builder.Services.AddSingleton<RsaKeyProvider>();
builder.Services.AddScoped<JwtTokenService>();
builder.Services.AddScoped<RefreshTokenService>();
builder.Services.AddScoped<OtpService>();
builder.Services.AddScoped<SessionIssuer>();
builder.Services.AddScoped<AuditWriter>();
builder.Services.AddScoped<OutboxWriter>();

// --- Messaging ---
builder.Services.AddSingleton<RabbitMqConnectionProvider>();
builder.Services.AddSingleton<RabbitMqEventPublisher>();
builder.Services.AddHostedService<OutboxPublisherService>();
builder.Services.AddHostedService<AuditEntryRequestedConsumer>();
builder.Services.AddHostedService<ExpiredCleanupWorker>();

// --- Authentication / Authorization ---
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer();

// RsaKeyProvider ve JwtSigningOptions'i DI konteynerini ikinci kez insa etmeden
// (BuildServiceProvider) enjekte etmek icin PostConfigure yerine tip bazli
// Configure asiri yuklemesi kullanilir.
builder.Services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
    .Configure<RsaKeyProvider, Microsoft.Extensions.Options.IOptions<JwtSigningOptions>>((options, keyProvider, jwtOptionsAccessor) =>
    {
        var jwtOptions = jwtOptionsAccessor.Value;

        // MapInboundClaims kapali: "role"/"specialties" claim'leri .NET'in uzun
        // varsayilan URI'lerine donusturulmez; JwtTokenService'te uretilen isimlerle
        // birebir eslesir (dokuman §6 claim ornegi).
        options.MapInboundClaims = false;

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtOptions.Audience,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new RsaSecurityKey(keyProvider.Rsa),
            ValidAlgorithms = [SecurityAlgorithms.RsaSha256],
            RoleClaimType = "role",
            NameClaimType = System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub,
            ClockSkew = TimeSpan.FromSeconds(30),
        };
    });

builder.Services.AddAuthorization();

// --- Health ---
builder.Services.AddHealthChecks()
    .AddCheck<DatabaseHealthCheck>("database", tags: ["ready"]);

builder.Services.AddOpenApi();

var app = builder.Build();

app.UseMiddleware<CorrelationMiddleware>();
app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseAuthentication();
app.UseAuthorization();

app.MapOpenApi();
if (app.Environment.IsDevelopment())
{
    app.MapScalarApiReference();
}

app.MapHealthChecks("/health/live", new HealthCheckOptions { Predicate = _ => false });
app.MapHealthChecks("/health/ready", new HealthCheckOptions { Predicate = check => check.Tags.Contains("ready") });

app.MapRegisterCustomer();
app.MapRequestOtp();
app.MapVerifyOtp();
app.MapStaffLogin();
app.MapRefreshToken();
app.MapLogout();
app.MapCreateStaff();
app.MapGetCurrentUser();
app.MapGetAuditLogs();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<IdentityServiceDbContext>();
    await db.Database.MigrateAsync();
    await IdentitySeed.EnsureRolesAsync(scope.ServiceProvider);
}

app.Run();

/// <summary>Test projelerinin <c>WebApplicationFactory&lt;Program&gt;</c> ile erisebilmesi icin.</summary>
public sealed partial class Program;
