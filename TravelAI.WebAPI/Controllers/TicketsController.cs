using System.Globalization;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TravelAI.Application.DTOs.Ticket;
using TravelAI.Application.Interfaces;

namespace TravelAI.WebAPI.Controllers;

[ApiController]
[Route("api/tickets")]
[Authorize]
public class TicketsController : ControllerBase
{
    private readonly IElectronicTicketService _ticketService;

    public TicketsController(IElectronicTicketService ticketService)
    {
        _ticketService = ticketService;
    }

    [HttpGet("my")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> GetMyTickets(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { message = "Vui long dang nhap!" });
        }

        var tickets = await _ticketService.GetByUserAsync(userId.Value, cancellationToken);
        return Ok(tickets);
    }

    [HttpGet("{ticketCode}")]
    [Authorize(Roles = "Customer,Partner,Admin")]
    public async Task<IActionResult> GetByCode(string ticketCode, CancellationToken cancellationToken)
    {
        var ticket = await _ticketService.GetByCodeAsync(ticketCode, cancellationToken);
        return ticket == null
            ? NotFound(new { message = "Khong tim thay ve dien tu." })
            : Ok(ticket);
    }

    [HttpPost("verify")]
    [Authorize(Roles = "Partner,Admin")]
    public async Task<IActionResult> Verify(
        [FromBody] VerifyTicketRequest request,
        CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { message = "Vui long dang nhap!" });
        }

        var result = await _ticketService.VerifyAsync(
            request.QrPayloadJson,
            userId.Value,
            request.MarkAsUsed,
            cancellationToken);

        return result.IsValid ? Ok(result) : BadRequest(result);
    }

    private int? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        return userIdClaim == null
            ? null
            : int.Parse(userIdClaim.Value, CultureInfo.InvariantCulture);
    }
}
