using Microsoft.AspNetCore.Mvc;
using TravelAI.Application.DTOs.Auth;
using TravelAI.Infrastructure.Services;

namespace TravelAI.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;
    public AuthController(AuthService authService) => _authService = authService;

    // POST /api/auth/register
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        var result = await _authService.RegisterAsync(request);
        if (result == null)
            return BadRequest(new { message = "Email đã tồn tại trong hệ thống." });

        return Ok(result);
    }

    // POST /api/auth/login
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        try
        {
            var result = await _authService.LoginAsync(request);
            return result != null
                ? Ok(result)
                : Unauthorized(new { message = "Email hoặc mật khẩu không đúng." });
        }
        catch (InvalidOperationException ex)
        {
            // Chưa xác thực email
            return StatusCode(403, new { message = ex.Message, code = "EMAIL_NOT_VERIFIED" });
        }
        catch (UnauthorizedAccessException ex)
        {
            // Tài khoản bị khóa
            return StatusCode(403, new { message = ex.Message, code = "ACCOUNT_DISABLED" });
        }
    }

    // GET /api/auth/verify-email?token=...
    [HttpGet("verify-email")]
    public async Task<IActionResult> VerifyEmail([FromQuery] string token)
    {
        if (string.IsNullOrWhiteSpace(token))
            return BadRequest(new { message = "Token không hợp lệ." });

        var success = await _authService.VerifyEmailAsync(token);
        if (!success)
            return BadRequest(new { message = "Link xác thực không hợp lệ hoặc đã hết hạn." });

        return Ok(new { message = "Xác thực email thành công! Bạn có thể đăng nhập ngay bây giờ." });
    }

    // POST /api/auth/forgot-password
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { message = "Vui lòng nhập địa chỉ email." });

        await _authService.ForgotPasswordAsync(request.Email);

        // Luôn trả về thành công để không tiết lộ email có tồn tại hay không
        return Ok(new { message = "Nếu email tồn tại trong hệ thống, bạn sẽ nhận được link đặt lại mật khẩu trong vài phút." });
    }

    // POST /api/auth/reset-password
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Token) || string.IsNullOrWhiteSpace(request.NewPassword))
            return BadRequest(new { message = "Thông tin không hợp lệ." });

        if (request.NewPassword.Length < 6)
            return BadRequest(new { message = "Mật khẩu phải có ít nhất 6 ký tự." });

        var success = await _authService.ResetPasswordAsync(request.Token, request.NewPassword);
        if (!success)
            return BadRequest(new { message = "Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn (15 phút)." });

        return Ok(new { message = "Đặt lại mật khẩu thành công! Vui lòng đăng nhập với mật khẩu mới." });
    }
}