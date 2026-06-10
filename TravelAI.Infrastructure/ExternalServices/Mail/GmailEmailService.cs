using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using TravelAI.Application.Interfaces;

namespace TravelAI.Infrastructure.ExternalServices.Mail;

public class GmailEmailService : IEmailService
{
    private readonly string _fromEmail;
    private readonly string _password;
    private readonly string _displayName;

    public GmailEmailService(IConfiguration config)
    {
        _fromEmail   = config["Email:From"]        ?? throw new InvalidOperationException("Email:From not configured");
        _password    = config["Email:Password"]    ?? throw new InvalidOperationException("Email:Password not configured");
        _displayName = config["Email:DisplayName"] ?? "TravelAI";
    }

    // ─── Core sender ─────────────────────────────────────────────────────────
    public async Task SendEmailAsync(string toEmail, string subject, string htmlBody)
    {
        using var client = CreateSmtpClient();
        using var message = new MailMessage
        {
            From       = new MailAddress(_fromEmail, _displayName),
            Subject    = subject,
            Body       = htmlBody,
            IsBodyHtml = true
        };
        message.To.Add(toEmail);
        await client.SendMailAsync(message);
    }

    // ─── Verification Email ───────────────────────────────────────────────────
    public Task SendVerificationEmailAsync(string toEmail, string fullName, string verifyLink)
    {
        var subject = "✈️ TravelAI – Xác thực tài khoản của bạn";
        var body = $@"
<!DOCTYPE html>
<html lang=""vi"">
<head><meta charset=""UTF-8""><meta name=""viewport"" content=""width=device-width, initial-scale=1.0""></head>
<body style=""margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;"">
  <table width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""background:#f0f4f8;padding:40px 0;"">
    <tr><td align=""center"">
      <table width=""560"" cellpadding=""0"" cellspacing=""0"" style=""background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);"">
        <!-- Header -->
        <tr>
          <td style=""background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);padding:40px 48px;text-align:center;"">
            <h1 style=""color:#ffffff;margin:0;font-size:28px;font-weight:800;letter-spacing:-0.5px;"">✈️ TravelAI</h1>
            <p style=""color:#bfdbfe;margin:8px 0 0;font-size:14px;"">Hành trình thông minh cùng AI</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style=""padding:48px;"">
            <h2 style=""color:#1e293b;font-size:22px;margin:0 0 16px;font-weight:700;"">Xin chào, {fullName}! 👋</h2>
            <p style=""color:#475569;font-size:15px;line-height:1.7;margin:0 0 24px;"">
              Cảm ơn bạn đã đăng ký tài khoản <strong>TravelAI</strong>. Chỉ còn một bước nữa để bắt đầu khám phá những hành trình tuyệt vời!
            </p>
            <p style=""color:#475569;font-size:15px;line-height:1.7;margin:0 0 32px;"">
              Nhấn vào nút bên dưới để xác thực địa chỉ email của bạn. Link này sẽ hết hạn sau <strong>24 giờ</strong>.
            </p>
            <!-- CTA Button -->
            <table cellpadding=""0"" cellspacing=""0"" width=""100%"">
              <tr>
                <td align=""center"">
                  <a href=""{verifyLink}"" style=""display:inline-block;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 48px;border-radius:12px;letter-spacing:0.3px;"">
                    ✅ Xác thực Email ngay
                  </a>
                </td>
              </tr>
            </table>
            <p style=""color:#94a3b8;font-size:13px;margin:28px 0 0;text-align:center;"">
              Nếu bạn không đăng ký tài khoản này, hãy bỏ qua email này.
            </p>
            <hr style=""border:none;border-top:1px solid #e2e8f0;margin:32px 0;""/>
            <p style=""color:#94a3b8;font-size:12px;margin:0;text-align:center;"">
              Hoặc copy link này vào trình duyệt:<br/>
              <span style=""color:#2563eb;word-break:break-all;"">{verifyLink}</span>
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style=""background:#f8fafc;padding:24px 48px;text-align:center;border-top:1px solid #e2e8f0;"">
            <p style=""color:#94a3b8;font-size:12px;margin:0;"">
              © 2025 TravelAI – Hệ thống du lịch thông minh.<br/>
              Email này được gửi tự động, vui lòng không trả lời.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>";
        return SendEmailAsync(toEmail, subject, body);
    }

    // ─── Password Reset Email ─────────────────────────────────────────────────
    public Task SendPasswordResetEmailAsync(string toEmail, string fullName, string resetLink)
    {
        var subject = "🔐 TravelAI – Đặt lại mật khẩu";
        var body = $@"
<!DOCTYPE html>
<html lang=""vi"">
<head><meta charset=""UTF-8""><meta name=""viewport"" content=""width=device-width, initial-scale=1.0""></head>
<body style=""margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;"">
  <table width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""background:#f0f4f8;padding:40px 0;"">
    <tr><td align=""center"">
      <table width=""560"" cellpadding=""0"" cellspacing=""0"" style=""background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);"">
        <!-- Header -->
        <tr>
          <td style=""background:linear-gradient(135deg,#dc2626 0%,#b91c1c 100%);padding:40px 48px;text-align:center;"">
            <h1 style=""color:#ffffff;margin:0;font-size:28px;font-weight:800;letter-spacing:-0.5px;"">✈️ TravelAI</h1>
            <p style=""color:#fecaca;margin:8px 0 0;font-size:14px;"">Yêu cầu đặt lại mật khẩu</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style=""padding:48px;"">
            <h2 style=""color:#1e293b;font-size:22px;margin:0 0 16px;font-weight:700;"">Xin chào, {fullName}! 🔐</h2>
            <p style=""color:#475569;font-size:15px;line-height:1.7;margin:0 0 24px;"">
              Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản <strong>TravelAI</strong> của bạn.
            </p>
            <p style=""color:#475569;font-size:15px;line-height:1.7;margin:0 0 32px;"">
              Nhấn vào nút bên dưới để tạo mật khẩu mới. Link này sẽ hết hạn sau <strong>15 phút</strong>.
            </p>
            <!-- CTA Button -->
            <table cellpadding=""0"" cellspacing=""0"" width=""100%"">
              <tr>
                <td align=""center"">
                  <a href=""{resetLink}"" style=""display:inline-block;background:linear-gradient(135deg,#dc2626,#b91c1c);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 48px;border-radius:12px;letter-spacing:0.3px;"">
                    🔑 Đặt lại mật khẩu
                  </a>
                </td>
              </tr>
            </table>
            <div style=""background:#fef3c7;border:1px solid #f59e0b;border-radius:10px;padding:16px 20px;margin:28px 0 0;"">
              <p style=""color:#92400e;font-size:13px;margin:0;"">
                ⚠️ Nếu bạn <strong>không yêu cầu</strong> đặt lại mật khẩu, hãy bỏ qua email này. Mật khẩu của bạn vẫn an toàn.
              </p>
            </div>
            <hr style=""border:none;border-top:1px solid #e2e8f0;margin:32px 0;""/>
            <p style=""color:#94a3b8;font-size:12px;margin:0;text-align:center;"">
              Hoặc copy link này vào trình duyệt:<br/>
              <span style=""color:#dc2626;word-break:break-all;"">{resetLink}</span>
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style=""background:#f8fafc;padding:24px 48px;text-align:center;border-top:1px solid #e2e8f0;"">
            <p style=""color:#94a3b8;font-size:12px;margin:0;"">
              © 2025 TravelAI – Hệ thống du lịch thông minh.<br/>
              Email này được gửi tự động, vui lòng không trả lời.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>";
        return SendEmailAsync(toEmail, subject, body);
    }

    // ─── Booking Emails ───────────────────────────────────────────────────────
    public Task SendBookingConfirmationAsync(string toEmail, string customerName, int bookingId, decimal totalAmount)
    {
        var subject = $"Xác nhận đặt hàng #{bookingId} – TravelAI";
        var body = $@"
<div style=""font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;"">
  <h2 style=""color:#2563eb;"">Xin chào {customerName},</h2>
  <p>Đơn hàng <strong>#{bookingId}</strong> của bạn đã được xác nhận thành công!</p>
  <p><strong>Tổng tiền:</strong> {totalAmount:N0} VND</p>
  <p>Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi.</p>
  <p style=""color:#64748b;"">— TravelAI Team</p>
</div>";
        return SendEmailAsync(toEmail, subject, body);
    }

    public Task SendBookingCancellationAsync(string toEmail, string customerName, int bookingId, decimal refundAmount)
    {
        var subject = $"Đơn hàng #{bookingId} đã bị hủy – TravelAI";
        var body = $@"
<div style=""font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;"">
  <h2 style=""color:#dc2626;"">Xin chào {customerName},</h2>
  <p>Đơn hàng <strong>#{bookingId}</strong> của bạn đã bị hủy do quá hạn duyệt.</p>
  <p><strong>Số tiền hoàn lại:</strong> {refundAmount:N0} VND (trong vòng 3–5 ngày làm việc)</p>
  <p>Bạn có thể tìm kiếm và đặt dịch vụ khác trên hệ thống.</p>
  <p style=""color:#64748b;"">Trân trọng,<br/>TravelAI Team</p>
</div>";
        return SendEmailAsync(toEmail, subject, body);
    }

    public Task SendOrderApprovedAsync(string toEmail, string customerName, int bookingId, string serviceName)
    {
        var subject = $"Đơn hàng #{bookingId} đã được duyệt – TravelAI";
        var body = $@"
<div style=""font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;"">
  <h2 style=""color:#16a34a;"">Xin chào {customerName},</h2>
  <p>Đơn hàng <strong>#{bookingId}</strong> cho dịch vụ <strong>{serviceName}</strong> đã được đối tác phê duyệt!</p>
  <p>Bạn có thể sử dụng dịch vụ theo thông tin đã đặt.</p>
  <p>Chúc bạn có một chuyến đi vui vẻ! ✈️</p>
  <p style=""color:#64748b;"">— TravelAI Team</p>
</div>";
        return SendEmailAsync(toEmail, subject, body);
    }

    public Task SendOrderRejectedAsync(string toEmail, string customerName, int bookingId, string serviceName, string reason)
    {
        var subject = $"Đơn hàng #{bookingId} bị từ chối – TravelAI";
        var body = $@"
<div style=""font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;"">
  <h2 style=""color:#dc2626;"">Xin chào {customerName},</h2>
  <p>Rất tiếc, đơn hàng <strong>#{bookingId}</strong> cho dịch vụ <strong>{serviceName}</strong> đã bị đối tác từ chối.</p>
  <p><strong>Lý do:</strong> {reason}</p>
  <p>Số tiền sẽ được hoàn lại vào tài khoản của bạn trong vòng 3–5 ngày làm việc.</p>
  <p>Nếu có thắc mắc, vui lòng liên hệ với chúng tôi.</p>
  <p style=""color:#64748b;"">— TravelAI Team</p>
</div>";
        return SendEmailAsync(toEmail, subject, body);
    }

    // ─── Private helpers ──────────────────────────────────────────────────────
    private SmtpClient CreateSmtpClient() => new SmtpClient("smtp.gmail.com", 587)
    {
        Credentials = new NetworkCredential(_fromEmail, _password),
        EnableSsl   = true
    };
}
