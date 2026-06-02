namespace TravelAI.Application.DTOs.Ticket;

public class VerifyTicketRequest
{
    public string QrPayloadJson { get; set; } = string.Empty;
    public bool MarkAsUsed { get; set; } = true;
}
