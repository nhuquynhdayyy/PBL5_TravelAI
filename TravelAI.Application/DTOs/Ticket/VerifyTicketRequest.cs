using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace TravelAI.Application.DTOs.Ticket;

public class VerifyTicketRequest
{
    [Required]
    [MaxLength(512)]
    [JsonPropertyName("qrPayload")]
    public string QrPayload { get; set; } = string.Empty;

    [JsonPropertyName("qrPayloadJson")]
    public string? LegacyQrPayloadJson
    {
        set
        {
            if (!string.IsNullOrWhiteSpace(value) && string.IsNullOrWhiteSpace(QrPayload))
            {
                QrPayload = value;
            }
        }
    }

    public bool MarkAsUsed { get; set; } = true;
}
