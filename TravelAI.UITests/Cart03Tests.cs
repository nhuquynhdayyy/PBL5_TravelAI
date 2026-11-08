using System.Diagnostics;
using System.Text.RegularExpressions;
using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace TravelAI.UITests;

[TestFixture]
public class Cart03Tests : PageTest
{
    private const string BaseUrl = "http://localhost:5173";

    // Thay bằng tài khoản Customer thật, giỏ có đúng 2 dịch vụ
    private const string Email = "cristiananguyen@gmail.com";
    private const string Password = "123456";

    // Tên dịch vụ theo giỏ hàng hiện tại
    private const string ItemToDelete = "Tour Bà Nà Hills Trọn Gói - Cáp Treo Cầu Vàng";
    private const string ItemToKeep = "Đà Nẵng Beachfront Resort - Villa Mặt Biển";

    private readonly Stopwatch _clock = Stopwatch.StartNew();

    [Test, CancelAfter(600_000)]
    public async Task WEB_CART_03_XoaDichVuKhoiGioHang()
    {
        var problems = new List<string>();
        var slow = new List<string>();
        string? dialogMessage = null;

        // Ghi lại hộp thoại xác nhận (nếu có) và các yêu cầu thay đổi giỏ hàng
        Page.Dialog += (_, d) =>
        {
            dialogMessage = d.Message;
            TestContext.Out.WriteLine($"[HỘP THOẠI {d.Type}] {d.Message}");
            _ = d.AcceptAsync();
        };
        Page.Response += (_, r) =>
        {
            if (r.Url.Contains("/api/cart") && r.Request.Method != "GET")
                TestContext.Out.WriteLine($"[t={_clock.ElapsedMilliseconds,6} ms] {r.Request.Method} {r.Status} {r.Url}");
        };

        // Điều kiện: đăng nhập (có thể mất tới ~25 giây)
        await Page.GotoAsync(BaseUrl + "/login");
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "name@company.com" }).FillAsync(Email);
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "••••••••" }).FillAsync(Password);
        await Page.GetByRole(AriaRole.Main).GetByRole(AriaRole.Button, new() { Name = "Đăng nhập" }).ClickAsync();
        await Expect(Page).Not.ToHaveURLAsync(new Regex(@"/login"), new() { Timeout = 60000 });
        await Page.GotoAsync(BaseUrl);
        var header = Page.GetByRole(AriaRole.Banner);
        await Expect(header.GetByRole(AriaRole.Button, new() { Name = "Đăng nhập" })).ToHaveCountAsync(0);

        // Bước 1: vào Giỏ hàng
        await header.GetByRole(AriaRole.Link, new() { Name = "Giỏ hàng" }).ClickAsync();
        await Expect(Page).ToHaveURLAsync(new Regex(@"/cart"));
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Giỏ hàng của bạn" })).ToBeVisibleAsync();
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = ItemToDelete })).ToBeVisibleAsync();
        await Page.WaitForTimeoutAsync(2000);   // nghỉ như người dùng thật trước khi thao tác

        // Kiểm tra điều kiện: đúng 2 dịch vụ
        if (!(await BodyAsync()).Contains("Chọn tất cả (2 mục)"))
            Assert.Inconclusive("Điều kiện chưa đúng: giỏ hàng cần có đúng 2 dịch vụ (thêm lại dịch vụ đã xóa ở lần chạy trước)");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = ItemToKeep })).ToBeVisibleAsync();

        var priceDelete = await ReadPriceAsync(ItemToDelete);
        var priceKeep = await ReadPriceAsync(ItemToKeep);
        TestContext.Out.WriteLine($"Đơn giá: '{ItemToDelete}' = {priceDelete:N0} | '{ItemToKeep}' = {priceKeep:N0}");

        // Bước 2: tích chọn cả 2 mục để khung Tổng tiền có giá trị
        await Page.GetByText("Chọn tất cả (2 mục)").ClickAsync();
        var before = await WaitTotalsAsync(2, priceDelete + priceKeep);
        TestContext.Out.WriteLine($"[Trước khi xóa] Số mục đã chọn={before.selected} | Tạm tính={before.subtotal:N0} | Thanh toán={before.pay:N0}");
        if (before.selected != 2 || before.subtotal != priceDelete + priceKeep)
            problems.Add($"Trước khi xóa: Số mục đã chọn={before.selected}, Tạm tính={before.subtotal:N0}, mong đợi 2 mục và {(priceDelete + priceKeep):N0}");
        await Page.ScreenshotAsync(new() { Path = "WEB_CART_03_truoc_khi_xoa.png" });

        // Bước 3: bấm "XÓA" ở dịch vụ cần xóa
        var sw = Stopwatch.StartNew();
        await Card(ItemToDelete).GetByRole(AriaRole.Button, new() { NameRegex = new Regex("xóa", RegexOptions.IgnoreCase) }).ClickAsync();

        // Expected 1: dịch vụ biến mất khỏi danh sách (chờ tối đa 60 giây)
        try
        {
            await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = ItemToDelete }))
                .ToHaveCountAsync(0, new() { Timeout = 60000 });
        }
        catch (PlaywrightException)
        {
            await Page.ScreenshotAsync(new() { Path = "WEB_CART_03_loi_khong_xoa.png" });
            var body = await BodyAsync();
            TestContext.Out.WriteLine("Nội dung trang sau 60 giây: " + body[..Math.Min(1500, body.Length)]);
            Assert.Fail($"Bấm XÓA nhưng dịch vụ '{ItemToDelete}' vẫn còn trong danh sách sau 60 giây" +
                        (dialogMessage != null ? $" (web hiện hộp thoại: {dialogMessage})" : ""));
        }
        TestContext.Out.WriteLine($"Dịch vụ biến mất sau {sw.ElapsedMilliseconds} ms");
        if (sw.ElapsedMilliseconds > 3000) slow.Add($"Xóa dịch vụ: giao diện đổi sau {sw.ElapsedMilliseconds} ms");
        if (dialogMessage != null) TestContext.Out.WriteLine($"Ghi chú: web hiện hộp thoại xác nhận trước khi xóa: '{dialogMessage}'");

        // Expected 2: dịch vụ còn lại vẫn hiển thị, danh sách còn 1 mục
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = ItemToKeep })).ToBeVisibleAsync();
        if (!(await BodyAsync()).Contains("Chọn tất cả (1 mục)"))
            problems.Add("Sau khi xóa, không thấy 'Chọn tất cả (1 mục)'");

        // Expected 3: tổng tiền cập nhật đúng theo các mục còn lại
        //   Chấp nhận 2 cách web xử lý lựa chọn sau khi xóa, miễn là số liệu nhất quán:
        //   (a) mục còn lại vẫn được chọn: 1 mục = giá mục còn lại; (b) lựa chọn được đặt lại: 0 mục = 0 VND
        var after = await WaitTotalsAsync(1, priceKeep);
        TestContext.Out.WriteLine($"[Sau khi xóa] Số mục đã chọn={after.selected} | Tạm tính={after.subtotal:N0} | Thanh toán={after.pay:N0}");
        var okA = after.selected == 1 && after.subtotal == priceKeep;
        var okB = after.selected == 0 && after.subtotal == 0;
        if (!okA && !okB)
            problems.Add($"Sau khi xóa: Số mục đã chọn={after.selected}, Tạm tính={after.subtotal:N0}; " +
                         $"mong đợi (1 mục, {priceKeep:N0}) hoặc (0 mục, 0)");
        if (after.pay != after.subtotal)
            TestContext.Out.WriteLine($"  Lưu ý: Thanh toán ({after.pay:N0}) khác Tạm tính ({after.subtotal:N0}), có thể có thuế/phí.");
        await Page.ScreenshotAsync(new() { Path = "WEB_CART_03_sau_khi_xoa.png" });

        // Biểu tượng giỏ hàng trên menu nên về 1 (chỉ ghi chú, SRS không quy định)
        var cartText = Regex.Replace(await header.GetByRole(AriaRole.Link, new() { Name = "Giỏ hàng" }).InnerTextAsync(), @"\s+", " ");
        TestContext.Out.WriteLine($"Menu giỏ hàng: '{cartText}'");
        if (!Regex.IsMatch(cartText, @"\b1\b"))
            slow.Add($"Số lượng trên menu Giỏ hàng chưa về 1 (hiện: '{cartText}')");

        // Expected 4: tải lại trang, dịch vụ đã xóa không xuất hiện lại (backend đã xóa thật)
        await Page.ReloadAsync();
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Giỏ hàng của bạn" })).ToBeVisibleAsync();
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = ItemToKeep })).ToBeVisibleAsync(new() { Timeout = 30000 });
        if (await Page.GetByRole(AriaRole.Heading, new() { Name = ItemToDelete }).CountAsync() != 0)
            problems.Add($"Sau khi tải lại trang, dịch vụ '{ItemToDelete}' xuất hiện lại (backend chưa xóa)");
        await Page.ScreenshotAsync(new() { Path = "WEB_CART_03_sau_khi_tai_lai.png" });

        if (slow.Count > 0) TestContext.Out.WriteLine("CẢNH BÁO TỐC ĐỘ: " + string.Join(" | ", slow));
        Assert.That(problems, Is.Empty, string.Join(" | ", problems));
    }

    // Khối chứa 1 dịch vụ: phần tử bên trong cùng có tiêu đề dịch vụ và nút Xóa
    private ILocator Card(string name) =>
        Page.GetByRole(AriaRole.Heading, new() { Name = name })
            .Locator("xpath=ancestor::*[count(.//button[contains(translate(normalize-space(.),'XÓA','xóa'),'xóa')])=1][1]");

    private async Task<string> BodyAsync() =>
        Regex.Replace(await Page.Locator("body").InnerTextAsync(), @"\s+", " ");

    private static long ToNumber(string s) => long.Parse(Regex.Replace(s, @"[^\d]", ""));

    private async Task<long> ReadPriceAsync(string itemName)
    {
        var text = Regex.Replace(await Card(itemName).InnerTextAsync(), @"\s+", " ");
        var m = Regex.Match(text, @"([\d\.,]+) VND / mục", RegexOptions.IgnoreCase);
        Assert.That(m.Success, $"Không đọc được đơn giá của '{itemName}'");
        return ToNumber(m.Groups[1].Value);
    }

    // Chờ tối đa 5 giây cho khung Tổng tiền đạt giá trị mong đợi, rồi trả về giá trị đọc được
    private async Task<(int selected, long subtotal, long pay)> WaitTotalsAsync(int expectedSelected, long expectedSubtotal)
    {
        var sw = Stopwatch.StartNew();
        (int selected, long subtotal, long pay) t = default;
        while (sw.ElapsedMilliseconds < 5000)
        {
            t = await ReadTotalsAsync();
            if (t.selected == expectedSelected && t.subtotal == expectedSubtotal) break;
            await Page.WaitForTimeoutAsync(200);
        }
        return t;
    }

    private async Task<(int selected, long subtotal, long pay)> ReadTotalsAsync()
    {
        var m = Regex.Match(await BodyAsync(),
            @"Số mục đã chọn (\d+) Tạm t[ií]nh ([\d\.,]+) VND Thanh toán ([\d\.,]+) VND",
            RegexOptions.IgnoreCase);
        Assert.That(m.Success, "Không đọc được khung Tổng tiền (Số mục đã chọn / Tạm tính / Thanh toán)");
        return (int.Parse(m.Groups[1].Value), ToNumber(m.Groups[2].Value), ToNumber(m.Groups[3].Value));
    }
}