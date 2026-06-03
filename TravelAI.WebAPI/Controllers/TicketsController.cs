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
    private const string InvalidPublicTicketMessage = "Vé không hợp lệ hoặc đã bị xóa";

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
    [ProducesResponseType(typeof(ElectronicTicketDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ElectronicTicketDto>> GetByCode(string ticketCode, CancellationToken cancellationToken)
    {
        var ticket = await _ticketService.GetByCodeAsync(ticketCode, cancellationToken);
        return ticket == null
            ? NotFound(new { message = "Không tìm thấy vé điện tử." })
            : Ok(ticket);
    }

    [HttpGet("public/{ticketCode}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(PublicTicketDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PublicTicketDto>> GetPublicByCode(string ticketCode, CancellationToken cancellationToken)
    {
        var ticket = await _ticketService.GetPublicByCodeAsync(ticketCode, cancellationToken);
        return ticket == null
            ? NotFound(new { message = InvalidPublicTicketMessage })
            : Ok(ticket);
    }

    [HttpPost("verify")]
    [Authorize(Roles = "Partner,Admin")]
    [ProducesResponseType(typeof(VerifyTicketResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(VerifyTicketResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<VerifyTicketResponse>> Verify(
        [FromBody] VerifyTicketRequest request,
        CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { message = "Vui lòng đăng nhập." });
        }

        var result = await _ticketService.VerifyAsync(
            request.QrPayload,
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
