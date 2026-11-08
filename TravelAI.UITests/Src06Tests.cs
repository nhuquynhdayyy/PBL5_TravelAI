using System.Text.RegularExpressions;
using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace TravelAI.UITests;

[TestFixture]
public class Src06Tests : PageTest
{
    private const string BaseUrl = "http://localhost:5173";

    [CancelAfter(180000)]
    [Test]
    public async Task WEB_SRC_06_TimKhongCoKetQua()
    {
        await Page.GotoAsync($"{BaseUrl}/hotels?type=Hotel");
        await Expect(Page.GetByText("Đang tải dịch vụ")).ToBeHiddenAsync(new() { Timeout = 90000 });

        var searchBox = Page.GetByRole(AriaRole.Textbox, new() { Name = "Tìm theo tên dịch vụ" });
        await searchBox.ClickAsync();
        await searchBox.PressSequentiallyAsync("Xyzabc", new() { Delay = 80 });
        await searchBox.PressAsync("Enter");

        // Backend có lúc chậm, chờ tối đa 60 giây
        var emptyMsg = Page.GetByText("Không tìm thấy dịch vụ phù hợp");
        await Expect(emptyMsg).ToBeVisibleAsync(new() { Timeout = 60000 });
        await Page.ScreenshotAsync(new() { Path = "src06.png" });

        await Expect(Page.GetByText(new Regex(@"Tìm thấy 0 dịch vụ"))).ToBeVisibleAsync();

        // Không còn thẻ dịch vụ nào (nút "Chi tiết" của thẻ)
        var cards = await Page.GetByText("CHI TIET").CountAsync();
        TestContext.Out.WriteLine($"Số thẻ dịch vụ còn hiển thị: {cards}");
        Assert.That(cards, Is.EqualTo(0), "Vẫn còn thẻ dịch vụ hiển thị");
    }
}