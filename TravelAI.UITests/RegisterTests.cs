using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace TravelAI.UITests;

[TestFixture]
public class RegisterTests : PageTest
{
    private const string BaseUrl = "http://localhost:5173";
    private const string ExistingEmail = "cristiananguyen@gmail.com";  // tài khoản đã có sẵn
    private const string StrongPassword = "Test@1234";

    private static string NewEmail() => $"autotest{DateTime.Now:yyyyMMddHHmmssfff}@gmail.com";

    private ILocator SuccessLink =>
        Page.GetByRole(AriaRole.Link, new() { Name = "Về trang đăng nhập" });

    private ILocator EmailBox =>
        Page.GetByRole(AriaRole.Textbox, new() { Name = "name@example.com" });

    private static string Short(string s)
    {
        s = s.Replace("\r", " ").Replace("\n", " ");
        return s.Length <= 200 ? s : s[..200] + "...";
    }

    private async Task OpenRegisterAsync()
    {
        await Page.GotoAsync(BaseUrl);
        await Page.GetByRole(AriaRole.Banner)
            .GetByRole(AriaRole.Button, new() { Name = "Đăng ký" }).ClickAsync();
    }

    private async Task FillRegisterAsync(string name, string email, string password)
    {
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "Nhập họ và tên của bạn" }).FillAsync(name);
        await EmailBox.FillAsync(email);
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "••••••••" }).FillAsync(password);
    }

    // Bấm "Tạo tài khoản"; trả về nội dung alert nếu có, nếu không thì chữ ở vùng nội dung chính
    private async Task<string> SubmitAndGetMessageAsync()
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
            await Page.GetByRole(AriaRole.Button, new() { Name = "Tạo tài khoản" }).ClickAsync();
            var done = await Task.WhenAny(tcs.Task, Task.Delay(3000));
            var message = done == tcs.Task
                ? tcs.Task.Result
                : await Page.GetByRole(AriaRole.Main).InnerTextAsync();
            TestContext.Out.WriteLine($"Phản hồi của web: {Short(message)}");
            return message;
        }
        finally { Page.Dialog -= Handler; }
    }

    // Chờ tối đa 8 giây xem web có hiện màn hình "đăng ký thành công" không
    private async Task<bool> RegisteredAsync(int timeoutMs = 8000)
    {
        try
        {
            await SuccessLink.WaitForAsync(new() { State = WaitForSelectorState.Visible, Timeout = timeoutMs });
            return true;
        }
        catch (PlaywrightException) { return false; }
    }

    [Test]
    public async Task WEB_REG_01_DangKyThanhCong()
    {
        await OpenRegisterAsync();
        await FillRegisterAsync("Nguyễn Văn An", NewEmail(), StrongPassword);
        await Page.GetByRole(AriaRole.Button, new() { Name = "Tạo tài khoản" }).ClickAsync();

        await Expect(SuccessLink).ToBeVisibleAsync(new() { Timeout = 15000 });
    }

    [Test]
    public async Task WEB_REG_03_DangKyEmailDaTonTai()
    {
        await OpenRegisterAsync();
        await FillRegisterAsync("Nguyễn Văn An", ExistingEmail, StrongPassword);
        var message = await SubmitAndGetMessageAsync();

        Assert.That(message, Does.Contain("Email này đã được sử dụng"));
    }

    [TestCase("an.test")]
    [TestCase("an.test@")]
    public async Task WEB_REG_04_DangKyEmailSaiDinhDang(string badEmail)
    {
        await OpenRegisterAsync();
        await FillRegisterAsync("Nguyễn Văn An", badEmail, StrongPassword);
        var message = await SubmitAndGetMessageAsync();

        var native = await EmailBox.EvaluateAsync<string>("e => e.validationMessage");
        TestContext.Out.WriteLine($"Thông báo mặc định của trình duyệt: {native}");

        Assert.That(message, Does.Contain("Email không đúng định dạng"));
    }

    [Test]
    public async Task WEB_REG_05_MatKhau7KyTu()
    {
        await OpenRegisterAsync();
        await FillRegisterAsync("Nguyễn Văn An", NewEmail(), "Te@1234");   // 7 ký tự
        await SubmitAndGetMessageAsync();

        Assert.That(await RegisteredAsync(), Is.False,
            "Web vẫn cho đăng ký với mật khẩu 7 ký tự (SRS yêu cầu tối thiểu 8 ký tự)");
    }

    [Test]
    public async Task WEB_REG_06_MatKhauDung8KyTu()
    {
        await OpenRegisterAsync();
        await FillRegisterAsync("Nguyễn Văn An", NewEmail(), "Test@123");   // 8 ký tự
        await Page.GetByRole(AriaRole.Button, new() { Name = "Tạo tài khoản" }).ClickAsync();

        await Expect(SuccessLink).ToBeVisibleAsync(new() { Timeout = 15000 });
    }

    [TestCase("test@1234")]    // thiếu chữ hoa
    [TestCase("TEST@1234")]    // thiếu chữ thường
    [TestCase("Test@abcd")]    // thiếu số
    [TestCase("Test12345")]    // thiếu ký tự đặc biệt
    public async Task WEB_REG_07_MatKhauThieuThanhPhan(string password)
    {
        await OpenRegisterAsync();
        await FillRegisterAsync("Nguyễn Văn An", NewEmail(), password);
        await SubmitAndGetMessageAsync();

        Assert.That(await RegisteredAsync(), Is.False,
            $"Web vẫn cho đăng ký với mật khẩu '{password}' (thiếu thành phần theo SRS)");
    }
}