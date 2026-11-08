using System.Text.RegularExpressions;
using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace TravelAI.UITests;

[TestFixture]
public class Log03Tests : PageTest
{
    private const string BaseUrl = "http://localhost:5173";

    // Email đúng của một tài khoản đã kích hoạt, mật khẩu cố tình sai
    private const string ValidEmail = "partner.hanoihotel@gmail.com";
    private const string WrongPassword = "SaiMatKhau@999";

    [Test]
    public async Task WEB_LOG_03_DangNhapMatKhauSai()
    {
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

            // Bước 2: nhập email đúng, mật khẩu sai
            await Page.GetByRole(AriaRole.Textbox, new() { Name = "name@company.com" }).FillAsync(ValidEmail);
            await Page.GetByRole(AriaRole.Textbox, new() { Name = "••••••••" }).FillAsync(WrongPassword);

            // Bước 3: bấm "Đăng nhập" trong form
            await Page.GetByRole(AriaRole.Main).GetByRole(AriaRole.Button, new() { Name = "Đăng nhập" }).ClickAsync();

            // Expected 1: hiện thông báo đúng như SRS (chờ tối đa 60 giây)
            var finished = await Task.WhenAny(dialogTcs.Task, Task.Delay(60000));
            Assert.That(finished, Is.SameAs(dialogTcs.Task), "Không thấy thông báo lỗi nào sau 60 giây");
            var message = await dialogTcs.Task;
            TestContext.Out.WriteLine($"Thông báo của web: {message}");
            Assert.That(message, Is.EqualTo("Email hoặc mật khẩu không đúng."));

            // Expected 2: không đăng nhập được, vẫn ở trang Đăng nhập
            await Expect(Page).ToHaveURLAsync(new Regex(@"/login"));
            await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Chào mừng quay lại" }))
                .ToBeVisibleAsync();

            // Expected 3: header vẫn là trạng thái chưa đăng nhập
            await Expect(header.GetByRole(AriaRole.Button, new() { Name = "Đăng nhập" })).ToBeVisibleAsync();
            await Expect(header.GetByRole(AriaRole.Button, new() { Name = "Đăng ký" })).ToBeVisibleAsync();

            await Page.ScreenshotAsync(new() { Path = "WEB_LOG_03_pass.png" });
        }
        finally { Page.Dialog -= Handler; }
    }
}