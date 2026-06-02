using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using TravelAI.Application.DTOs.Auth;
using TravelAI.Application.DTOs.Notification;
using TravelAI.Application.Helpers;
using TravelAI.Application.Interfaces;
using TravelAI.Domain.Entities;
using TravelAI.Infrastructure.Persistence;

namespace TravelAI.Infrastructure.Services;

public class AuthService
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _config;
    private readonly INotificationService _notificationService;

    public AuthService(
        ApplicationDbContext context,
        IConfiguration config,
        INotificationService notificationService)
    {
        _context = context;
        _config = config;
        _notificationService = notificationService;
    }

    public async Task<AuthResponse?> RegisterAsync(RegisterRequest request)
    {
        if (await _context.Users.AnyAsync(u => u.Email == request.Email))
        {
            return null;
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();
        User? createdUser = null;

        try
        {
            var user = new User
            {
                Email = request.Email,
                FullName = request.FullName,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                RoleId = request.IsPartner ? 2 : 3,
                CreatedAt = DateTimeHelper.Now
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            createdUser = user;

            if (request.IsPartner)
            {
                _context.PartnerProfiles.Add(new PartnerProfile
                {
                    UserId = user.UserId,
                    BusinessName = request.FullName
                });

                await _context.SaveChangesAsync();
            }

            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }

        if (createdUser != null)
        {
            await _notificationService.CreateAsync(new CreateNotificationRequest
            {
                UserId = createdUser.UserId,
                Title = "Dang ky tai khoan thanh cong",
                Message = "Tai khoan TravelAI cua ban da duoc tao thanh cong.",
                Type = "Account"
            });

            await _notificationService.NotifyAdminsAsync(
                "Tai khoan moi vua dang ky",
                $"{createdUser.FullName} ({createdUser.Email}) vua dang ky he thong.",
                request.IsPartner ? "Partner" : "User");
        }

        return await LoginAsync(new LoginRequest(request.Email, request.Password));
    }

    public async Task<AuthResponse?> LoginAsync(LoginRequest request)
    {
        var user = await _context.Users.Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Email == request.Email);

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return null;
        }

        if (!user.IsActive)
        {
            throw new UnauthorizedAccessException("Tai khoan cua ban da bi khoa. Vui long lien he quan tri vien.");
        }

        var token = GenerateJwtToken(user);

        await _notificationService.CreateAsync(new CreateNotificationRequest
        {
            UserId = user.UserId,
            Title = "Dang nhap thanh cong",
            Message = $"Tai khoan cua ban vua dang nhap luc {DateTimeHelper.Now:dd/MM/yyyy HH:mm}.",
            Type = "Account"
        });

        return new AuthResponse(token, user.FullName, user.Email, user.Role.RoleName);
    }

    private string GenerateJwtToken(User user)
    {
        var claims = new List<Claim> {
            new(ClaimTypes.NameIdentifier, user.UserId.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Name, user.FullName),
            new(ClaimTypes.Role, user.Role.RoleName)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            _config["Jwt:Issuer"],
            _config["Jwt:Audience"],
            claims,
            expires: DateTimeHelper.Now.AddDays(7),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
