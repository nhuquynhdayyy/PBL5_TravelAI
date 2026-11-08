using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace TravelAI.UITests;

[TestFixture]
public class Reg04Tests : PageTest
{
    private const string BaseUrl = "http://localhost:5173";

    [TestCase("a.test")]
    [TestCase("a.test@")]
    [TestCase("a test@gmail.com")]
    public async Task WEB_REG_04_DangKyEmailSaiDinhDang(string badEmail)
    {
        // Bước 1: mở website, bấm "Đăng ký"
        await Page.GotoAsync(BaseUrl);
        await Page.GetByRole(AriaRole.Banner)
            .GetByRole(AriaRole.Button, new() { Name = "Đăng ký" }).ClickAsync();

        // Bước 2 và 3: nhập thông tin, email sai định dạng
        var emailBox = Page.GetByRole(AriaRole.Textbox, new() { Name = "name@example.com" });
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "Nhập họ và tên của bạn" }).FillAsync("Nguyễn Văn A");
        await emailBox.FillAsync(badEmail);
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "••••••••" }).FillAsync("Test@1234");

        // Bước 4: bấm "Tạo tài khoản"
        await Page.GetByRole(AriaRole.Button, new() { Name = "Tạo tài khoản" }).ClickAsync();

        // Expected 1: ô Email bị trình duyệt báo không hợp lệ và có thông báo lỗi
        var isValid = await emailBox.EvaluateAsync<bool>("e => e.validity.valid");
        var message = await emailBox.EvaluateAsync<string>("e => e.validationMessage");
        TestContext.Out.WriteLine($"Email '{badEmail}' - thông báo tại ô Email: {message}");
        Assert.That(isValid, Is.False, $"Email '{badEmail}' lẽ ra phải bị báo sai định dạng");
        Assert.That(message, Is.Not.Empty);

        // Expected 2: không tạo tài khoản, vẫn ở trang đăng ký
        await Page.WaitForTimeoutAsync(2000);
        await Expect(Page.GetByText("Đăng ký thành công")).ToHaveCountAsync(0);
        Assert.That(Page.Url, Does.Contain("/register"));
    }
}