using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TravelAI.Application.DTOs.Service;
using TravelAI.Application.Interfaces;

namespace TravelAI.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ServicesController : ControllerBase
{
    private readonly IServiceService _service;
    private readonly IWebHostEnvironment _env;

    // 1. HÀM KHỞI TẠO (Constructor) - Phải trùng tên Class và KHÔNG có kiểu trả về
    public ServicesController(IServiceService service, IWebHostEnvironment env)
    {
        _service = service;
        _env = env;
    }

    // 2. DÀNH CHO CUSTOMER (TRANG PUBLIC)
    // URL: GET /api/services/public?type=0
    [HttpGet("public")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPublic([FromQuery] int? type)
    {
        var data = await _service.GetAllAsync(type);
        return Ok(data);
    }

    // 3. DÀNH CHO PARTNER (QUẢN LÝ DỊCH VỤ CỦA TÔI)
    // URL: GET /api/services/my-services
    [HttpGet("my-services")]
    [Authorize(Roles = "Partner")]
    public async Task<IActionResult> GetMyServices()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var data = await _service.GetPartnerServicesAsync(userId);
        return Ok(data);
    }

    // 4. DÀNH CHO ADMIN (QUẢN TRỊ TOÀN HỆ THỐNG)
    // URL: GET /api/services/admin-all
    [HttpGet("admin-all")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AdminGetAll()
    {
        var data = await _service.AdminGetAllServicesAsync();
        return Ok(data);
    }

    // 5. ADMIN DUYỆT HOẶC KHÓA DỊCH VỤ
    // URL: PATCH /api/services/1/toggle
    [HttpPatch("{id}/toggle")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ToggleStatus(int id)
    {
        var success = await _service.ToggleStatusAsync(id);
        if (!success) return NotFound();
        return Ok(new { success = true, message = "Đã cập nhật trạng thái!" });
    }

    // 6. XEM CHI TIẾT DỊCH VỤ (DÙNG CHUNG)
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var res = await _service.GetByIdAsync(id);
        return res == null ? NotFound() : Ok(res);
    }

    // 7. TẠO MỚI DỊCH VỤ (DÀNH CHO PARTNER)
    [HttpPost]
    [Authorize(Roles = "Partner,Admin")]
    public async Task<IActionResult> CreateService([FromForm] CreateServiceRequest request)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var result = await _service.CreateAsync(userId, request, _env.WebRootPath);
        return Ok(result);
    }

    // 8. CẬP NHẬT DỊCH VỤ (CHỈ CHỦ SỞ HỮU MỚI ĐƯỢC SỬA)
    [HttpPut("{id}")]
    [Authorize(Roles = "Partner,Admin")]
    public async Task<IActionResult> UpdateService(int id, [FromForm] CreateServiceRequest request)
    {
        var success = await _service.UpdateAsync(id, request, _env.WebRootPath);
        if (!success) return BadRequest(new { message = "Cập nhật thất bại!" });
        return Ok(new { success = true, message = "Đã cập nhật thành công!" });
    }

    // 9. XÓA DỊCH VỤ
    [HttpDelete("{id}")]
    [Authorize(Roles = "Partner,Admin")]
    public async Task<IActionResult> DeleteService(int id)
    {
        var success = await _service.DeleteAsync(id, _env.WebRootPath);
        return success ? Ok(new { message = "Đã xóa!" }) : NotFound();
    }
}