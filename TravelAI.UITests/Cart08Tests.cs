
using System.Text.RegularExpressions;
using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace TravelAI.UITests;

[TestFixture]
public class Cart08Tests : PageTest
{
    private const string BaseUrl = "http://localhost:5173";

    private const string Email = "cristiananguyen@gmail.com";
    private const string Password = "123456";

    private const string InvalidPhone = "090512345";

    private static readonly Regex CheckoutButton =
        new(@"Tiến hành (thanh toán|đặt chỗ)", RegexOptions.IgnoreCase);

    [Test, CancelAfter(180_000)]
    public async Task WEB_CART_08_ThongTinLienHeKhongHopLe()
    {
        // ==========================================
        // STEP 1: LOGIN
        // ==========================================

        await Page.GotoAsync(BaseUrl + "/login");

        await Page.GetByRole(
            AriaRole.Textbox,
            new() { Name = "name@company.com" }
        ).FillAsync(Email);

        await Page.GetByRole(
            AriaRole.Textbox,
            new() { Name = "••••••••" }
        ).FillAsync(Password);

        await Page.GetByRole(AriaRole.Main)
            .GetByRole(
                AriaRole.Button,
                new() { Name = "Đăng nhập" }
            ).ClickAsync();

        // Wait until login is completed.
        await Expect(Page).Not.ToHaveURLAsync(
            new Regex(@"/login"),
            new() { Timeout = 60000 }
        );

        await Page.GotoAsync(BaseUrl);

        var header = Page.GetByRole(AriaRole.Banner);

        await Expect(
            header.GetByRole(
                AriaRole.Button,
                new() { Name = "Đăng nhập" }
            )
        ).ToHaveCountAsync(0);

        TestContext.Out.WriteLine("Đăng nhập thành công.");

        // ==========================================
        // STEP 2: OPEN CART
        // ==========================================

        await header.GetByRole(
            AriaRole.Link,
            new() { Name = "Giỏ hàng" }
        ).ClickAsync();

        await Expect(Page).ToHaveURLAsync(
            new Regex(@"/cart")
        );

        var card = Page.GetByRole(AriaRole.Article).First;

        try
        {
            await card.WaitForAsync(
                new() { Timeout = 30000 }
            );
        }
        catch (Exception ex) when (
            ex is PlaywrightException ||
            ex is System.TimeoutException)
        {
            await Page.ScreenshotAsync(new()
            {
                Path = "WEB_CART_08_cart_empty.png",
                FullPage = true
            });

            Assert.Inconclusive(
                "Giỏ hàng đang trống. Cart08 cần có ít nhất một dịch vụ " +
                "trong giỏ hàng trước khi kiểm tra thông tin liên hệ."
            );
        }

        await Page.WaitForTimeoutAsync(1000);

        var itemName = (
            await card.GetByRole(AriaRole.Heading)
                .First.InnerTextAsync()
        ).Trim();

        TestContext.Out.WriteLine(
            "Dịch vụ trong giỏ hàng: " + itemName
        );

        // ==========================================
        // STEP 3: SELECT CART ITEM
        // ==========================================

        var selectedText = await Page.Locator("body").InnerTextAsync();

        var selectedMatch = Regex.Match(
            selectedText,
            @"Số mục đã chọn (\d+)",
            RegexOptions.IgnoreCase
        );

        int selectedCount = selectedMatch.Success
            ? int.Parse(selectedMatch.Groups[1].Value)
            : 0;

        if (selectedCount == 0)
        {
            var selectAll = Page.GetByText(
                new Regex(@"Chọn tất cả \(\d+ mục\)")
            );

            await selectAll.ClickAsync();
        }

        var checkout = Page.GetByRole(
            AriaRole.Button,
            new() { NameRegex = CheckoutButton }
        ).First;

        await Expect(checkout).ToBeEnabledAsync(
            new() { Timeout = 15000 }
        );

        await Page.ScreenshotAsync(new()
        {
            Path = "WEB_CART_08_cart_selected.png",
            FullPage = true
        });

        // ==========================================
        // STEP 4: GO TO CHECKOUT
        // ==========================================

        await checkout.ClickAsync();

        await Page.WaitForURLAsync(
            new Regex(@"/checkout/\d+"),
            new() { Timeout = 60000 }
        );

        await Page.WaitForTimeoutAsync(1500);

        TestContext.Out.WriteLine(
            "Đã chuyển đến Checkout: " + Page.Url
        );

        await Page.ScreenshotAsync(new()
        {
            Path = "WEB_CART_08_checkout.png",
            FullPage = true
        });

        // ==========================================
        // STEP 5: LOCATE CONTACT FIELDS
        // ==========================================

        var fullName = Page.GetByRole(
            AriaRole.Textbox,
            new() { Name = "Ho ten khach hang" }
        );

        var phone = Page.GetByRole(
            AriaRole.Textbox,
            new() { Name = "So dien thoai" }
        );

        Assert.That(
            await fullName.CountAsync(),
            Is.GreaterThan(0),
            "Không tìm thấy trường Họ tên khách hàng."
        );

        Assert.That(
            await phone.CountAsync(),
            Is.GreaterThan(0),
            "Không tìm thấy trường Số điện thoại."
        );

        TestContext.Out.WriteLine(
            "Đã tìm thấy trường Họ tên và Số điện thoại."
        );

        
        // ==========================================
        // STEP 6: TEST EMPTY FULL NAME
        // ==========================================

        TestContext.Out.WriteLine(
            "===== TEST EMPTY FULL NAME ====="
        );

        await fullName.FillAsync("");
        await phone.FillAsync("0905123456");

        // Trigger the actual website validation.
        var momoButton = Page.GetByRole(
            AriaRole.Button,
            new()
            {
                Name = "Thanh toán qua MoMo Redirect"
            }
        );

        await Expect(momoButton).ToBeVisibleAsync();

        await momoButton.ClickAsync();

        await Page.WaitForTimeoutAsync(1000);

        var emptyNameBody = Regex.Replace(
            await Page.Locator("body").InnerTextAsync(),
            @"\s+",
            " "
        );

        TestContext.Out.WriteLine(
            "Sau khi gửi Họ tên trống: " + emptyNameBody
        );

        await Page.ScreenshotAsync(new()
        {
            Path = "WEB_CART_08_empty_fullname.png",
            FullPage = true
        });

        // The website must not proceed to the payment gateway.
        Assert.That(
            Page.Url,
            Does.Match(@"/checkout/\d+"),
            "Website đã rời Checkout dù Họ tên đang trống."
        );

        // ==========================================
        // STEP 7: TEST INVALID PHONE
        // ==========================================

        TestContext.Out.WriteLine(
            "===== TEST INVALID PHONE ====="
        );

        await fullName.FillAsync("Nguyen Van A");
        await phone.FillAsync(InvalidPhone);

        await momoButton.ClickAsync();

        await Page.WaitForTimeoutAsync(1000);

        var invalidPhoneBody = Regex.Replace(
            await Page.Locator("body").InnerTextAsync(),
            @"\s+",
            " "
        );

        TestContext.Out.WriteLine(
            "Sau khi gửi SĐT không hợp lệ: " + invalidPhoneBody
        );

        await Page.ScreenshotAsync(new()
        {
            Path = "WEB_CART_08_invalid_phone.png",
            FullPage = true
        });

        Assert.That(
            Page.Url,
            Does.Match(@"/checkout/\d+"),
            "Website đã rời Checkout dù SĐT không hợp lệ."
        );

        // ==========================================
        // STEP 8: FINAL RESULT
        // ==========================================

        TestContext.Out.WriteLine(
            "Đã thực hiện gửi form với Họ tên trống " +
            "và SĐT không hợp lệ."
        );


        // ==========================================
        // STEP 8: FINAL RESULT
        // ==========================================

        Assert.That(
            Page.Url,
            Does.Match(@"/checkout/\d+"),
            "Không còn ở trang Checkout."
        );

        TestContext.Out.WriteLine(
            "=========================================="
        );

        TestContext.Out.WriteLine(
            "WEB_CART_08 PASSED"
        );

        TestContext.Out.WriteLine(
            "Đã kiểm tra Họ tên trống và SĐT không hợp lệ."
        );

        TestContext.Out.WriteLine(
            "=========================================="
        );
    }
}
