using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TravelAI.Application.DTOs.User;
using TravelAI.Infrastructure.Persistence;
using TravelAI.Infrastructure.Services; // Đảm bảo trỏ đúng vào Infrastructure

namespace TravelAI.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize] // Bắt buộc phải có Token JWT
public class UsersController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IWebHostEnvironment _webHostEnvironment;
    private readonly UserService _userService;

    public UsersController(ApplicationDbContext context, IWebHostEnvironment webHostEnvironment, UserService userService)
    {
        _context = context;
        _webHostEnvironment = webHostEnvironment;
        _userService = userService;
    }

    // 1. LẤY THÔNG TIN CÁ NHÂN (GET)
    [HttpGet("me")]
    public async Task<IActionResult> GetMyProfile()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized("Token không hợp lệ");

        int userId = int.Parse(userIdClaim.Value);

        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.UserId == userId);

        if (user == null) return NotFound("Người dùng không tồn tại");

        // Trả về dữ liệu kèm theo AvatarUrl
        return Ok(new
        {
            user.FullName,
            user.Email,
            user.Phone,
            RoleName = user.Role.RoleName,
            user.AvatarUrl, // Đường dẫn ảnh đại diện
            user.CreatedAt
        });
    }

    // 2. CẬP NHẬT THÔNG TIN CÁ NHÂN (PUT)
    [HttpPut("update-profile")]
    public async Task<IActionResult> UpdateProfile([FromForm] UpdateUserRequest request)
    {
        try
        {
            // Lấy UserId từ Token
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            
            // Đường dẫn thư mục wwwroot để lưu ảnh
            var webRootPath = _webHostEnvironment.WebRootPath;
            
            // Gọi Service xử lý logic lưu file và DB
            var success = await _userService.UpdateProfileAsync(userId, request, webRootPath);
            
            if (success) 
                return Ok(new { success = true, message = "Cập nhật thành công!" });
            
            return BadRequest(new { success = false, message = "Không thể cập nhật thông tin." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }
}