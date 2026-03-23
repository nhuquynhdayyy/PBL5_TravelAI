using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelAI.Infrastructure.Persistence;
using TravelAI.Domain.Entities;

namespace TravelAI.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DestinationsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public DestinationsController(ApplicationDbContext context)
    {
        _context = context;
    }

    // GET: api/destinations
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Destination>>> GetDestinations()
    {
        return await _context.Destinations.ToListAsync();
    }

    // POST: api/destinations
    [HttpPost]
    public async Task<ActionResult<Destination>> CreateDestination(Destination destination)
    {
        _context.Destinations.Add(destination);
        await _context.SaveChangesAsync();
        return Ok(destination);
    }
}