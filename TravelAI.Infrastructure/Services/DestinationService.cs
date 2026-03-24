using Microsoft.EntityFrameworkCore;
using TravelAI.Application.Interfaces;
using TravelAI.Application.DTOs.Destination;
using TravelAI.Domain.Entities;
using TravelAI.Domain.Interfaces;
using TravelAI.Infrastructure.Persistence; 

namespace TravelAI.Infrastructure.Services; 

public class DestinationService : IDestinationService 
{
    private readonly IGenericRepository<Destination> _repository;
    private readonly ApplicationDbContext _context;

    public DestinationService(IGenericRepository<Destination> repository, ApplicationDbContext context)
    {
        _repository = repository;
        _context = context;
    }

    public async Task<IEnumerable<DestinationDto>> GetAllAsync()
    {
        var data = await _repository.GetAllAsync();
        return data.Select(x => new DestinationDto(x.DestinationId, x.Name, x.Description, x.ImageUrl));
    }

    public async Task<DestinationDto?> GetByIdAsync(int id)
    {
        var x = await _repository.GetByIdAsync(id);
        if (x == null) return null;
        
        return new DestinationDto(x.DestinationId, x.Name, x.Description, x.ImageUrl);
    }

    public async Task<DestinationDto> CreateAsync(CreateDestinationRequest request, string webRootPath)
    {
        // 1. Xử lý lưu File ảnh vào wwwroot/uploads
        string folderPath = Path.Combine(webRootPath, "uploads");
        if (!Directory.Exists(folderPath)) Directory.CreateDirectory(folderPath);

        string fileName = Guid.NewGuid().ToString() + Path.GetExtension(request.Image.FileName);
        string filePath = Path.Combine(folderPath, fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await request.Image.CopyToAsync(stream);
        }

        // 2. Lưu vào Database
        var destination = new Destination
        {
            Name = request.Name,
            Description = request.Description,
            ImageUrl = $"/uploads/{fileName}" // Lưu đường dẫn tương đối
        };

        await _repository.AddAsync(destination);
        await _context.SaveChangesAsync();  

        return new DestinationDto(destination.DestinationId, destination.Name, destination.Description, destination.ImageUrl);
    }
}