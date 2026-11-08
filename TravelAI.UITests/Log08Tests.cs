using System.Text.RegularExpressions;
using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace TravelAI.UITests;

[TestFixture]
public class Log08Tests : PageTest
{
    private const string BaseUrl = "http://localhost:5173";

    [TestCase("abc@", TestName = "WEB_LOG_08_EmailSaiDinhDang_abc@")]
    [TestCase("atest1", TestName = "WEB_LOG_08_EmailSaiDinhDang_thieuAt")]
    public async Task WEB_LOG_08_QuenMatKhauEmailSaiDinhDang(string badEmail)
    {
        // Chỉ ghi lại các yêu cầu POST phát sinh SAU KHI bấm nút "Gửi link đặt lại mật khẩu"
        var counting = false;
        var postUrls = new List<string>();
        Page.Request += (_, r) =>
        {
            if (counting && r.Method == "POST") postUrls.Add(r.Url);
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
            // Bước 1: mở website, bấm "Đăng nhập" rồi "Quên mật khẩu?"
            await Page.GotoAsync(BaseUrl);
            await Page.GetByRole(AriaRole.Banner).GetByRole(AriaRole.Button, new() { Name = "Đăng nhập" }).ClickAsync();
            await Page.GetByRole(AriaRole.Link, new() { Name = "Quên mật khẩu?" }).ClickAsync();
            await Expect(Page).ToHaveURLAsync(new Regex(@"/forgot-password"));

            // Bước 2: nhập email sai định dạng
            var emailBox = Page.GetByRole(AriaRole.Textbox, new() { Name = "name@example.com" });
            await emailBox.FillAsync(badEmail);

            // Bước 3: bấm "Gửi link đặt lại mật khẩu" (từ đây mới bắt đầu đếm yêu cầu)
            counting = true;
            await Page.GetByRole(AriaRole.Button, new() { Name = "Gửi link đặt lại mật khẩu" }).ClickAsync();

            // Ghi lại thông báo của trình duyệt (ngôn ngữ phụ thuộc trình duyệt chạy test)
            var typeMismatch = await emailBox.EvaluateAsync<bool>("e => e.validity.typeMismatch");
            var message = await emailBox.EvaluateAsync<string>("e => e.validationMessage");
            TestContext.Out.WriteLine($"Email thử: {badEmail}");
            TestContext.Out.WriteLine($"Thông báo của trình duyệt: {message}");

            // Expected 1: ô email bị báo sai định dạng, có thông báo lỗi
            Assert.That(typeMismatch, Is.True, $"Web không báo sai định dạng với '{badEmail}'");
            Assert.That(message, Is.Not.Empty);
            await Expect(emailBox).ToBeFocusedAsync();

            // Chờ để bắt kịp nếu web có gửi yêu cầu
            await Page.WaitForTimeoutAsync(3000);
            TestContext.Out.WriteLine("Các yêu cầu POST sau khi bấm nút: " +
                (postUrls.Count == 0 ? "(không có)" : string.Join(" | ", postUrls)));

            // Expected 2: không gửi yêu cầu đặt lại mật khẩu, không hiện màn "Kiểm tra hộp thư!"
            var resetPosts = postUrls.Where(u => Regex.IsMatch(u, "forgot|reset|password", RegexOptions.IgnoreCase)).ToList();
            Assert.That(resetPosts, Is.Empty, "Web vẫn gửi yêu cầu đặt lại mật khẩu: " + string.Join(", ", resetPosts));
            Assert.That(dialogMessage, Is.Null, $"Web hiện hộp thoại: {dialogMessage}");
            await Expect(Page.GetByText("Kiểm tra hộp thư")).ToHaveCountAsync(0);
            await Expect(Page).ToHaveURLAsync(new Regex(@"/forgot-password"));
            await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Quên mật khẩu?" })).ToBeVisibleAsync();

            await Page.ScreenshotAsync(new() { Path = $"WEB_LOG_08_{(badEmail == "abc@" ? "abc" : "thieuAt")}.png" });
        }
        finally { Page.Dialog -= Handler; }
    }
}