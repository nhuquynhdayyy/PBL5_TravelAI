using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace TravelAI.UITests;

[TestFixture]
public class LoginTests : PageTest
{
    private const string BaseUrl = "http://localhost:5173";
    private const string ValidEmail = "cristiananguyen@gmail.com";   // tài khoản test của bạn
    private const string ValidPassword = "123456";

    private async Task OpenLoginAsync()
    {
        await Page.GotoAsync(BaseUrl);
        await Page.GetByRole(AriaRole.Banner)
            .GetByRole(AriaRole.Button, new() { Name = "Đăng nhập" }).ClickAsync();
    }

    private async Task FillLoginAsync(string email, string password)
    {
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "name@company.com" }).FillAsync(email);
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "••••••••" }).FillAsync(password);
    }

    // Bấm nút Đăng nhập và lấy nội dung hộp thoại alert của web
    private async Task<string> SubmitAndGetDialogAsync()
    {
        var tcs = new TaskCompletionSource<string>();
        void Handler(object? sender, IDialog dialog)
        {
            tcs.TrySetResult(dialog.Message);
            _ = dialog.AcceptAsync();
        }
        Page.Dialog += Handler;
        try
        {
            await Page.GetByRole(AriaRole.Main)
                .GetByRole(AriaRole.Button, new() { Name = "Đăng nhập" }).ClickAsync();
            return await tcs.Task.WaitAsync(TimeSpan.FromSeconds(5));
        }
        finally { Page.Dialog -= Handler; }
    }

    [Test]
    public async Task WEB_LOG_01_DangNhapThanhCong()
    {
        await OpenLoginAsync();
        await FillLoginAsync(ValidEmail, ValidPassword);
        await Page.GetByRole(AriaRole.Main)
            .GetByRole(AriaRole.Button, new() { Name = "Đăng nhập" }).ClickAsync();

        // Đăng nhập xong thì thanh trên cùng có nút "Thông báo"
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "Thông báo" }))
            .ToBeVisibleAsync(new() { Timeout = 15000 });
    }

    [Test]
    public async Task WEB_LOG_03_DangNhapSaiMatKhau()
    {
        await OpenLoginAsync();
        await FillLoginAsync(ValidEmail, "SaiMatKhau@999");
        var message = await SubmitAndGetDialogAsync();

        TestContext.Out.WriteLine($"Thông báo của web: {message}");
        Assert.That(message, Does.Contain("Email hoặc mật khẩu không đúng"));
    }

    [Test]
    public async Task WEB_LOG_04_DangNhapEmailKhongTonTai()
    {
        await OpenLoginAsync();
        await FillLoginAsync("khongtontai999@gmail.com", "Test@1234");
        var message = await SubmitAndGetDialogAsync();

        TestContext.Out.WriteLine($"Thông báo của web: {message}");
        Assert.That(message, Does.Contain("Email hoặc mật khẩu không đúng"));
    }
}