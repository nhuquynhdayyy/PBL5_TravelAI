using System.Diagnostics;
using System.Text.RegularExpressions;
using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace TravelAI.UITests;

[TestFixture]
public class Src03Tests : PageTest
{
    private const string BaseUrl = "http://localhost:5173";

    [CancelAfter(180000)]
    [Test]
    public async Task WEB_SRC_03_LocXeTheoLoaiXe()
    {
        await Page.GotoAsync($"{BaseUrl}/transportation?type=Transport");
        await Expect(Page.GetByText("Đang tải dịch vụ")).ToBeHiddenAsync(new() { Timeout = 90000 });

        var countBox = Page.GetByText(new Regex(@"Tìm thấy \d+ dịch vụ"));
        var before = await countBox.InnerTextAsync();
        TestContext.Out.WriteLine($"Trước khi lọc: {before}");

        // Ô chọn Loại xe là thẻ <select> có option "Motorbike"
        var vehicleSelect = Page.Locator("select").Filter(new() { Has = Page.Locator("option[value='Motorbike']") });

        var sw = Stopwatch.StartNew();
        await vehicleSelect.SelectOptionAsync("Motorbike");
        await Expect(countBox).Not.ToHaveTextAsync(before, new() { Timeout = 60000 });
        sw.Stop();
        await Page.ScreenshotAsync(new() { Path = "src03.png" });

        var after = await countBox.InnerTextAsync();
        var n = int.Parse(Regex.Match(after, @"\d+").Value);
        var body = await Page.Locator("body").InnerTextAsync();
        TestContext.Out.WriteLine($"Sau khi lọc: {after} - mất {sw.ElapsedMilliseconds} ms");

        Assert.Multiple(() =>
        {
            Assert.That(n, Is.GreaterThanOrEqualTo(1), "Không có kết quả nào");
            Assert.That(body, Does.Contain("xe máy").IgnoreCase, "Kết quả không có xe máy");
            Assert.That(body, Does.Not.Contain("Thuê xe ô tô").IgnoreCase, "Kết quả lẫn xe ô tô");
        });
    }
}