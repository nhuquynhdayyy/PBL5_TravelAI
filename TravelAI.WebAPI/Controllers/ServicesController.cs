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
    private readonly IAuditLogService _auditLogService;

    public ServicesController(IServiceService service, IWebHostEnvironment env, IAuditLogService auditLogService)
    {
        _service = service;
        _env = env;
        _auditLogService = auditLogService;
    }

    [HttpGet("public")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPublic([FromQuery] int? type)
    {
        var data = await _service.GetAllAsync(type);
        return Ok(data);
    }

    [HttpGet("search")]
    [AllowAnonymous]
    public async Task<IActionResult> SearchServices([FromQuery] ServiceFilterRequest request)
    {
        var result = await _service.FilterServicesAsync(request);
        return Ok(result);
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
            
            // Log audit
            if (result.ServiceId > 0)
            {
                await _auditLogService.LogAsync(userId, "CREATE", "Services", result.ServiceId);
            }
            
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
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        try
        {
            var success = await _service.UpdateAsync(id, request, _env.WebRootPath);
            if (!success)
            {
                return BadRequest(new { message = "Cap nhat that bai." });
            }

            // Log audit
            await _auditLogService.LogAsync(userId, "UPDATE", "Services", id);

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

    // ==================== NEW FILTERING ENDPOINTS ====================

    /// <summary>
    /// Filter services with advanced criteria
    /// </summary>
    /// <param name="request">Filter parameters</param>
    /// <returns>Filtered services with pagination</returns>
    [HttpPost("filter")]
    [AllowAnonymous]
    public async Task<IActionResult> FilterServices([FromBody] ServiceFilterRequest request)
    {
        try
        {
            var result = await _service.FilterServicesAsync(request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Get filter metadata (available options for filtering)
    /// </summary>
    /// <param name="serviceType">Optional service type to get specific metadata</param>
    /// <returns>Filter metadata</returns>
    [HttpGet("filter-metadata")]
    [AllowAnonymous]
    public async Task<IActionResult> GetFilterMetadata([FromQuery] string? serviceType = null)
    {
        try
        {
            var metadata = await _service.GetFilterMetadataAsync(serviceType);
            return Ok(metadata);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
