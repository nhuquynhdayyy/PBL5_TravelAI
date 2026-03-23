// using Microsoft.EntityFrameworkCore;
// using TravelAI.Application.Services;
// using TravelAI.Domain.Interfaces;
// using TravelAI.Infrastructure.Persistence;
// using TravelAI.Infrastructure.Repositories;

// namespace TravelAI.WebAPI.Extensions;

// public static class DependencyInjection
// {
//     public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
//     {
//         services.AddDbContext<ApplicationDbContext>(options =>
//             options.UseSqlServer(configuration.GetConnectionString("DefaultConnection")));

//         services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
//         return services;
//     }

//     public static IServiceCollection AddApplication(this IServiceCollection services)
//     {
//         // Đăng ký các Service xử lý Logic
//         services.AddScoped<IDestinationService, DestinationService>();
//         return services;
//     }
// }