using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using TravelAI.Infrastructure.Persistence;
using TravelAI.Infrastructure.Services; 
using TravelAI.Application.Interfaces;
using TravelAI.Application.Services;
using TravelAI.Domain.Interfaces;     
using TravelAI.Infrastructure.Repositories; 
using TravelAI.Infrastructure.Services.AI;
using TravelAI.Infrastructure.ExternalServices;
using TravelAI.Infrastructure.ExternalServices.Payment;
using TravelAI.Application.Services.AI;

var builder = WebApplication.CreateBuilder(args);

// --- 1. Cấu hình SQL SERVER & DB CONTEXT ---
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

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
builder.Services.AddScoped<IBookingService, BookingService>();
builder.Services.AddScoped<IAIAnalyticsService, AIAnalyticsService>();

builder.Services.Configure<VnPayOptions>(builder.Configuration.GetSection("VnPay"));
builder.Services.AddHttpClient<IPaymentService, VnPayService>();
builder.Services.Configure<MomoOptions>(builder.Configuration.GetSection("Momo"));
builder.Services.AddHttpClient<IMomoService, MomoService>();
builder.Services.AddHttpClient<GeminiService>();
builder.Services.AddHttpClient<WeatherService>();
builder.Services.AddScoped<AIParserService>();
builder.Services.AddScoped<ISpotScoringService, TravelAI.Application.Services.SpotScoringService>();
builder.Services.AddScoped<IItineraryService, ItineraryService>();
builder.Services.AddScoped<PromptBuilder>();

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

        IF COL_LENGTH('Payments', 'Provider') IS NULL
        BEGIN
            ALTER TABLE [Payments]
            ADD [Provider] nvarchar(20) NOT NULL CONSTRAINT [DF_Payments_Provider] DEFAULT N'';
        END

        IF COL_LENGTH('Payments', 'Status') IS NULL
        BEGIN
            ALTER TABLE [Payments]
            ADD [Status] int NOT NULL CONSTRAINT [DF_Payments_Status] DEFAULT 1;
        END

        IF COL_LENGTH('Payments', 'CreatedAt') IS NULL
        BEGIN
            ALTER TABLE [Payments]
            ADD [CreatedAt] datetime2 NOT NULL CONSTRAINT [DF_Payments_CreatedAt] DEFAULT SYSUTCDATETIME();
        END

        IF COL_LENGTH('Payments', 'PaidAt') IS NULL
        BEGIN
            ALTER TABLE [Payments]
            ADD [PaidAt] datetime2 NULL;
        END

        UPDATE [Payments]
        SET [Provider] = [Method]
        WHERE ([Provider] IS NULL OR [Provider] = N'')
          AND COL_LENGTH('Payments', 'Method') IS NOT NULL;

        UPDATE [Payments]
        SET [Status] = 2,
            [PaidAt] = [PaymentTime],
            [CreatedAt] = [PaymentTime]
        WHERE [Status] = 1
          AND COL_LENGTH('Payments', 'PaymentTime') IS NOT NULL
          AND [PaymentTime] > '1900-01-01';

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
app.UseCors("AllowReactApp");

app.UseHttpsRedirection();
app.UseCors(p => p.AllowAnyHeader().AllowAnyMethod().WithOrigins("http://localhost:5173"));

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
