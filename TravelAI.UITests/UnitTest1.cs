
using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;
using NUnit.Framework;

namespace TravelAI.UITests;

public class HomePageTests : PageTest
{
    [Test]
    public async Task HomePage_ShouldDisplayTravelAI()
    {
        // 1. Mở website TravelAI
        await Page.GotoAsync("http://localhost:5173");

        // 2. Kiểm tra tên website hiển thị
        await Expect(
            Page.GetByRole(AriaRole.Link, new() { Name = "TravelAI" })
        ).ToBeVisibleAsync();

        // 3. Kiểm tra nút Đăng nhập hiển thị
        await Expect(
            Page.GetByText("Đăng nhập", new() { Exact = true })
        ).ToBeVisibleAsync();

        // 4. Kiểm tra nút Đăng ký hiển thị
        await Expect(
            Page.GetByText("Đăng ký", new() { Exact = true })
        ).ToBeVisibleAsync();
    }
}
