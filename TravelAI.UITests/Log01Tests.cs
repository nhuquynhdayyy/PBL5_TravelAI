using System.Diagnostics;
using System.Text.RegularExpressions;
using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace TravelAI.UITests;

[TestFixture]
public class Log01Tests : PageTest
{
    private const string BaseUrl = "http://localhost:5173";

    private const string CustomerEmail = "cristiananguyen@gmail.com";
    private const string CustomerPassword = "123456";
    private const string CustomerName = "Nguyễn Như Quỳnh";

    [Test]
    public async Task WEB_LOG_01_DangNhapThanhCongCustomer()
    {
        var sw = new Stopwatch();

        // Ghi lại các yêu cầu POST (đăng nhập) để biết web trả lời thế nào
        Page.Response += (_, r) =>
        {
            if (r.Request.Method == "POST")
                TestContext.Out.WriteLine($"[POST] {r.Status} {r.Url} sau {sw.ElapsedMilliseconds} ms");
        };
        Page.RequestFailed += (_, r) =>
            TestContext.Out.WriteLine($"[REQUEST FAILED] {r.Method} {r.Url} - {r.Failure}");

        // Bước 1: mở website, bấm "Đăng nhập" ở header
        await Page.GotoAsync(BaseUrl);
        var header = Page.GetByRole(AriaRole.Banner);
        await header.GetByRole(AriaRole.Button, new() { Name = "Đăng nhập" }).ClickAsync();
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Chào mừng quay lại" }))
            .ToBeVisibleAsync();

        // Bước 2: nhập email và mật khẩu
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "name@company.com" }).FillAsync(CustomerEmail);
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "••••••••" }).FillAsync(CustomerPassword);

        // Bước 3: bấm "Đăng nhập" trong form
        sw.Start();
        await Page.GetByRole(AriaRole.Main).GetByRole(AriaRole.Button, new() { Name = "Đăng nhập" }).ClickAsync();

        // Expected 1: chuyển hướng đến trang chủ (chờ tối đa 60 giây)
        await Expect(Page).ToHaveURLAsync(new Regex(@"^http://localhost:5173/?$"),
            new() { Timeout = 60000 });
        TestContext.Out.WriteLine($"Đăng nhập xong sau {sw.ElapsedMilliseconds} ms");

        // Expected 2: header hiển thị trạng thái đã đăng nhập
        await Expect(header.GetByText(CustomerName)).ToBeVisibleAsync();
        await Expect(header.GetByRole(AriaRole.Button, new() { Name = "Thông báo" })).ToBeVisibleAsync();

        // Expected 3: nút "Đăng nhập" và "Đăng ký" không còn hiển thị
        await Expect(header.GetByRole(AriaRole.Button, new() { Name = "Đăng nhập" })).ToHaveCountAsync(0);
        await Expect(header.GetByRole(AriaRole.Button, new() { Name = "Đăng ký" })).ToHaveCountAsync(0);

        await Page.ScreenshotAsync(new() { Path = "WEB_LOG_01_pass.png" });
    }
}