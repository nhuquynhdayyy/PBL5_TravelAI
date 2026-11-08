using System.Text.RegularExpressions;
using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace TravelAI.UITests;

[TestFixture]
public class Src04Tests : PageTest
{
    private const string BaseUrl = "http://localhost:5173";

    [CancelAfter(180000)]
    [Test]
    public async Task WEB_SRC_04_NgayTraTruocNgayNhan()
    {
        var nhan = DateTime.Today.AddDays(3).ToString("yyyy-MM-dd");   // ngày mai + 2
        var tra = DateTime.Today.AddDays(1).ToString("yyyy-MM-dd");    // ngày mai

        await Page.GotoAsync($"{BaseUrl}/transportation?type=Transport");
        await Expect(Page.GetByText("Đang tải dịch vụ")).ToBeHiddenAsync(new() { Timeout = 90000 });

        var dates = Page.Locator("input[type='date']");
        await dates.Nth(0).FillAsync(nhan);
        await dates.Nth(1).FillAsync(tra);

        // Cho web thời gian phản ứng (backend chậm)
        await Page.WaitForTimeoutAsync(3000);
        await Expect(Page.GetByText("Đang tải dịch vụ")).ToBeHiddenAsync(new() { Timeout = 60000 });
        await Page.ScreenshotAsync(new() { Path = "src04.png" });

        var body = await Page.Locator("body").InnerTextAsync();
        var hasError = Regex.IsMatch(body, @"phải sau|không hợp lệ|sau ngày nhận", RegexOptions.IgnoreCase);
        var traValue = await dates.Nth(1).InputValueAsync();
        var min = await dates.Nth(1).GetAttributeAsync("min");

        TestContext.Out.WriteLine($"Nhận={nhan}, Trả nhập={tra}, Giá trị ô Trả hiện tại='{traValue}', min='{min}'");
        TestContext.Out.WriteLine($"Có thông báo lỗi: {hasError}");

        // Chấp nhận: có thông báo lỗi, hoặc web đã xóa/chỉnh giá trị sai khỏi ô Ngày trả
        var rejected = hasError || traValue != tra;
        Assert.That(rejected, Is.True,
            $"Web chấp nhận Ngày trả ({tra}) trước Ngày nhận ({nhan}) mà không báo lỗi");
    }
}