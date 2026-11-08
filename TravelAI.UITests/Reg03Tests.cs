using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace TravelAI.UITests;

[TestFixture]
public class Reg03Tests : PageTest
{
    private const string BaseUrl = "http://localhost:5173";
    private const string ExistingEmail = "a.test01@gmail.com";

    [Test]
    public async Task WEB_REG_03_DangKyEmailDaTonTai()
    {
        // Bước 1: mở website, bấm "Đăng ký"
        await Page.GotoAsync(BaseUrl);
        await Page.GetByRole(AriaRole.Banner)
            .GetByRole(AriaRole.Button, new() { Name = "Đăng ký" }).ClickAsync();

        // Bước 2: nhập thông tin với email đã tồn tại
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "Nhập họ và tên của bạn" }).FillAsync("Nguyễn Văn A");
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "name@example.com" }).FillAsync(ExistingEmail);
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "••••••••" }).FillAsync("Test@1234");

        // Bước 3: bấm "Tạo tài khoản" và bắt hộp thoại thông báo
        var tcs = new TaskCompletionSource<string>();
        void Handler(object? sender, IDialog dialog)
        {
            tcs.TrySetResult(dialog.Message);
            _ = dialog.AcceptAsync();
        }
        Page.Dialog += Handler;
        try
        {
            await Page.GetByRole(AriaRole.Button, new() { Name = "Tạo tài khoản" }).ClickAsync();
            var message = await tcs.Task.WaitAsync(TimeSpan.FromSeconds(10));
            TestContext.Out.WriteLine($"Thông báo của web: {message}");

            // Expected 1: hộp thoại báo email đã tồn tại
            Assert.That(message, Does.Contain("Email đã tồn tại trong hệ thống"));
        }
        finally { Page.Dialog -= Handler; }

        // Expected 2: không hiện màn hình đăng ký thành công, vẫn ở trang đăng ký
        await Expect(Page.GetByText("Đăng ký thành công")).ToHaveCountAsync(0);
        Assert.That(Page.Url, Does.Contain("/register"));
    }
}