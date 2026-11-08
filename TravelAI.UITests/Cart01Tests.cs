using System.Text.RegularExpressions;
using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace TravelAI.UITests;

[TestFixture]
public class Cart01Tests : PageTest
{
    private const string BaseUrl = "http://localhost:5173";

    private const string Email = "cristiananguyen@gmail.com";
    private const string Password = "123456";

    private const string ItemName = "Tour Bà Nà Hills Trọn Gói - Cáp Treo Cầu Vàng";
    private const string ItemDate = "13/6/2026";
    private const string ItemPrice = "750.000 VND";

    [Test, CancelAfter(300_000)]
    public async Task WEB_CART_01_XemGioHangCoDichVu()
    {
        // Điều kiện: đăng nhập (đăng nhập có thể mất tới ~25 giây)
        await Page.GotoAsync(BaseUrl + "/login");
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "name@company.com" }).FillAsync(Email);
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "••••••••" }).FillAsync(Password);
        await Page.GetByRole(AriaRole.Main).GetByRole(AriaRole.Button, new() { Name = "Đăng nhập" }).ClickAsync();
        await Expect(Page).Not.ToHaveURLAsync(new Regex(@"/login"), new() { Timeout = 60000 });
        await Page.GotoAsync(BaseUrl);
        var header = Page.GetByRole(AriaRole.Banner);
        await Expect(header.GetByRole(AriaRole.Button, new() { Name = "Đăng nhập" })).ToHaveCountAsync(0);

        // Bước 2: bấm "Giỏ hàng" trên thanh menu
        await header.GetByRole(AriaRole.Link, new() { Name = "Giỏ hàng" }).ClickAsync();
        await Expect(Page).ToHaveURLAsync(new Regex(@"/cart"));
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Giỏ hàng của bạn" })).ToBeVisibleAsync();

        // Expected 1: danh sách dịch vụ gồm tên, ngày, số lượng, giá
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = ItemName })).ToBeVisibleAsync();
        await Expect(Page.GetByText(ItemDate).First).ToBeVisibleAsync();
        await Expect(Page.GetByText(new Regex(@"Số lượng:\s*-?\s*1\s*\+?"))).ToBeVisibleAsync();
        await Expect(Page.GetByText(ItemPrice, new() { Exact = true }).First).ToBeVisibleAsync();
        await Expect(Page.GetByText("Chọn tất cả (1 mục)")).ToBeVisibleAsync();

        // Expected 2: khung "Tổng tiền" (chưa chọn mục nào thì bằng 0 VND)
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Tổng tiền" })).ToBeVisibleAsync();
        var before = Regex.Replace(await Page.Locator("body").InnerTextAsync(), @"\s+", " ");
        TestContext.Out.WriteLine("Trước khi chọn: " + Regex.Match(before, @"Số mục đã chọn.*?Thanh toán.{0,20}").Value);
        Assert.That(before, Does.Match(@"Số mục đã chọn 0 Tạm t[ií]nh 0 VND"),
            "Chưa chọn mục nào nhưng Số mục đã chọn/Tạm tính khác 0");
        await Page.ScreenshotAsync(new() { Path = "WEB_CART_01_truoc_khi_chon.png" });

        // Expected 3: tích chọn mục thì Số mục đã chọn và Tạm tính cập nhật
        await Page.GetByText("Chọn tất cả (1 mục)").ClickAsync();
        await Expect(Page.GetByText(new Regex(@"Số mục đã chọn"))).ToBeVisibleAsync();
        await Page.WaitForTimeoutAsync(1000);
        var after = Regex.Replace(await Page.Locator("body").InnerTextAsync(), @"\s+", " ");
        TestContext.Out.WriteLine("Sau khi chọn: " + Regex.Match(after, @"Số mục đã chọn.*?Thanh toán.{0,20}").Value);
        Assert.That(after, Does.Match(@"Số mục đã chọn 1 Tạm t[ií]nh " + Regex.Escape(ItemPrice)),
            "Chọn mục nhưng Số mục đã chọn/Tạm tính không cập nhật đúng");
        await Page.ScreenshotAsync(new() { Path = "WEB_CART_01_sau_khi_chon.png" });
    }
}