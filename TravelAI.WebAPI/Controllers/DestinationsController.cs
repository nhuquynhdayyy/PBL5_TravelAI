using Microsoft.AspNetCore.Mvc;
using TravelAI.Application.Interfaces;
using TravelAI.Application.DTOs; 
using Microsoft.AspNetCore.Authorization; 
using TravelAI.Application.DTOs.Destination;

namespace TravelAI.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DestinationsController : ControllerBase
{
    private readonly IDestinationService _service;
    private readonly IWebHostEnvironment _webHostEnvironment;

    public DestinationsController(IDestinationService service, IWebHostEnvironment webHostEnvironment)
    {
        _service = service;
        _webHostEnvironment = webHostEnvironment;
    }

    // GET: api/destinations
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var data = await _service.GetAllAsync();
        return Ok(new { 
            data = data, 
            message = "Lấy danh sách điểm đến thành công",
            success = true 
        });
    }

    // GET: api/destinations/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var data = await _service.GetByIdAsync(id);
        
        if (data == null) 
            return NotFound(new { success = false, message = "Không tìm thấy điểm đến" });

        return Ok(new { 
            data = data, 
            success = true 
        });
    }

    [HttpPost]
    [Authorize(Roles = "Admin")] 
    public async Task<IActionResult> Create([FromForm] CreateDestinationRequest request)
    {
        try 
        {
            var webRootPath = _webHostEnvironment.WebRootPath;
            var result = await _service.CreateAsync(request, webRootPath);
            return Ok(new { success = true, data = result, message = "Thêm điểm đến thành công!" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromForm] UpdateDestinationRequest request)
    {
        var success = await _service.UpdateAsync(id, request, _webHostEnvironment.WebRootPath);
        if (!success) return NotFound();
        return Ok(new { success = true, message = "Cập nhật thành công!" });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var success = await _service.DeleteAsync(id, _webHostEnvironment.WebRootPath);
        if (!success) return NotFound();
        return Ok(new { success = true, message = "Xóa thành công!" });
    }
}