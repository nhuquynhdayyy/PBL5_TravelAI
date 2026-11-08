using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace TravelAI.UITests;

[TestFixture]
public class Reg09Tests : PageTest
{
    private const string BaseUrl = "http://localhost:5173";

    [Test]
    public async Task WEB_REG_09_DeTrongToanBoForm()
    {
        // Bước 1: mở website, bấm "Đăng ký"
        await Page.GotoAsync(BaseUrl);
        await Page.GetByRole(AriaRole.Banner)
            .GetByRole(AriaRole.Button, new() { Name = "Đăng ký" }).ClickAsync();

        var nameBox = Page.GetByRole(AriaRole.Textbox, new() { Name = "Nhập họ và tên của bạn" });
        var emailBox = Page.GetByRole(AriaRole.Textbox, new() { Name = "name@example.com" });
        var passBox = Page.GetByRole(AriaRole.Textbox, new() { Name = "••••••••" });

        // Bước 2: không nhập gì. Bước 3: bấm "Tạo tài khoản"
        await Page.GetByRole(AriaRole.Button, new() { Name = "Tạo tài khoản" }).ClickAsync();

        // Ghi lại trạng thái bắt buộc nhập của từng ô
        var nameMissing = await nameBox.EvaluateAsync<bool>("e => e.validity.valueMissing");
        var emailMissing = await emailBox.EvaluateAsync<bool>("e => e.validity.valueMissing");
        var passMissing = await passBox.EvaluateAsync<bool>("e => e.validity.valueMissing");
        var message = await nameBox.EvaluateAsync<string>("e => e.validationMessage");
        TestContext.Out.WriteLine($"Họ tên bắt buộc: {nameMissing} | Email bắt buộc: {emailMissing} | Mật khẩu bắt buộc: {passMissing}");
        TestContext.Out.WriteLine($"Thông báo tại ô Họ và tên: {message}");

        // Expected 1: cả 3 ô đều được đánh dấu bắt buộc nhập
        Assert.Multiple(() =>
        {
            Assert.That(nameMissing, Is.True, "Họ và tên để trống nhưng không bị báo bắt buộc");
            Assert.That(emailMissing, Is.True, "Email để trống nhưng không bị báo bắt buộc");
            Assert.That(passMissing, Is.True, "Mật khẩu để trống nhưng không bị báo bắt buộc");
        });

        // Expected 2: không tạo tài khoản, vẫn ở form đăng ký
        await Page.WaitForTimeoutAsync(2000);
        await Expect(Page.GetByText("Đăng ký thành công")).ToHaveCountAsync(0);
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "Tạo tài khoản" })).ToBeVisibleAsync();
    }
}