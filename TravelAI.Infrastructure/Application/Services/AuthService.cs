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
    private readonly IEmailService _emailService;

    public AuthService(
        ApplicationDbContext context,
        IConfiguration config,
        INotificationService notificationService,
        IEmailService emailService)
    {
        _context = context;
        _config = config;
        _notificationService = notificationService;
        _emailService = emailService;
    }

    // ─── ĐĂNG KÝ ─────────────────────────────────────────────────────────────
    public async Task<object?> RegisterAsync(RegisterRequest request)
    {
        if (await _context.Users.AnyAsync(u => u.Email == request.Email))
            return null;

        await using var transaction = await _context.Database.BeginTransactionAsync();
        User? createdUser = null;

        try
        {
            var verificationToken = Guid.NewGuid().ToString("N");

            var user = new User
            {
                Email = request.Email,
                FullName = request.FullName,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                RoleId = request.IsPartner ? 2 : 3,
                CreatedAt = DateTimeHelper.Now,
                IsVerified = false,
                VerificationToken = verificationToken,
                VerificationTokenExpiry = DateTimeHelper.Now.AddHours(24)
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
            // Gửi mail xác thực
            var frontendBase = _config["Email:FrontendBaseUrl"] ?? "http://localhost:5173";
            var verifyLink = $"{frontendBase}/verify-email?token={createdUser.VerificationToken}";

            try
            {
                await _emailService.SendVerificationEmailAsync(
                    createdUser.Email,
                    createdUser.FullName,
                    verifyLink);
            }
            catch (Exception ex)
            {
                // Không để lỗi gửi mail làm fail registration
                Console.WriteLine($"[EMAIL-ERROR] Gửi mail xác thực thất bại: {ex.Message}");
            }

            await _notificationService.NotifyAdminsAsync(
                "Tài khoản mới vừa đăng ký",
                $"{createdUser.FullName} ({createdUser.Email}) vừa đăng ký hệ thống.",
                request.IsPartner ? "Partner" : "User");
        }

        // Trả về message yêu cầu xác thực thay vì token
        return new { message = "Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản." };
    }

    // ─── ĐĂNG NHẬP ───────────────────────────────────────────────────────────
    public async Task<AuthResponse?> LoginAsync(LoginRequest request)
    {
        var user = await _context.Users.Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Email == request.Email);

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return null;

        if (!user.IsVerified)
            throw new InvalidOperationException("Tài khoản chưa được xác thực. Vui lòng kiểm tra email và xác thực tài khoản.");

        if (!user.IsActive)
            throw new UnauthorizedAccessException("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.");

        var token = GenerateJwtToken(user);

        await _notificationService.CreateAsync(new CreateNotificationRequest
        {
            UserId = user.UserId,
            Title = "Đăng nhập thành công",
            Message = $"Tài khoản của bạn vừa đăng nhập lúc {DateTimeHelper.Now:dd/MM/yyyy HH:mm}.",
            Type = "Account"
        });

        return new AuthResponse(token, user.FullName, user.Email, user.Role.RoleName);
    }

    // ─── XÁC THỰC EMAIL ──────────────────────────────────────────────────────
    public async Task<bool> VerifyEmailAsync(string token)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u =>
            u.VerificationToken == token &&
            u.VerificationTokenExpiry > DateTimeHelper.Now);

        if (user == null) return false;

        user.IsVerified = true;
        user.VerificationToken = null;
        user.VerificationTokenExpiry = null;

        await _context.SaveChangesAsync();

        // Thông báo chào mừng
        try
        {
            await _notificationService.CreateAsync(new CreateNotificationRequest
            {
                UserId = user.UserId,
                Title = "Xác thực email thành công",
                Message = "Tài khoản TravelAI của bạn đã được kích hoạt. Chào mừng bạn!",
                Type = "Account"
            });
        }
        catch { /* không block */ }

        return true;
    }

    // ─── QUÊN MẬT KHẨU ───────────────────────────────────────────────────────
    public async Task<bool> ForgotPasswordAsync(string email)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null) return true; // Không tiết lộ user có tồn tại hay không

        // Vô hiệu hoá token cũ chưa dùng
        var oldTokens = await _context.PasswordResetTokens
            .Where(t => t.UserId == user.UserId && !t.IsUsed)
            .ToListAsync();
        _context.PasswordResetTokens.RemoveRange(oldTokens);

        var resetToken = new Domain.Entities.PasswordResetToken
        {
            UserId = user.UserId,
            Token = Guid.NewGuid().ToString("N"),
            ExpiresAt = DateTimeHelper.Now.AddMinutes(15),
            IsUsed = false,
            CreatedAt = DateTimeHelper.Now
        };

        _context.PasswordResetTokens.Add(resetToken);
        await _context.SaveChangesAsync();

        var frontendBase = _config["Email:FrontendBaseUrl"] ?? "http://localhost:5173";
        var resetLink = $"{frontendBase}/reset-password?token={resetToken.Token}";

        try
        {
            await _emailService.SendPasswordResetEmailAsync(user.Email, user.FullName, resetLink);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[EMAIL-ERROR] Gửi mail reset password thất bại: {ex.Message}");
        }

        return true;
    }

    // ─── ĐẶT LẠI MẬT KHẨU ───────────────────────────────────────────────────
    public async Task<bool> ResetPasswordAsync(string token, string newPassword)
    {
        var resetToken = await _context.PasswordResetTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t =>
                t.Token == token &&
                !t.IsUsed &&
                t.ExpiresAt > DateTimeHelper.Now);

        if (resetToken == null) return false;

        resetToken.User.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        resetToken.IsUsed = true;

        await _context.SaveChangesAsync();
        return true;
    }


    // ─── PRIVATE ─────────────────────────────────────────────────────────────
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

