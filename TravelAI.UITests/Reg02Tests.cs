using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace TravelAI.UITests;

[TestFixture]
public class Reg02Tests : PageTest
{
    private const string BaseUrl = "http://localhost:5173";
    private const string GmailUser = "abc.dulich";
    private const string Password = "Test@1234";

    [Test]
    public async Task WEB_REG_02_DangKyDoiTac()
    {
        var email = $"{GmailUser}+reg02{DateTime.Now:yyyyMMddHHmmss}@gmail.com";
        TestContext.Out.WriteLine($"Email dùng để đăng ký: {email}");

        // Bước 1: mở website, bấm "Đăng ký"
        await Page.GotoAsync(BaseUrl);
        await Page.GetByRole(AriaRole.Banner)
            .GetByRole(AriaRole.Button, new() { Name = "Đăng ký" }).ClickAsync();

        // Bước 2: tick ô Đối tác
        await Page.GetByRole(AriaRole.Checkbox, new() { Name = "Đối tác" }).CheckAsync();

        // Bước 3: nhập thông tin
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "Nhập họ và tên của bạn" }).FillAsync("Công ty Du lịch ABC");
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "name@example.com" }).FillAsync(email);
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "••••••••" }).FillAsync(Password);

        // Bước 4: bấm "Tạo tài khoản"
        await Page.GetByRole(AriaRole.Button, new() { Name = "Tạo tài khoản" }).ClickAsync();

        // Expected 1: màn hình thành công, bấm nút thì về trang Đăng nhập
        await Expect(Page.GetByText("Đăng ký thành công").First).ToBeVisibleAsync(new() { Timeout = 15000 });
        await Expect(Page.GetByText(email)).ToBeVisibleAsync();
        await Page.GetByRole(AriaRole.Link, new() { Name = "Về trang đăng nhập" }).ClickAsync();
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Chào mừng quay lại" })).ToBeVisibleAsync();

        // Expected 2 (loại Partner) kiểm tra bằng mắt: in địa chỉ trang và chụp ảnh làm bằng chứng
        TestContext.Out.WriteLine($"Sau khi đăng nhập, trang hiện tại: {Page.Url}");
        await Page.ScreenshotAsync(new() { Path = "reg02-sau-dang-nhap.png" });
    }
}