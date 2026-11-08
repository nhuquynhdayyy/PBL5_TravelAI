using System.Text.RegularExpressions;
using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace TravelAI.UITests;

[TestFixture]
public class Log04Tests : PageTest
{
    private const string BaseUrl = "http://localhost:5173";
    private const string ExpectedMessage = "Email hoặc mật khẩu không đúng.";

    [Test]
    public async Task WEB_LOG_04_DangNhapEmailKhongTonTai()
    {
        // Email có dấu thời gian để chắc chắn chưa từng đăng ký
        var email = $"khongtontai{DateTime.Now:yyyyMMddHHmmss}@gmail.com";
        TestContext.Out.WriteLine($"Email thử: {email}");

        // Web báo lỗi bằng hộp thoại của trình duyệt, nên phải bắt hộp thoại trước khi bấm nút
        var dialogTcs = new TaskCompletionSource<string>();
        void Handler(object? sender, IDialog dialog)
        {
            dialogTcs.TrySetResult(dialog.Message);
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

            // Bước 2: nhập email chưa đăng ký và mật khẩu bất kỳ
            await Page.GetByRole(AriaRole.Textbox, new() { Name = "name@company.com" }).FillAsync(email);
            await Page.GetByRole(AriaRole.Textbox, new() { Name = "••••••••" }).FillAsync("MatKhauBatKy@123");

            // Bước 3: bấm "Đăng nhập" trong form
            await Page.GetByRole(AriaRole.Main).GetByRole(AriaRole.Button, new() { Name = "Đăng nhập" }).ClickAsync();

            // Expected 1: hiện thông báo đúng như SRS (chờ tối đa 60 giây)
            var finished = await Task.WhenAny(dialogTcs.Task, Task.Delay(60000));
            Assert.That(finished, Is.SameAs(dialogTcs.Task), "Không thấy thông báo lỗi nào sau 60 giây");
            var message = await dialogTcs.Task;
            TestContext.Out.WriteLine($"Thông báo của web: {message}");
            Assert.That(message, Is.EqualTo(ExpectedMessage));

            // Expected 2: thông báo không tiết lộ email có tồn tại hay không
            Assert.That(message, Does.Not.Contain("không tồn tại").IgnoreCase);
            Assert.That(message, Does.Not.Contain("chưa đăng ký").IgnoreCase);

            // Expected 3: không đăng nhập được, vẫn ở trang Đăng nhập
            await Expect(Page).ToHaveURLAsync(new Regex(@"/login"));
            await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Chào mừng quay lại" }))
                .ToBeVisibleAsync();
            await Expect(header.GetByRole(AriaRole.Button, new() { Name = "Đăng nhập" })).ToBeVisibleAsync();

            await Page.ScreenshotAsync(new() { Path = "WEB_LOG_04_pass.png" });
        }
        finally { Page.Dialog -= Handler; }
    }
}