using System.Text.RegularExpressions;
using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace TravelAI.UITests;

[TestFixture]
public class Log06Tests : PageTest
{
    private const string BaseUrl = "http://localhost:5173";

    // email, mật khẩu, ô được báo lỗi đầu tiên
    [TestCase("", "", "email", TestName = "WEB_LOG_06a_BoTrongCaHai")]
    [TestCase("test@example.com", "", "password", TestName = "WEB_LOG_06b_ChiNhapEmail")]
    [TestCase("", "Test@1234", "email", TestName = "WEB_LOG_06c_ChiNhapMatKhau")]
    public async Task WEB_LOG_06_BoTrongEmailHoacMatKhau(string email, string password, string firstInvalid)
    {
        // Đếm yêu cầu đăng nhập gửi lên backend (phải bằng 0) và bắt hộp thoại nếu có
        var loginRequests = 0;
        Page.Request += (_, r) =>
        {
            if (r.Method == "POST" && r.Url.Contains("/api/auth/login")) loginRequests++;
        };
        string? dialogMessage = null;
        void Handler(object? sender, IDialog dialog)
        {
            dialogMessage = dialog.Message;
            _ = dialog.AcceptAsync();
        }
        Page.Dialog += Handler;

        try
        {
            // Bước 1: mở website, bấm "Đăng nhập" ở header
            await Page.GotoAsync(BaseUrl);
            var header = Page.GetByRole(AriaRole.Banner);
            await header.GetByRole(AriaRole.Button, new() { Name = "Đăng nhập" }).ClickAsync();
            await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Chào mừng quay lại" }))
                .ToBeVisibleAsync();

            var emailBox = Page.GetByRole(AriaRole.Textbox, new() { Name = "name@company.com" });
            var passBox = Page.GetByRole(AriaRole.Textbox, new() { Name = "••••••••" });

            // Bước 2: chỉ nhập những ô có giá trị
            if (email != "") await emailBox.FillAsync(email);
            if (password != "") await passBox.FillAsync(password);

            // Bước 3: bấm "Đăng nhập" trong form
            await Page.GetByRole(AriaRole.Main).GetByRole(AriaRole.Button, new() { Name = "Đăng nhập" }).ClickAsync();

            // Ghi lại trạng thái bắt buộc nhập và thông báo của trình duyệt
            var emailMissing = await emailBox.EvaluateAsync<bool>("e => e.validity.valueMissing");
            var passMissing = await passBox.EvaluateAsync<bool>("e => e.validity.valueMissing");
            var invalidBox = firstInvalid == "email" ? emailBox : passBox;
            var message = await invalidBox.EvaluateAsync<string>("e => e.validationMessage");
            TestContext.Out.WriteLine($"Email trống: {emailMissing} | Mật khẩu trống: {passMissing}");
            TestContext.Out.WriteLine($"Thông báo tại ô {firstInvalid}: {message}");

            await Page.ScreenshotAsync(new() { Path = $"WEB_LOG_06_{firstInvalid}_{(email == "" ? "e0" : "e1")}{(password == "" ? "p0" : "p1")}.png" });

            // Expected 1: các ô để trống phải được đánh dấu bắt buộc nhập
            Assert.That(emailMissing, Is.EqualTo(email == ""),
                email == "" ? "Email để trống nhưng không bị báo bắt buộc" : "Email đã nhập nhưng bị báo trống");
            Assert.That(passMissing, Is.EqualTo(password == ""),
                password == "" ? "Mật khẩu để trống nhưng không bị báo bắt buộc" : "Mật khẩu đã nhập nhưng bị báo trống");

            // Expected 2: thông báo hiện tại ô trống đầu tiên (ô đó được focus)
            Assert.That(message, Is.Not.Empty, "Không có thông báo bắt buộc nhập");
            await Expect(invalidBox).ToBeFocusedAsync();

            // Expected 3: không gửi yêu cầu đăng nhập, không có hộp thoại, vẫn ở trang Đăng nhập
            await Page.WaitForTimeoutAsync(2000);
            Assert.That(loginRequests, Is.EqualTo(0), "Web vẫn gửi yêu cầu đăng nhập khi còn ô trống");
            Assert.That(dialogMessage, Is.Null, $"Web hiện hộp thoại: {dialogMessage}");
            await Expect(Page).ToHaveURLAsync(new Regex(@"/login"));
            await Expect(header.GetByRole(AriaRole.Button, new() { Name = "Đăng nhập" })).ToBeVisibleAsync();
        }
        finally { Page.Dialog -= Handler; }
    }
}