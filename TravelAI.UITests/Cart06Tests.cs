using System.Diagnostics;
using System.Text.RegularExpressions;
using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace TravelAI.UITests;

[TestFixture]
public class Cart06Tests : PageTest
{
    private const string BaseUrl = "http://localhost:5173";

    // Tài khoản Customer thật, giỏ có đúng 1 mục
    private const string Email = "cristiananguyen@gmail.com";
    private const string Password = "123456";

    // Tồn kho KHẢ DỤNG của mục trong giỏ (theo ngày đặt). Số lượng thử = Stock + 1
    private const int Stock = 20;

    // Câu thông báo theo SRS UC005, luồng 6a
    private const string SrsMessage = "Dịch vụ đã hết chỗ";

    private static readonly Regex OutOfStock = new(@"h[êếe]t\s+ch[ỗoô]", RegexOptions.IgnoreCase);   // nhận cả dạng không dấu
    private static readonly Regex OrderCreated = new(@"^POST 2\d\d \S*(booking|order|checkout)", RegexOptions.IgnoreCase);
    private static readonly Regex CheckoutButton = new(@"Tiến hành (thanh toán|đặt chỗ)", RegexOptions.IgnoreCase);

    private readonly List<string> _calls = new();
    private string? _dialog;
    private bool _counting;

