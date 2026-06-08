namespace TravelAI.Application.DTOs.Ticket;

public class VerifyTicketResponse
{
    public bool IsValid { get; set; }
    public string Message { get; set; } = string.Empty;
    public ElectronicTicketDto? Ticket { get; set; }
}
