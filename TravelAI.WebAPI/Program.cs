using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using TravelAI.Infrastructure.Persistence;
using TravelAI.Infrastructure.Persistence.Interceptors;
using TravelAI.Infrastructure.Services; 
using TravelAI.Application.Interfaces;
using TravelAI.Application.Services;
using TravelAI.Domain.Interfaces;     
using TravelAI.Infrastructure.Repositories; 
using TravelAI.Infrastructure.Services.AI;
using TravelAI.Infrastructure.ExternalServices;
using TravelAI.Application.Services.AI;
using TravelAI.Infrastructure.BackgroundJobs;
using TravelAI.Infrastructure.Application.Services;

var builder = WebApplication.CreateBuilder(args);

// --- 1. Cấu hình SQL SERVER & DB CONTEXT ---
builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"));
    // Suppress pending model changes warning (we handle schema via SQL scripts)
    options.ConfigureWarnings(warnings => 
        warnings.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
    // Add interceptor to automatically set CreatedAt with Vietnam timezone
    options.AddInterceptors(new VietnamTimezoneInterceptor());
});

// --- 2. Cấu hình JWT AUTHENTICATION ---
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options => {
        options.TokenValidationParameters = new TokenValidationParameters {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
        };
    });

// --- 3. ĐĂNG KÝ SERVICES ---
builder.Services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
builder.Services.AddScoped<IDestinationService, DestinationService>();
builder.Services.AddScoped<IPreferenceService, PreferenceService>();
builder.Services.AddScoped<AuthService>();
// --- 4. Cấu hình CORS ---
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        policy => policy.WithOrigins("http://localhost:5173")
                        .AllowAnyMethod()
                        .AllowAnyHeader());
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddScoped<TravelAI.Infrastructure.Services.UserService>();
builder.Services.AddScoped<ISpotService, SpotService>();
builder.Services.AddScoped<IServiceService, ServiceService>();
builder.Services.AddScoped<IAvailabilityService, AvailabilityService>();
builder.Services.AddScoped<IPricingService, PricingService>();
builder.Services.AddScoped<IBookingService, BookingService>();
builder.Services.AddScoped<IPartnerOrderService, PartnerOrderService>();
builder.Services.AddScoped<IEmailService, TravelAI.Infrastructure.ExternalServices.Mail.SendGridEmailService>();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();

builder.Services.AddHttpClient<GeminiService>();
builder.Services.AddScoped<AIParserService>();
builder.Services.AddScoped<ISpotScoringService, TravelAI.Application.Services.SpotScoringService>();
builder.Services.AddScoped<IItineraryService, ItineraryService>();
builder.Services.AddScoped<PromptBuilder>();

// --- 5. ĐĂNG KÝ BACKGROUND JOBS ---
builder.Services.AddHostedService<OrderApprovalTimeoutJob>();
builder.Services.AddHostedService<OrderApprovalReminderJob>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var logger    = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    // Chạy migration tự động
    dbContext.Database.Migrate();

    // Patch schema thủ công (tương thích migration cũ)
    dbContext.Database.ExecuteSqlRaw(
        """
        IF COL_LENGTH('Reviews', 'ReplyText') IS NULL
        BEGIN
            ALTER TABLE [Reviews]
            ADD [ReplyText] nvarchar(1000) NULL;
        END

        IF NOT EXISTS (
            SELECT 1
            FROM sys.indexes
            WHERE name = 'IX_Reviews_ServiceId_UserId'
              AND object_id = OBJECT_ID('Reviews')
        )
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM sys.indexes
                WHERE name = 'IX_Reviews_ServiceId'
                  AND object_id = OBJECT_ID('Reviews')
            )
            BEGIN
                DROP INDEX [IX_Reviews_ServiceId] ON [Reviews];
            END

            IF NOT EXISTS (
                SELECT ServiceId, UserId
                FROM Reviews
                GROUP BY ServiceId, UserId
                HAVING COUNT(*) > 1
            )
            BEGIN
                CREATE UNIQUE INDEX [IX_Reviews_ServiceId_UserId]
                ON [Reviews]([ServiceId], [UserId]);
            END
        END
        """);

    // Patch: Add PricingRules table
    dbContext.Database.ExecuteSqlRaw(
        """
        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PricingRules]') AND type in (N'U'))
        BEGIN
            CREATE TABLE [dbo].[PricingRules] (
                [RuleId] INT IDENTITY(1,1) NOT NULL,
                [ServiceId] INT NOT NULL,
                [StartDate] DATETIME2 NOT NULL,
                [EndDate] DATETIME2 NOT NULL,
                [PriceMultiplier] DECIMAL(18,2) NOT NULL,
                [Description] NVARCHAR(500) NULL,
                [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                CONSTRAINT [PK_PricingRules] PRIMARY KEY CLUSTERED ([RuleId] ASC),
                CONSTRAINT [FK_PricingRules_Services_ServiceId] FOREIGN KEY([ServiceId])
                    REFERENCES [dbo].[Services] ([ServiceId])
                    ON DELETE CASCADE
            );

            CREATE NONCLUSTERED INDEX [IX_PricingRules_ServiceId] 
            ON [dbo].[PricingRules]([ServiceId] ASC);

            CREATE NONCLUSTERED INDEX [IX_PricingRules_DateRange] 
            ON [dbo].[PricingRules]([StartDate] ASC, [EndDate] ASC);
        END
        """);

    // Patch: Add IsApprovedByPartner and ApprovedAt to Bookings table
    dbContext.Database.ExecuteSqlRaw(
        """
        IF COL_LENGTH('Bookings', 'IsApprovedByPartner') IS NULL
        BEGIN
            ALTER TABLE [Bookings]
            ADD [IsApprovedByPartner] BIT NOT NULL DEFAULT 0;
        END

        IF COL_LENGTH('Bookings', 'ApprovedAt') IS NULL
        BEGIN
            ALTER TABLE [Bookings]
            ADD [ApprovedAt] DATETIME2 NULL;
        END

        IF COL_LENGTH('Bookings', 'ApprovalDeadline') IS NULL
        BEGIN
            ALTER TABLE [Bookings]
            ADD [ApprovalDeadline] DATETIME2 NULL;
        END
        """);

    // Seed dữ liệu mẫu (chỉ chạy khi DB còn trống)
    try
    {
        await DbInitializer.SeedAsync(dbContext);
        logger.LogInformation("✅ DbInitializer: Seed dữ liệu hoàn tất.");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "❌ DbInitializer: Lỗi khi seed dữ liệu.");
    }
}

// --- 5. Cấu hình Pipeline ---
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "TravelAI API V1");
        c.RoutePrefix = string.Empty;
    });
}

app.UseStaticFiles();

// CORS phải đặt trước Authentication
app.UseCors("AllowReactApp");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