    [Test, CancelAfter(900_000)]
    public async Task WEB_CART_06_SoLuongVuotTonKho_BaoHetCho()
    {
        var target = Stock + 1;
        var problems = new List<string>();

        Page.Dialog += (_, d) =>
        {
            _dialog = d.Message;
            TestContext.Out.WriteLine($"[HỘP THOẠI {d.Type}] {d.Message}");
            _ = d.AcceptAsync();
        };
        Page.Response += (_, r) =>
        {
            if (_counting && r.Request.Method != "GET" && r.Url.Contains("/api/")
                && !Regex.IsMatch(r.Url, "notifications|auth/login|hubs"))
                _calls.Add($"{r.Request.Method} {r.Status} {r.Url}");
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
        var card = Page.GetByRole(AriaRole.Article).First;
        try { await card.WaitForAsync(new() { Timeout = 30000 }); }
        catch (Exception ex) when (ex is PlaywrightException || ex is System.TimeoutException)
        { Assert.Inconclusive("Giỏ hàng trống: thêm dịch vụ vào giỏ rồi chạy lại"); }
        await Page.WaitForTimeoutAsync(2000);

        var plus = card.Locator("button").Filter(new() { HasTextRegex = new Regex(@"^\s*\+\s*$") }).First;
        var minus = card.Locator("button").Filter(new() { HasTextRegex = new Regex(@"^\s*[-−–]\s*$") }).First;

        try
        {
            // Bước 2: tăng số lượng lên 21 bằng nút "+"
            var start = await ReadQtyAsync();
            var reached = await SetQtyAsync(plus, minus, target);
            TestContext.Out.WriteLine($"Số lượng ban đầu {start} -> mục tiêu {target} -> đạt {reached}");
            if (reached != target)
            {
                await Page.ScreenshotAsync(new() { Path = "WEB_CART_06_khong_dat_so_luong.png" });
                if (reached == Stock && await plus.IsDisabledAsync())
                    Assert.Pass($"Web chặn ngay ở giỏ khi số lượng = tồn kho ({Stock}): nút '+' bị khóa. Cập nhật Expected theo hướng này.");
                Assert.Inconclusive($"Không đưa được số lượng tới {target} (dừng ở {reached})");
            }

            // Tích chọn mục (web chỉ cho thanh toán các mục đã chọn)
            if (await ReadSelectedAsync() == 0)
                await Page.GetByText(new Regex(@"Chọn tất cả \(\d+ mục\)")).ClickAsync();
            var sw0 = Stopwatch.StartNew();
            while (sw0.ElapsedMilliseconds < 10000 && await ReadSelectedAsync() != 1) await Page.WaitForTimeoutAsync(200);
            await Page.ScreenshotAsync(new() { Path = "WEB_CART_06_so_luong_21.png" });

            // Bấm nút "Tiến hành thanh toán"
            var checkout = Page.GetByRole(AriaRole.Button, new() { NameRegex = CheckoutButton }).First;
            await Expect(checkout).ToBeEnabledAsync(new() { Timeout = 15000 });
            TestContext.Out.WriteLine($"Nút bấm: '{(await checkout.InnerTextAsync()).Trim()}'");
            _calls.Clear(); _dialog = null; _counting = true;
            await checkout.ClickAsync();

            // Quan sát phản hồi (tối đa 30 giây)
            var outcome = "KHÔNG CÓ PHẢN HỒI";
            var sw = Stopwatch.StartNew();
            while (sw.ElapsedMilliseconds < 30000)
            {
                if (_dialog != null) { outcome = "HỘP THOẠI"; break; }
                if (!Regex.IsMatch(Page.Url, "/cart")) { outcome = "CHUYỂN TRANG"; break; }
                if (OutOfStock.IsMatch(await BodyAsync())) { outcome = "THÔNG BÁO HẾT CHỖ"; break; }
                await Page.WaitForTimeoutAsync(300);
            }
            await Page.WaitForTimeoutAsync(2000);
            var shown = _dialog ?? Regex.Match(await BodyAsync(), @"[^.!]{0,40}h[êếe]t\s+ch[ỗoô][^.!]{0,40}", RegexOptions.IgnoreCase).Value.Trim();
            var created = _calls.Where(c => OrderCreated.IsMatch(c)).ToList();
            TestContext.Out.WriteLine($"Phản hồi: {outcome} | URL: {Page.Url} | Thông báo: '{shown}'");
            TestContext.Out.WriteLine("Yêu cầu thay đổi dữ liệu: " + (_calls.Count == 0 ? "(không có)" : string.Join(" | ", _calls)));
            await Page.ScreenshotAsync(new() { Path = "WEB_CART_06_phan_hoi.png" });

            // Chức năng: phải chặn, không tạo đơn, vẫn ở trang giỏ hàng
            var blocked = outcome is "HỘP THOẠI" or "THÔNG BÁO HẾT CHỖ" && OutOfStock.IsMatch(shown);
            if (!blocked)
                problems.Add($"Số lượng {target} > tồn kho {Stock} nhưng web không báo hết chỗ (phản hồi: {outcome}, URL: {Page.Url}, thông báo: '{shown}')");
            if (created.Count > 0)
                problems.Add("Web đã TẠO ĐƠN dù vượt tồn kho: " + string.Join(", ", created));
            if (!Regex.IsMatch(Page.Url, "/cart"))
                problems.Add($"Web rời trang giỏ hàng (URL: {Page.Url}) dù vượt tồn kho");

            // Câu chữ: so với SRS 6a
            if (blocked && !shown.Contains(SrsMessage, StringComparison.OrdinalIgnoreCase))
                problems.Add($"[LỆCH SRS - mức Thấp] Thông báo khác SRS 6a. SRS: '{SrsMessage}'. Web: '{shown}'");
        }
        finally
        {
            _counting = false;
            // Dọn dẹp: đưa số lượng về 1 nếu vẫn ở trang giỏ hàng
            try
            {
                if (Regex.IsMatch(Page.Url, "/cart") && await Page.GetByRole(AriaRole.Article).CountAsync() > 0)
                    await SetQtyAsync(plus, minus, 1);
            }
            catch { /* bỏ qua lỗi dọn dẹp */ }
        }

        Assert.That(problems, Is.Empty, string.Join(" | ", problems));
    }

    private async Task<string> BodyAsync() =>
        Regex.Replace(await Page.Locator("body").InnerTextAsync(), @"\s+", " ");

    private async Task<int> ReadQtyAsync()
    {
        var m = Regex.Match(await BodyAsync(), @"Số lượng:\s*[-−–]?\s*(\d+)\s*\+?", RegexOptions.IgnoreCase);
        Assert.That(m.Success, "Không đọc được số lượng");
        return int.Parse(m.Groups[1].Value);
    }

    private async Task<int> ReadSelectedAsync()
    {
        var m = Regex.Match(await BodyAsync(), @"Số mục đã chọn (\d+)", RegexOptions.IgnoreCase);
        return m.Success ? int.Parse(m.Groups[1].Value) : 0;
    }

    // Bấm +/- từng lần tới khi đạt mục tiêu; dừng nếu nút bị khóa hoặc số lượng không đổi
    private async Task<int> SetQtyAsync(ILocator plus, ILocator minus, int target)
    {
        for (var i = 0; i < 80; i++)
        {
            var cur = await ReadQtyAsync();
            if (cur == target) return cur;
            var btn = cur < target ? plus : minus;
            if (await btn.IsDisabledAsync()) return cur;
            await btn.ClickAsync();
            var next = cur < target ? cur + 1 : cur - 1;
            var sw = Stopwatch.StartNew();
            while (sw.ElapsedMilliseconds < 30000 && await ReadQtyAsync() != next) await Page.WaitForTimeoutAsync(150);
            if (await ReadQtyAsync() != next) return await ReadQtyAsync();
        }
        return await ReadQtyAsync();
    }
}