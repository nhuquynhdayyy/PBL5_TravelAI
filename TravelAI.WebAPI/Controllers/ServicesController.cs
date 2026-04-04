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

    public ServicesController(IServiceService service, IWebHostEnvironment env)
    {
        _service = service;
        _env = env;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? type) 
        => Ok(await _service.GetAllAsync(type));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var res = await _service.GetByIdAsync(id);
        return res == null ? NotFound() : Ok(res);
    }

    [HttpPost]
    [Authorize(Roles = "Partner,Admin")] // Chỉ Partner hoặc Admin mới được tạo
    public async Task<IActionResult> Create([FromForm] CreateServiceRequest request)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var result = await _service.CreateAsync(userId, request, _env.WebRootPath);
        return Ok(result);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Partner,Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var success = await _service.DeleteAsync(id, _env.WebRootPath);
        return success ? Ok(new { message = "Deleted" }) : NotFound();
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Partner,Admin")]
    public async Task<IActionResult> Update(int id, [FromForm] CreateServiceRequest request)
    {
        // Quan trọng: Truyền đúng request vào Service
        var success = await _service.UpdateAsync(id, request, _env.WebRootPath);
        if (!success) return BadRequest(new { message = "Không thể cập nhật dịch vụ" });
        return Ok(new { success = true, message = "Cập nhật thành công" });
    }
}