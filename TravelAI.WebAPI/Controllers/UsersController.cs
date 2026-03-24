using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TravelAI.Application.DTOs.User;
using TravelAI.Infrastructure.Persistence;

namespace TravelAI.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize] // Bắt buộc phải có Token mới vào được
public class UsersController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public UsersController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMyProfile()
    {
        // 1. Lấy UserId từ Claims trong JWT Token
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized("Token không hợp lệ");

        int userId = int.Parse(userIdClaim.Value);

        // 2. Query Database lấy thông tin User kèm Role
        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.UserId == userId);

        if (user == null) return NotFound("Người dùng không tồn tại");

        // 3. Trả về DTO sạch
        var response = new UserProfileResponse
        {
            FullName = user.FullName,
            Email = user.Email,
            Phone = user.Phone,
            RoleName = user.Role.RoleName,
            CreatedAt = user.CreatedAt
        };

        return Ok(response);
    }
}