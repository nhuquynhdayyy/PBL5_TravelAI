using MediatR;
using Microsoft.AspNetCore.Mvc;
using TravelAI.Application.Features.Spots.Queries;
using TravelAI.Domain.Entities; 
using TravelAI.Application.Abstractions; 

namespace TravelAI.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SpotsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IApplicationDbContext _context;

    public SpotsController(IMediator mediator, IApplicationDbContext context)
    {
        _mediator = mediator;
        _context = context;
    }

    // GET: api/spots
    [HttpGet]
public async Task<IActionResult> GetSpots([FromQuery] GetSpotsQuery query)
{
    var result = await _mediator.Send(query);

    // Trả về Ok(200) thay vì NotFound(404)
   return Ok(new { success = true, data = result });
}

    // DTO nhận form
    public class CreateSpotCommand
    {
        public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public int DestinationId { get; set; }
    public double? Latitude { get; set; }      // Phù hợp với kiểu Float/Decimal trong DB
    public double? Longitude { get; set; }
    public string? AvgTimeSpent { get; set; }  // Ví dụ: "2 hours"
    public string? OpeningHours { get; set; }  // Ví dụ: "08:00 - 22:00"
    public IFormFile? Image { get; set; }
}

    // POST: api/spots
    [HttpPost]
public async Task<IActionResult> Create([FromForm] CreateSpotCommand command)
{
    try 
    {
        string imageUrl = "";

        // --- LOGIC XỬ LÝ LƯU ẢNH ---
        if (command.Image != null && command.Image.Length > 0)
        {
            // Tạo đường dẫn thư mục wwwroot/uploads
            var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
            if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);

            // Tạo tên file duy nhất để không bị trùng (dùng GUID)
            var fileName = Guid.NewGuid().ToString() + Path.GetExtension(command.Image.FileName);
            var filePath = Path.Combine(uploadsFolder, fileName);

            // Lưu file vào ổ cứng
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await command.Image.CopyToAsync(stream);
            }

            // Đường dẫn lưu vào DB để sau này Frontend truy cập
            imageUrl = "/uploads/" + fileName;
        }

        // --- LƯU VÀO BẢNG TOURISTSPOTS ---
        var newSpot = new TouristSpot
        {
            Name = command.Name,
            Description = command.Description,
            DestinationId = command.DestinationId,
            Latitude = command.Latitude ?? 0,
            Longitude = command.Longitude ?? 0,
            AvgTimeSpent = int.TryParse(command.AvgTimeSpent, out var time) ? time : 0,
            OpeningHours = command.OpeningHours,
            ImageUrl = imageUrl // Lưu đường dẫn ảnh vào cột ImageUrl
        };

        _context.TouristSpots.Add(newSpot);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Thêm địa danh thành công!" });
    }
    catch (Exception ex)
    {
        return StatusCode(500, new { success = false, message = "Lỗi server: " + ex.Message });
    }
    }
    }