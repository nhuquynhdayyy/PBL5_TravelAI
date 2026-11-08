using System.Text.RegularExpressions;
using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace TravelAI.UITests;

[TestFixture]
public class Src08Tests : PageTest
{
    private const string BaseUrl = "http://localhost:5173";

    [CancelAfter(240000)]
    [Test]
    public async Task WEB_SRC_08_LocKhongCoKetQua()
    {
        await Page.GotoAsync($"{BaseUrl}/hotels?type=Hotel");
        await Expect(Page.GetByText("Đang tải dịch vụ")).ToBeHiddenAsync(new() { Timeout = 90000 });

        var tu = Page.GetByRole(AriaRole.Spinbutton, new() { Name = "Từ" });
        var den = Page.GetByRole(AriaRole.Spinbutton, new() { Name = "Đến" });

        await tu.FillAsync("1000");

        // Chờ phản hồi của yêu cầu lọc có chứa giá Đến = 2000 (backend có lúc chậm)
        var waitResponse = Page.WaitForResponseAsync(
            r => r.Url.Contains("/services/filter") && (r.Request.PostData ?? "").Contains("2000"),
            new() { Timeout = 90000 });
        await den.FillAsync("2000");
        await waitResponse;

        var emptyMsg = Page.GetByText("Không tìm thấy dịch vụ phù hợp");
        await Expect(emptyMsg).ToBeVisibleAsync(new() { Timeout = 60000 });
        await Page.ScreenshotAsync(new() { Path = "src08.png" });

        await Expect(Page.GetByText(new Regex(@"Tìm thấy 0 dịch vụ"))).ToBeVisibleAsync();

        var cards = await Page.GetByText("CHI TIET").CountAsync();
        TestContext.Out.WriteLine($"Số thẻ dịch vụ còn hiển thị: {cards}");
        Assert.That(cards, Is.EqualTo(0), "Vẫn còn thẻ dịch vụ hiển thị");
    }
}