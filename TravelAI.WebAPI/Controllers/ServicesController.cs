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

    [HttpGet("public")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPublic([FromQuery] int? type)
    {
        var data = await _service.GetAllAsync(type);
        return Ok(data);
    }

    [HttpGet("my-services")]
    [Authorize(Roles = "Partner")]
    public async Task<IActionResult> GetMyServices()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var data = await _service.GetPartnerServicesAsync(userId);
        return Ok(data);
    }

    [HttpGet("admin-all")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AdminGetAll()
    {
        var data = await _service.AdminGetAllServicesAsync();
        return Ok(data);
    }

    [HttpPatch("{id}/toggle")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ToggleStatus(int id)
    {
        var success = await _service.ToggleStatusAsync(id);
        if (!success)
        {
            return NotFound();
        }

        return Ok(new { success = true, message = "Da cap nhat trang thai." });
    }

    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _service.GetByIdAsync(id);
        if (result == null)
        {
            return NotFound();
        }

        if (result.IsActive)
        {
            return Ok(result);
        }

        if (!User.Identity?.IsAuthenticated ?? true)
        {
            return NotFound();
        }

        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var userId = int.TryParse(userIdClaim, out var parsedUserId) ? parsedUserId : 0;
        var canAccessInactive =
            string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase) ||
            (string.Equals(role, "Partner", StringComparison.OrdinalIgnoreCase) && result.PartnerId == userId);

        return canAccessInactive ? Ok(result) : NotFound();
    }

    [HttpPost]
    [Authorize(Roles = "Partner,Admin")]
    public async Task<IActionResult> CreateService([FromForm] CreateServiceRequest request)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        try
        {
            var result = await _service.CreateAsync(userId, request, _env.WebRootPath);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Partner,Admin")]
    public async Task<IActionResult> UpdateService(int id, [FromForm] CreateServiceRequest request)
    {
        try
        {
            var success = await _service.UpdateAsync(id, request, _env.WebRootPath);
            if (!success)
            {
                return BadRequest(new { message = "Cap nhat that bai." });
            }

            return Ok(new
            {
                success = true,
                message = "Da cap nhat thanh cong. Dich vu da quay lai trang thai cho duyet."
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Partner,Admin")]
    public async Task<IActionResult> DeleteService(int id)
    {
        var success = await _service.DeleteAsync(id, _env.WebRootPath);
        return success ? Ok(new { message = "Da xoa." }) : NotFound();
    }

    [HttpGet("{id}/review-summary")]
    [AllowAnonymous]
    public async Task<IActionResult> GetReviewSummary(int id)
    {
        var summary = await _service.GetReviewSummaryAsync(id);
        if (summary == null)
        {
            return NotFound(new { message = "Service not found" });
        }

        return Ok(new { summary });
    }
}
