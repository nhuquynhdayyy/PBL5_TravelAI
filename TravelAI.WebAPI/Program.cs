using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using TravelAI.Infrastructure.Persistence;
using TravelAI.Infrastructure.Services; 
using TravelAI.Application.Interfaces;
using TravelAI.Application.Services;
using TravelAI.Domain.Interfaces;     
using TravelAI.Infrastructure.Repositories; 
using TravelAI.Application.Interfaces;
using TravelAI.Infrastructure.Services.AI;
using TravelAI.Infrastructure.ExternalServices;
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

builder.Services.AddHttpClient<GeminiService>();
builder.Services.AddScoped<AIParserService>();
builder.Services.AddScoped<IItineraryService, ItineraryService>();
builder.Services.AddScoped<PromptBuilder>();

var app = builder.Build();

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