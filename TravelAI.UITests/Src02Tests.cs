using System.Diagnostics;
using System.Text.RegularExpressions;
using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace TravelAI.UITests;

[TestFixture]
public class Src02Tests : PageTest
{
    private const string BaseUrl = "http://localhost:5173";

    [CancelAfter(180000)]
    [Test]
    public async Task WEB_SRC_02_TimTourHaLong()
    {
        await Page.GotoAsync($"{BaseUrl}/tours?type=Tour");

        // Chờ danh sách ban đầu tải xong (backend có lúc rất chậm)
        await Expect(Page.GetByText("Đang tải dịch vụ")).ToBeHiddenAsync(new() { Timeout = 90000 });
        var countBox = Page.GetByText(new Regex(@"Tìm thấy \d+ dịch vụ"));
        var before = await countBox.InnerTextAsync();
        TestContext.Out.WriteLine($"Trước khi tìm: {before}");

        var searchBox = Page.GetByRole(AriaRole.Textbox, new() { Name = "Tìm theo tên dịch vụ" });
        await searchBox.ClickAsync();
        await searchBox.PressSequentiallyAsync("hạ long", new() { Delay = 80 });

        var sw = Stopwatch.StartNew();
        await searchBox.PressAsync("Enter");
        await Expect(countBox).Not.ToHaveTextAsync(before, new() { Timeout = 60000 });
        sw.Stop();
        await Page.ScreenshotAsync(new() { Path = "src02.png" });

        var after = await countBox.InnerTextAsync();
        var n = int.Parse(Regex.Match(after, @"\d+").Value);
        var body = await Page.Locator("body").InnerTextAsync();
        TestContext.Out.WriteLine($"Sau khi tìm: {after} - mất {sw.ElapsedMilliseconds} ms");

        Assert.Multiple(() =>
        {
            Assert.That(n, Is.GreaterThanOrEqualTo(1), "Không có kết quả nào");
            Assert.That(body, Does.Contain("Hạ Long"), "Kết quả không chứa 'Hạ Long'");
        });

        await Expect(Page.GetByText("Khoảng giá")).ToBeVisibleAsync();
        await Expect(Page.GetByText("Đánh giá").First).ToBeVisibleAsync();
        await Expect(Page.GetByText("Chủ đề tour")).ToBeVisibleAsync();
    }
}