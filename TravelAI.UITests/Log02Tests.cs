using System.Text.RegularExpressions;
using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace TravelAI.UITests;

[TestFixture]
public class Log02Tests : PageTest
{
    private const string BaseUrl = "http://localhost:5173";

    // Tài khoản Partner đã kích hoạt, hồ sơ đã được Admin duyệt
    private const string PartnerEmail = "partner.hanoihotel@gmail.com";
    private const string PartnerPassword = "123456";
    private const string PartnerName = "Trần Minh Đức";

    [Test]
    public async Task WEB_LOG_02_DangNhapThanhCongPartner()
    {
        // Bước 1: mở website, bấm "Đăng nhập" ở header
        await Page.GotoAsync(BaseUrl);
        var header = Page.GetByRole(AriaRole.Banner);
        await header.GetByRole(AriaRole.Button, new() { Name = "Đăng nhập" }).ClickAsync();
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Chào mừng quay lại" }))
            .ToBeVisibleAsync();

        // Bước 2: nhập email và mật khẩu của Partner
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "name@company.com" }).FillAsync(PartnerEmail);
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "••••••••" }).FillAsync(PartnerPassword);

        // Bước 3: bấm "Đăng nhập" trong form (chờ lâu vì đăng nhập có thể mất ~25 giây)
        await Page.GetByRole(AriaRole.Main).GetByRole(AriaRole.Button, new() { Name = "Đăng nhập" }).ClickAsync();

        // Expected 1: chuyển hướng đến trang quản trị của Partner
        await Expect(Page).ToHaveURLAsync(new Regex(@"/partner/dashboard"),
            new() { Timeout = 60000 });

        // Expected 2: hiển thị Bảng điều khiển doanh thu của Partner
        await Expect(Page.GetByRole(AriaRole.Heading,
            new() { NameRegex = new Regex("Bảng điều khiển doanh thu", RegexOptions.IgnoreCase) }))
            .ToBeVisibleAsync();

        // Expected 3: header hiển thị tên người dùng và menu của Partner
        await Expect(header.GetByText(PartnerName)).ToBeVisibleAsync();
        await Expect(header.GetByText("Doanh nghiệp")).ToBeVisibleAsync();

        // Expected 4: không có menu của Customer, không còn nút Đăng nhập/Đăng ký
        await Expect(header.GetByText("Giỏ hàng")).ToHaveCountAsync(0);
        await Expect(header.GetByRole(AriaRole.Button, new() { Name = "Đăng nhập" })).ToHaveCountAsync(0);
        await Expect(header.GetByRole(AriaRole.Button, new() { Name = "Đăng ký" })).ToHaveCountAsync(0);

        await Page.ScreenshotAsync(new() { Path = "WEB_LOG_02_pass.png" });
    }
}