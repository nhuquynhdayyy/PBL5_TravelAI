using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace TravelAI.UITests;

[TestFixture]
public class Reg08Tests : PageTest
{
    private const string BaseUrl = "http://localhost:5173";
    private const string GmailUser = "abcd";

    [Test]
    public async Task WEB_REG_08_DeTrongHoTen()
    {
        var email = $"{GmailUser}+reg08{DateTime.Now:yyyyMMddHHmmss}@gmail.com";

        // Bước 1: mở website, bấm "Đăng ký"
        await Page.GotoAsync(BaseUrl);
        await Page.GetByRole(AriaRole.Banner)
            .GetByRole(AriaRole.Button, new() { Name = "Đăng ký" }).ClickAsync();

        // Bước 2: để trống Họ và tên, nhập hợp lệ các ô còn lại
        var nameBox = Page.GetByRole(AriaRole.Textbox, new() { Name = "Nhập họ và tên của bạn" });
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "name@example.com" }).FillAsync(email);
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "••••••••" }).FillAsync("Test@1234");

        // Bước 3: bấm "Tạo tài khoản"
        await Page.GetByRole(AriaRole.Button, new() { Name = "Tạo tài khoản" }).ClickAsync();

        // Expected 1: ô Họ và tên bị báo bắt buộc nhập, có thông báo lỗi
        var isMissing = await nameBox.EvaluateAsync<bool>("e => e.validity.valueMissing");
        var message = await nameBox.EvaluateAsync<string>("e => e.validationMessage");
        TestContext.Out.WriteLine($"Thông báo tại ô Họ và tên: {message}");
        Assert.That(isMissing, Is.True, "Ô Họ và tên để trống nhưng không bị báo bắt buộc nhập");
        Assert.That(message, Is.Not.Empty);

        // Expected 2: không tạo tài khoản, vẫn ở trang đăng ký
        await Page.WaitForTimeoutAsync(2000);
        await Expect(Page.GetByText("Đăng ký thành công")).ToHaveCountAsync(0);
        Assert.That(Page.Url, Does.Contain("/register"));
    }
}