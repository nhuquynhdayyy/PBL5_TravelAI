using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace TravelAI.UITests;

[TestFixture]
public class Reg06Tests : PageTest
{
    private const string BaseUrl = "http://localhost:5173";
    private const string GmailUser = "abcd";

    [Test]
    public async Task WEB_REG_06_MatKhauDung8KyTu()
    {
        var email = $"{GmailUser}+reg06{DateTime.Now:yyyyMMddHHmmss}@gmail.com";
        TestContext.Out.WriteLine($"Email dùng để đăng ký: {email}");

        // Bước 1: mở website, bấm "Đăng ký"
        await Page.GotoAsync(BaseUrl);
        await Page.GetByRole(AriaRole.Banner)
            .GetByRole(AriaRole.Button, new() { Name = "Đăng ký" }).ClickAsync();

        // Bước 2: nhập thông tin, mật khẩu đúng 8 ký tự
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "Nhập họ và tên của bạn" }).FillAsync("Nguyễn Văn A");
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "name@example.com" }).FillAsync(email);
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "••••••••" }).FillAsync("Test@123");

        // Bước 3: bấm "Tạo tài khoản"
        await Page.GetByRole(AriaRole.Button, new() { Name = "Tạo tài khoản" }).ClickAsync();

        // Expected 1: hiện màn hình thành công kèm email đã nhập
        await Expect(Page.GetByText("Đăng ký thành công").First).ToBeVisibleAsync(new() { Timeout = 15000 });
        await Expect(Page.GetByText(email)).ToBeVisibleAsync();

        // Expected 2: bấm "Về trang đăng nhập" thì chuyển về trang Đăng nhập
        await Page.GetByRole(AriaRole.Link, new() { Name = "Về trang đăng nhập" }).ClickAsync();
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Chào mừng quay lại" }))
            .ToBeVisibleAsync();
    }
}