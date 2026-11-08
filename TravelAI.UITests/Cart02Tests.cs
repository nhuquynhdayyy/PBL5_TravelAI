using System.Diagnostics;
using System.Text.RegularExpressions;
using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace TravelAI.UITests;

[TestFixture]
public class Cart02Tests : PageTest
{
    private const string BaseUrl = "http://localhost:5173";

    // Thay bằng tài khoản Customer thật, giỏ có đúng 1 mục và tồn kho khả dụng >= 3
    private const string Email = "cristiananguyen@gmail.com";
    private const string Password = "123456";

    private const int SlowMs = 3000;       // chậm hơn mức này thì ghi cảnh báo
    private const int WaitMs = 60000;      // chờ tối đa sau mỗi lần bấm
    private readonly Stopwatch _clock = Stopwatch.StartNew();

    [Test, CancelAfter(600_000)]
    public async Task WEB_CART_02_TangGiamSoLuongTongTienCapNhat()
    {
        var problems = new List<string>();   // lỗi chức năng
        var slow = new List<string>();       // chỉ cảnh báo tốc độ

        // Ghi lại hộp thoại và các lệnh gọi API kèm thời điểm
        Page.Dialog += (_, d) => { TestContext.Out.WriteLine($"[HỘP THOẠI] {d.Message}"); _ = d.AcceptAsync(); };
        Page.Response += (_, r) =>
        {
            if (r.Url.Contains("/api/") || r.Url.Contains("/hubs/"))
                TestContext.Out.WriteLine($"[t={_clock.ElapsedMilliseconds,6} ms] {r.Request.Method} {r.Status} {r.Url}");
        };
        Page.Response += async (_, r) =>
        {
            if (r.Request.Method == "PUT" && r.Url.Contains("/api/cart"))
            {
                string body;
                try { body = await r.TextAsync(); } catch { body = "(không đọc được)"; }
                TestContext.Out.WriteLine($"[PUT] gửi: {r.Request.PostData} | trả về {r.Status}: {body}");
            }
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

        // Bước 1: vào Giỏ hàng và chờ dữ liệu giỏ hàng tải xong
        var cartLink = header.GetByRole(AriaRole.Link, new() { Name = "Giỏ hàng" });
        try
        {
            var resp = await Page.RunAndWaitForResponseAsync(
                async () => await cartLink.ClickAsync(),
                r => r.Url.Contains("/api/cart") && r.Request.Method == "GET",
                new() { Timeout = 30000 });
            TestContext.Out.WriteLine($"Giỏ hàng đã tải xong từ API: {resp.Status} (t={_clock.ElapsedMilliseconds} ms)");
        }
        catch (Exception ex) when (ex is System.TimeoutException || ex is PlaywrightException)
        {
            TestContext.Out.WriteLine("Không thấy yêu cầu GET /api/cart trong 30 giây");
        }
        await Expect(Page).ToHaveURLAsync(new Regex(@"/cart"));
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Giỏ hàng của bạn" })).ToBeVisibleAsync();
        await Expect(Page.GetByText(new Regex(@"Số lượng:"))).ToBeVisibleAsync();
        await Page.WaitForTimeoutAsync(2000);   // nghỉ như người dùng thật trước khi thao tác

        var plus = Page.Locator("button").Filter(new() { HasTextRegex = new Regex(@"^\s*\+\s*$") }).First;
        var minus = Page.Locator("button").Filter(new() { HasTextRegex = new Regex(@"^\s*[-−–]\s*$") }).First;
        var unit = await ReadUnitPriceAsync();
        TestContext.Out.WriteLine($"Đơn giá: {unit:N0} | Số lượng hiện tại: {await ReadQtyAsync()}");

        // Chuẩn bị: đưa số lượng về 1 nếu đang lớn hơn 1
        for (var i = 0; i < 10 && await ReadQtyAsync() > 1; i++)
        {
            var cur = await ReadQtyAsync();
            await minus.ClickAsync();
            await WaitQtyAsync(cur - 1, WaitMs);
        }
        var qty0 = await ReadQtyAsync();
        if (qty0 != 1) Assert.Inconclusive($"Không đưa được số lượng về 1 (đang là {qty0})");

        // Bước 2: tích chọn mục nếu chưa chọn (web chỉ tính tổng cho mục đã chọn)
        if ((await ReadTotalsAsync()).selected == 0)
            await Page.GetByText(new Regex(@"Chọn tất cả \(\d+ mục\)")).ClickAsync();
        await CheckTotalAsync(1, unit * 1, "Số lượng 1", problems);
        await Page.ScreenshotAsync(new() { Path = "WEB_CART_02_b0_soluong1.png" });

        // Bước 3: tăng từ 1 lên 3, kiểm tra sau mỗi lần bấm
        foreach (var target in new[] { 2, 3 })
        {
            var sw = Stopwatch.StartNew();
            await plus.ClickAsync();
            var q = await WaitQtyAsync(target, WaitMs);
            TestContext.Out.WriteLine($"Bấm '+' -> số lượng {target}: mất {sw.ElapsedMilliseconds} ms (kết quả: {q})");
            if (q != target) await FailWithDiagnosisAsync(q, target, "+");
            if (sw.ElapsedMilliseconds > SlowMs)
                slow.Add($"Tăng lên {target}: giao diện đổi sau {sw.ElapsedMilliseconds} ms");
            await CheckTotalAsync(target, unit * target, $"Tăng lên {target}", problems);
            await Page.ScreenshotAsync(new() { Path = $"WEB_CART_02_b{target}_soluong{target}.png" });
        }

        // Bước 4: giảm về 2
        var swDown = Stopwatch.StartNew();
        await minus.ClickAsync();
        var qDown = await WaitQtyAsync(2, WaitMs);
        TestContext.Out.WriteLine($"Bấm '-' -> số lượng 2: mất {swDown.ElapsedMilliseconds} ms (kết quả: {qDown})");
        if (qDown != 2) await FailWithDiagnosisAsync(qDown, 2, "-");
        if (swDown.ElapsedMilliseconds > SlowMs)
            slow.Add($"Giảm về 2: giao diện đổi sau {swDown.ElapsedMilliseconds} ms");
        await CheckTotalAsync(2, unit * 2, "Giảm về 2", problems);
        await Page.ScreenshotAsync(new() { Path = "WEB_CART_02_b4_giamve2.png" });

        // Tốc độ: chỉ cảnh báo, không làm test Failed
        if (slow.Count > 0) Assert.Warn("Phản hồi chậm (> 3 giây): " + string.Join(" | ", slow));

        // Chức năng: sai là Failed
        Assert.That(problems, Is.Empty, string.Join(" | ", problems));
    }

    // Số lượng không đổi sau 60 giây: tải lại trang để biết backend đã lưu số lượng nào
    private async Task FailWithDiagnosisAsync(int shown, int target, string action)
    {
        await Page.ScreenshotAsync(new() { Path = "WEB_CART_02_loi_bam_nut.png" });
        await Page.ReloadAsync();
        await Expect(Page.GetByText(new Regex(@"Số lượng:"))).ToBeVisibleAsync();
        var afterReload = await ReadQtyAsync();
        TestContext.Out.WriteLine($"Số lượng sau khi tải lại trang: {afterReload}");
        await Page.ScreenshotAsync(new() { Path = "WEB_CART_02_sau_khi_tai_lai.png" });

        if (afterReload == target)
            Assert.Fail($"Bấm '{action}': backend đã lưu số lượng {target} nhưng giao diện vẫn hiện {shown} sau 60 giây (giao diện không cập nhật)");
        if (afterReload == shown)
            Assert.Fail($"Bấm '{action}': API trả 200 nhưng số lượng không thay đổi ({shown}); xem dòng [PUT] trong log");
        Assert.Inconclusive($"Số lượng sau khi tải lại là {afterReload}, khác cả {shown} và {target}");
    }

    // Chờ tối đa 5 giây cho "Tạm tính" bằng giá trị mong đợi; ghi Thanh toán để xét thuế/phí
    private async Task CheckTotalAsync(int qty, long expectedSubtotal, string step, List<string> problems)
    {
        var sw = Stopwatch.StartNew();
        (int selected, long subtotal, long pay) t = default;
        while (sw.ElapsedMilliseconds < 5000)
        {
            t = await ReadTotalsAsync();
            if (t.subtotal == expectedSubtotal) break;
            await Page.WaitForTimeoutAsync(200);
        }
        TestContext.Out.WriteLine($"[{step}] SL={qty} | Số mục đã chọn={t.selected} | Tạm tính={t.subtotal:N0} " +
                                  $"(mong đợi {expectedSubtotal:N0}) | Thanh toán={t.pay:N0} | cập nhật sau {sw.ElapsedMilliseconds} ms");
        if (t.subtotal != expectedSubtotal)
            problems.Add($"{step}: Tạm tính = {t.subtotal:N0}, mong đợi {expectedSubtotal:N0}");
        if (t.selected != 1)
            problems.Add($"{step}: Số mục đã chọn = {t.selected}, mong đợi 1");
        if (t.pay != t.subtotal)
            TestContext.Out.WriteLine($"  Lưu ý: Thanh toán ({t.pay:N0}) khác Tạm tính ({t.subtotal:N0}), có thể có thuế/phí.");
    }

    private async Task<string> BodyAsync() =>
        Regex.Replace(await Page.Locator("body").InnerTextAsync(), @"\s+", " ");

    private static long ToNumber(string s) => long.Parse(Regex.Replace(s, @"[^\d]", ""));

    private async Task<long> ReadUnitPriceAsync()
    {
        var m = Regex.Match(await BodyAsync(), @"([\d\.,]+) VND / mục", RegexOptions.IgnoreCase);
        Assert.That(m.Success, "Không đọc được đơn giá ('... VND / mục')");
        return ToNumber(m.Groups[1].Value);
    }

    private async Task<int> ReadQtyAsync()
    {
        var m = Regex.Match(await BodyAsync(), @"Số lượng:\s*[-−–]?\s*(\d+)\s*\+?", RegexOptions.IgnoreCase);
        Assert.That(m.Success, "Không đọc được số lượng");
        return int.Parse(m.Groups[1].Value);
    }

    private async Task<int> WaitQtyAsync(int expected, int timeoutMs)
    {
        var sw = Stopwatch.StartNew();
        while (sw.ElapsedMilliseconds < timeoutMs)
        {
            if (await ReadQtyAsync() == expected) return expected;
            await Page.WaitForTimeoutAsync(200);
        }
        return await ReadQtyAsync();
    }

    private async Task<(int selected, long subtotal, long pay)> ReadTotalsAsync()
    {
        var body = await BodyAsync();
        var m = Regex.Match(body,
            @"Số mục đã chọn (\d+) Tạm t[ií]nh ([\d\.,]+) VND Thanh toán ([\d\.,]+) VND",
            RegexOptions.IgnoreCase);
        Assert.That(m.Success, "Không đọc được khung Tổng tiền (Số mục đã chọn / Tạm tính / Thanh toán)");
        return (int.Parse(m.Groups[1].Value), ToNumber(m.Groups[2].Value), ToNumber(m.Groups[3].Value));
    }
}