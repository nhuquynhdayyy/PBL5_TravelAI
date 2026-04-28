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

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        var result = await _authService.RegisterAsync(request);
        return result != null ? Ok(result) : BadRequest("Email already exists");
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        try
        {
            var result = await _authService.LoginAsync(request);
            return result != null ? Ok(result) : Unauthorized("Invalid email or password");
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
    }
}