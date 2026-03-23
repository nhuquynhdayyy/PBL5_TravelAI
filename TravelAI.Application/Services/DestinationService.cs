using TravelAI.Application.Interfaces;
using TravelAI.Application.DTOs.Destination;
using TravelAI.Domain.Interfaces;
using TravelAI.Domain.Entities;

namespace TravelAI.Application.Services;

public class DestinationService : IDestinationService 
{
    private readonly IGenericRepository<Destination> _repository;

    public DestinationService(IGenericRepository<Destination> repository)
    {
        _repository = repository;
    }

    public async Task<IEnumerable<DestinationDto>> GetActiveDestinationsAsync()
    {
        var data = await _repository.GetAllAsync();
        return data.Select(x => new DestinationDto(x.DestinationId, x.Name, x.Description, x.ImageUrl));
    }
}