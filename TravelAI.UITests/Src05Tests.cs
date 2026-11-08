using System.Text.RegularExpressions;
using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace TravelAI.UITests;

[TestFixture]
public class Src05Tests : PageTest
{
    private const string BaseUrl = "http://localhost:5173";
    private const string ErrorPattern = @"quá khứ|không hợp lệ|trước ngày hôm nay|ngày hiện tại";

    [CancelAfter(180000)]
    [Test]
    public async Task WEB_SRC_05_NgayNhanQuaKhu()
    {
        var homQua = DateTime.Today.AddDays(-1).ToString("yyyy-MM-dd");
        var homNay = DateTime.Today.ToString("yyyy-MM-dd");

        await Page.GotoAsync($"{BaseUrl}/hotels?type=Hotel");
        await Expect(Page.GetByText("Đang tải dịch vụ")).ToBeHiddenAsync(new() { Timeout = 90000 });

        var checkIn = Page.Locator("input[type='date']").Nth(0);
        var min = await checkIn.GetAttributeAsync("min");

        // Bước 2: gõ ngày hôm qua
        await checkIn.FillAsync(homQua);
        await Page.WaitForTimeoutAsync(3000);
        await Expect(Page.GetByText("Đang tải dịch vụ")).ToBeHiddenAsync(new() { Timeout = 60000 });
        await Page.ScreenshotAsync(new() { Path = "src05_homqua.png" });

        var body1 = await Page.Locator("body").InnerTextAsync();
        var hasError1 = Regex.IsMatch(body1, ErrorPattern, RegexOptions.IgnoreCase);
        var value1 = await checkIn.InputValueAsync();
        TestContext.Out.WriteLine($"[Hôm qua={homQua}] min='{min}', giá trị ô='{value1}', có lỗi={hasError1}");

        // Bước 3: gõ ngày hôm nay
        await checkIn.FillAsync(homNay);
        await Page.WaitForTimeoutAsync(3000);
        await Expect(Page.GetByText("Đang tải dịch vụ")).ToBeHiddenAsync(new() { Timeout = 60000 });
        await Page.ScreenshotAsync(new() { Path = "src05_homnay.png" });

        var body2 = await Page.Locator("body").InnerTextAsync();
        var hasError2 = Regex.IsMatch(body2, ErrorPattern, RegexOptions.IgnoreCase);
        var value2 = await checkIn.InputValueAsync();
        TestContext.Out.WriteLine($"[Hôm nay={homNay}] giá trị ô='{value2}', có lỗi={hasError2}");

        Assert.Multiple(() =>
        {
            Assert.That(hasError1 || value1 != homQua, Is.True,
                $"Web chấp nhận ngày quá khứ ({homQua}) mà không báo lỗi");
            Assert.That(value2 == homNay && !hasError2, Is.True,
                "Ngày hôm nay không được chấp nhận hoặc bị báo lỗi");
        });
    }
}