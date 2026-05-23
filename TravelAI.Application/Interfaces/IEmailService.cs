namespace TravelAI.Application.Interfaces;

public interface IEmailService
{
    Task SendEmailAsync(string toEmail, string subject, string htmlBody);
    Task SendBookingConfirmationAsync(string toEmail, string customerName, int bookingId, decimal totalAmount);
    Task SendBookingCancellationAsync(string toEmail, string customerName, int bookingId, decimal refundAmount);
    Task SendOrderApprovedAsync(string toEmail, string customerName, int bookingId, string serviceName);
    Task SendOrderRejectedAsync(string toEmail, string customerName, int bookingId, string serviceName, string reason);
}
