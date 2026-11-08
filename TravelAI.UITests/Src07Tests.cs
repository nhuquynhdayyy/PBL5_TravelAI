using System.Text.RegularExpressions;
using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace TravelAI.UITests;

[TestFixture]
public class Src07Tests : PageTest
{
    private const string BaseUrl = "http://localhost:5173";
    private const int Min = 500000;
    private const int Max = 2000000;

    [CancelAfter(240000)]
    [Test]
    public async Task WEB_SRC_07_LocTheoKhoangGia()
    {
        await Page.GotoAsync($"{BaseUrl}/hotels?type=Hotel");
        await Expect(Page.GetByText("Đang tải dịch vụ")).ToBeHiddenAsync(new() { Timeout = 90000 });

        var tu = Page.GetByRole(AriaRole.Spinbutton, new() { Name = "Từ" });
        var den = Page.GetByRole(AriaRole.Spinbutton, new() { Name = "Đến" });

        await tu.FillAsync(Min.ToString());

        // Chờ phản hồi của yêu cầu lọc có chứa giá Đến = 2000000 (backend có lúc chậm)
        var waitResponse = Page.WaitForResponseAsync(
            r => r.Url.Contains("/services/filter") && (r.Request.PostData ?? "").Contains(Max.ToString()),
            new() { Timeout = 90000 });
        await den.FillAsync(Max.ToString());
        await waitResponse;

        await Page.WaitForTimeoutAsync(1500);
        await Expect(Page.GetByText("Đang tải dịch vụ")).ToBeHiddenAsync(new() { Timeout = 60000 });
        await Page.ScreenshotAsync(new() { Path = "src07.png" });

        var body = await Page.Locator("body").InnerTextAsync();
        var prices = Regex.Matches(body, @"(\d{1,3}(?:\.\d{3})+)\s*đ")
            .Select(m => int.Parse(m.Groups[1].Value.Replace(".", "")))
            .ToList();

        TestContext.Out.WriteLine($"Số giá đọc được: {prices.Count}; giá: {string.Join(", ", prices)}");

        Assert.That(prices, Is.Not.Empty, "Không có khách sạn nào trong khoảng giá (hoặc không đọc được giá)");
        var outside = prices.Where(p => p < Min || p > Max).ToList();
        Assert.That(outside, Is.Empty,
            $"Có giá nằm ngoài {Min:N0} - {Max:N0}: {string.Join(", ", outside)}");
    }
}