using TravelAI.Application.Interfaces;

namespace TravelAI.Infrastructure.ExternalServices.Mail;

public class SendGridEmailService : IEmailService
{
    // TODO: Implement with SendGrid API
    // For now, using console logging as placeholder
    
    public Task SendEmailAsync(string toEmail, string subject, string htmlBody)
    {
        Console.WriteLine($"[EMAIL] To: {toEmail}");
        Console.WriteLine($"[EMAIL] Subject: {subject}");
        Console.WriteLine($"[EMAIL] Body: {htmlBody}");
        return Task.CompletedTask;
    }

    public Task SendBookingConfirmationAsync(string toEmail, string customerName, int bookingId, decimal totalAmount)
    {
        var subject = $"Xac nhan dat hang #{bookingId}";
        var body = $@"
            <h2>Xin chao {customerName},</h2>
            <p>Don hang #{bookingId} cua ban da duoc xac nhan thanh cong!</p>
            <p><strong>Tong tien:</strong> {totalAmount:N0} VND</p>
            <p>Cam on ban da su dung dich vu cua chung toi.</p>
        ";
        return SendEmailAsync(toEmail, subject, body);
    }

    public Task SendBookingCancellationAsync(string toEmail, string customerName, int bookingId, decimal refundAmount)
    {
        var subject = $"Đơn hàng #{bookingId} đã bị hủy - Hoàn tiền {refundAmount:N0}đ";
        var body = $@"
            <h2>Xin chào {customerName},</h2>
            <p>Đơn hàng <strong>#{bookingId}</strong> của bạn đã bị hủy do <strong>quá hạn duyệt</strong>.</p>
            <p><strong>Số tiền hoàn lại:</strong> {refundAmount:N0} VND (trong vòng 3-5 ngày làm việc)</p>
            <p>Bạn có thể tìm kiếm và đặt dịch vụ khác trên hệ thống.</p>
            <p>Trân trọng,<br/>TravelAI Team</p>
        ";
        return SendEmailAsync(toEmail, subject, body);
    }

    public Task SendOrderApprovedAsync(string toEmail, string customerName, int bookingId, string serviceName)
    {
        var subject = $"Don hang #{bookingId} da duoc duyet";
        var body = $@"
            <h2>Xin chao {customerName},</h2>
            <p>Don hang #{bookingId} cho dich vu <strong>{serviceName}</strong> da duoc doi tac phe duyet!</p>
            <p>Ban co the su dung dich vu theo thong tin da dat.</p>
            <p>Chuc ban co mot chuyen di vui ve!</p>
        ";
        return SendEmailAsync(toEmail, subject, body);
    }

    public Task SendOrderRejectedAsync(string toEmail, string customerName, int bookingId, string serviceName, string reason)
    {
        var subject = $"Don hang #{bookingId} bi tu choi";
        var body = $@"
            <h2>Xin chao {customerName},</h2>
            <p>Rat tiec, don hang #{bookingId} cho dich vu <strong>{serviceName}</strong> da bi doi tac tu choi.</p>
            <p><strong>Ly do:</strong> {reason}</p>
            <p>So tien se duoc hoan lai vao tai khoan cua ban trong vong 3-5 ngay lam viec.</p>
            <p>Neu co thac mac, vui long lien he voi chung toi.</p>
        ";
        return SendEmailAsync(toEmail, subject, body);
    }
}
