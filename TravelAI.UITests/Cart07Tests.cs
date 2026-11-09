
using System.Diagnostics;
using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace TravelAI.UITests;

[TestFixture]
public class Cart07Tests : PageTest
{
    private const string BaseUrl = "http://localhost:5173";

    // Customer account
    private const string Email = "cristiananguyen@gmail.com";
    private const string Password = "123456";

    // Contact information
    private const string ContactName = "Nguyễn Văn A";
    private const string ContactPhone = "0905123456";
    private const string ContactEmail = "a.test01@gmail.com";

    private const int ExpectedHoldMinutes = 15;
    private const bool GoToGateway = false;

    private static readonly Regex CheckoutButton =
        new(@"Tiến hành (thanh toán|đặt chỗ)", RegexOptions.IgnoreCase);

    private static readonly Regex BookingApi =
        new(@"/api/\S*(booking|order|checkout|payment)", RegexOptions.IgnoreCase);

    private readonly Stopwatch _clock = Stopwatch.StartNew();

    private readonly List<(string method, int status, string url, long ms, string body)> _api = new();

    private readonly Dictionary<IRequest, long> _start = new();

    private readonly List<string> _pages = new();

    private string? _dialog;
    private bool _counting;

    [Test, CancelAfter(600_000)]
    public async Task WEB_CART_07_DatChoThanhCongVaGiuChoTam()
    {
        var problems = new List<string>();

        Page.Dialog += (_, d) =>
        {
            _dialog = d.Message;
            TestContext.Out.WriteLine($"[HỘP THOẠI {d.Type}] {d.Message}");
            _ = d.AcceptAsync();
        };

        // FIX: r is already IRequest, so use r directly.
        Page.Request += (_, r) =>
        {
            if (_counting && r.Url.Contains("/api/"))
            {
                lock (_start)
                    _start[r] = _clock.ElapsedMilliseconds;
            }
        };

        Page.Response += async (_, r) =>
        {
            if (!_counting || !BookingApi.IsMatch(r.Url))
                return;

            long ms;

            // IResponse.Request is valid here.
            lock (_start)
            {
                ms = _start.TryGetValue(r.Request, out var t0)
                    ? _clock.ElapsedMilliseconds - t0
                    : -1;
            }

            string body;

            try
            {
                body = await r.TextAsync();
            }
            catch
            {
                body = "(không đọc được)";
            }

            lock (_api)
            {
                _api.Add((
                    r.Request.Method,
                    r.Status,
                    r.Url,
                    ms,
                    body
                ));
            }
        };

        Page.FrameNavigated += (_, f) =>
        {
            if (_counting && f == Page.MainFrame)
                _pages.Add(f.Url);
        };

        // Login
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

        // Step 1: Open cart
        await header.GetByRole(
            AriaRole.Link,
            new() { Name = "Giỏ hàng" }
        ).ClickAsync();

        await Expect(Page).ToHaveURLAsync(new Regex(@"/cart"));

        var card = Page.GetByRole(AriaRole.Article).First;

        try
        {
            await card.WaitForAsync(new() { Timeout = 30000 });
        }
        catch (Exception ex) when (
            ex is PlaywrightException ||
            ex is System.TimeoutException)
        {
            Assert.Inconclusive(
                "Giỏ hàng trống: thêm dịch vụ vào giỏ rồi chạy lại"
            );
        }

        await Page.WaitForTimeoutAsync(2000);

        var itemName = (
            await card.GetByRole(AriaRole.Heading)
                .First.InnerTextAsync()
        ).Trim();

        var qty = await ReadQtyAsync();
        var unit = await ReadUnitPriceAsync();
        var total = unit * qty;

        var vn = new CultureInfo("vi-VN");

        TestContext.Out.WriteLine(
            $"Mục: '{itemName}' | số lượng {qty} | " +
            $"đơn giá {unit.ToString("N0", vn)} | " +
            $"thành tiền {total.ToString("N0", vn)}"
        );

        if (await ReadSelectedAsync() == 0)
        {
            await Page.GetByText(
                new Regex(@"Chọn tất cả \(\d+ mục\)")
            ).ClickAsync();
        }

        var sw0 = Stopwatch.StartNew();

        while (
            sw0.ElapsedMilliseconds < 10000 &&
            await ReadSelectedAsync() != 1)
        {
            await Page.WaitForTimeoutAsync(200);
        }

        await Page.ScreenshotAsync(
            new() { Path = "WEB_CART_07_b1_gio_hang.png" }
        );

        // Step 2: Click checkout
        var checkout = Page.GetByRole(
            AriaRole.Button,
            new() { NameRegex = CheckoutButton }
        ).First;

        await Expect(checkout).ToBeEnabledAsync(
            new() { Timeout = 15000 }
        );

        TestContext.Out.WriteLine(
            $"Nút bấm: '{(await checkout.InnerTextAsync()).Trim()}'"
        );

        _counting = true;
        _pages.Clear();
        _api.Clear();
        _dialog = null;

        var click = _clock.ElapsedMilliseconds;

        await checkout.ClickAsync();

        try
        {
            await Page.WaitForURLAsync(
                new Regex(@"/checkout/\d+"),
                new() { Timeout = 60000 }
            );
        }
        catch (Exception ex) when (
            ex is PlaywrightException ||
            ex is System.TimeoutException)
        {
            await Page.ScreenshotAsync(
                new() { Path = "WEB_CART_07_loi_khong_sang_checkout.png" }
            );

            Assert.Fail(
                $"Bấm nút nhưng không sang trang thanh toán sau 60 giây " +
                $"(URL: {Page.Url}, hộp thoại: {_dialog ?? "không có"})"
            );
        }

        var arrive = _clock.ElapsedMilliseconds - click;

        try
        {
            await Page.WaitForLoadStateAsync(
                LoadState.NetworkIdle,
                new() { Timeout = 15000 }
            );
        }
        catch { }

        await Page.WaitForTimeoutAsync(3000);

        var orderId = Regex.Match(
            Page.Url,
            @"/checkout/(\d+)"
        ).Groups[1].Value;

        TestContext.Out.WriteLine(
            $"Sang trang thanh toán sau {arrive} ms | " +
            $"URL: {Page.Url} | mã đơn: {orderId}"
        );

        await Page.ScreenshotAsync(
            new() { Path = "WEB_CART_07_b2_checkout.png" }
        );

        await Page.ScreenshotAsync(
            new()
            {
                Path = "WEB_CART_07_b2_checkout_full.png",
                FullPage = true
            }
        );

        // Read checkout page
        var mainLoc = Page.Locator("main");

        var main = Regex.Replace(
            await mainLoc.CountAsync() > 0
                ? await mainLoc.First.InnerTextAsync()
                : await Page.Locator("body").InnerTextAsync(),
            @"\s+",
            " "
        );

        TestContext.Out.WriteLine(
            "Nội dung trang thanh toán: " +
            main[..Math.Min(1200, main.Length)]
        );

        var buttons = await Page.Locator("main button, main a")
            .AllInnerTextsAsync();

        TestContext.Out.WriteLine(
            "Các nút/liên kết: " +
            string.Join(
                " | ",
                buttons.Select(b =>
                    Regex.Replace(b, @"\s+", " ").Trim()
                ).Where(b => b != "")
            )
        );

        // Expected: order summary
        if (!main.Contains(itemName, StringComparison.OrdinalIgnoreCase))
        {
            problems.Add(
                $"Tóm tắt đơn hàng không có tên dịch vụ '{itemName}'"
            );
        }

        if (!main.Contains(total.ToString("N0", vn)))
        {
            problems.Add(
                $"Tóm tắt đơn hàng không thấy thành tiền " +
                $"{total.ToString("N0", vn)} VND"
            );
        }

        // Expected: contact information
        var inputs = Page.Locator(
            "main input:not([type=checkbox]):not([type=radio]):not([type=hidden])"
        );

        var contactFilled = 0;

        for (var i = 0; i < await inputs.CountAsync(); i++)
        {
            var el = inputs.Nth(i);

            var attrs = string.Join(
                " ",
                new[]
                {
                    await el.GetAttributeAsync("placeholder"),
                    await el.GetAttributeAsync("name"),
                    await el.GetAttributeAsync("type"),
                    await el.GetAttributeAsync("aria-label"),
                    await el.GetAttributeAsync("id")
                }.Where(a => !string.IsNullOrEmpty(a))
            );

            TestContext.Out.WriteLine(
                $"Ô nhập #{i}: {attrs} | giá trị: '{await el.InputValueAsync()}'"
            );

            if (Regex.IsMatch(
                attrs,
                @"m[aã]\s*gi[aả]m|coupon|promo|voucher|travelai",
                RegexOptions.IgnoreCase))
                continue;

            string? value =
                Regex.IsMatch(
                    attrs,
                    @"h[oọ]\s*(v[aà]\s*)?t[eê]n|full\s*name|^name| name",
                    RegexOptions.IgnoreCase
                ) ? ContactName
                : Regex.IsMatch(
                    attrs,
                    @"s[oố]\s*[dđ]i[eệ]n\s*tho[aạ]i|phone|s[dđ]t|tel",
                    RegexOptions.IgnoreCase
                ) ? ContactPhone
                : Regex.IsMatch(
                    attrs,
                    @"e-?mail|mail",
                    RegexOptions.IgnoreCase
                ) ? ContactEmail
                : null;

            if (value != null)
            {
                await el.FillAsync(value);
                contactFilled++;
            }
        }

        var contactShown =
            contactFilled > 0 ||
            Regex.IsMatch(
                main,
                @"th[oô]ng tin li[eê]n h[eệ]|h[oọ] t[eê]n|s[oố] [dđ]i[eệ]n tho[aạ]i",
                RegexOptions.IgnoreCase
            );

        TestContext.Out.WriteLine(
            $"Đã điền {contactFilled} ô thông tin liên hệ"
        );

        if (!contactShown)
        {
            problems.Add(
                "[LỆCH SRS - mức Trung bình] Không thấy bước yêu cầu " +
                "xác nhận thông tin liên hệ (Họ tên, SĐT, Email) " +
                "trước khi tạo đơn, SRS UC005 bước 7 và 8"
            );
        }

        // Inspect API responses
        lock (_api)
        {
            foreach (var a in _api)
            {
                TestContext.Out.WriteLine(
                    $"[API] {a.method} {a.status} {a.url} " +
                    $"({a.ms} ms) => {a.body[..Math.Min(900, a.body.Length)]}"
                );
            }
        }

        var holdMinutes = new List<double>();
        var statuses = new List<string>();

        lock (_api)
        {
            foreach (var a in _api.Where(
                a => a.status is >= 200 and < 300))
            {
                try
                {
                    using var doc = JsonDocument.Parse(a.body);

                    foreach (var (name, v) in Walk(doc.RootElement))
                    {
                        if (
                            v.ValueKind == JsonValueKind.String &&
                            Regex.IsMatch(name, @"expire|hold", RegexOptions.IgnoreCase) &&
                            DateTimeOffset.TryParse(
                                v.GetString(),
                                CultureInfo.InvariantCulture,
                                DateTimeStyles.AssumeUniversal,
                                out var dto
                            )
                        )
                        {
                            var m = (dto - DateTimeOffset.UtcNow).TotalMinutes;

                            var hasOffset = Regex.IsMatch(
                                v.GetString()!,
                                @"(Z|[+-]\d\d:?\d\d)$"
                            );

                            TestContext.Out.WriteLine(
                                $"Hạn giữ chỗ '{name}' = {v.GetString()} " +
                                $"-> còn {m:F1} phút"
                            );

                            holdMinutes.Add(m);

                            if (!hasOffset)
                                holdMinutes.Add(m - 420);
                        }

                        if (
                            Regex.IsMatch(name, @"status|state", RegexOptions.IgnoreCase) &&
                            v.ValueKind is JsonValueKind.String or JsonValueKind.Number
                        )
                        {
                            statuses.Add($"{name}={v}");
                        }
                    }
                }
                catch (JsonException) { }
            }
        }

        TestContext.Out.WriteLine(
            "Trạng thái đơn trong API: " +
            (statuses.Count == 0
                ? "(không thấy)"
                : string.Join(", ", statuses.Distinct()))
        );

        if (statuses.Any(s => Regex.IsMatch(
            s,
            @"paid|confirmed|cancel|completed|đã thanh toán|đã hủy",
            RegexOptions.IgnoreCase)))
        {
            problems.Add(
                "Đơn vừa tạo không ở trạng thái 'Chờ thanh toán': " +
                string.Join(", ", statuses.Distinct())
            );
        }

        var best = holdMinutes
            .Where(m => m >= -2)
            .OrderBy(m => Math.Abs(m - ExpectedHoldMinutes))
            .Cast<double?>()
            .FirstOrDefault();

        if (best == null)
        {
            TestContext.Out.WriteLine(
                "GHI CHÚ: không tìm thấy hạn giữ chỗ trong API, " +
                "kiểm tra hold_expires_at bằng CSDL"
            );
        }
        else if (best < 10 || best > 20)
        {
            problems.Add(
                $"[LỆCH SRS - mức Trung bình] Hạn giữ chỗ còn khoảng " +
                $"{best:F0} phút, SRS mặc định {ExpectedHoldMinutes} phút"
            );
        }

        // Performance: create order under 2 seconds
        var create = _api.FirstOrDefault(
            a => a.method == "POST" && a.status is >= 200 and < 300
        );

        if (create.url != null)
        {
            TestContext.Out.WriteLine(
                $"Tạo đơn: {create.method} {create.url} mất {create.ms} ms"
            );

            if (create.ms > 2000)
            {
                problems.Add(
                    $"[PHI CHỨC NĂNG - mức Thấp] Tạo đơn và giữ chỗ " +
                    $"mất {create.ms} ms, yêu cầu dưới 2 giây"
                );
            }
        }
        else
        {
            TestContext.Out.WriteLine(
                "GHI CHÚ: không bắt được yêu cầu POST tạo đơn để đo thời gian"
            );
        }

        // Optional: go to payment gateway
        if (GoToGateway)
        {
            await Page.GetByRole(
                AriaRole.Button,
                new()
                {
                    NameRegex = new Regex(
                        @"^\s*thanh\s*to[aá]n\s*$",
                        RegexOptions.IgnoreCase
                    )
                }
            ).Last.ClickAsync();

            try
            {
                await Page.WaitForURLAsync(
                    new Regex(@"momo|vnpay", RegexOptions.IgnoreCase),
                    new() { Timeout = 60000 }
                );
            }
            catch (Exception ex) when (
                ex is PlaywrightException ||
                ex is System.TimeoutException)
            {
                problems.Add(
                    "Bấm THANH TOÁN nhưng không sang cổng thanh toán"
                );
            }

            await Page.ScreenshotAsync(
                new() { Path = "WEB_CART_07_b3_cong_thanh_toan.png" }
            );
        }

        var distinctPages = _pages
            .Select(u => new Uri(u).AbsolutePath)
            .Distinct()
            .ToList();

        var steps = 1 + distinctPages.Count + (GoToGateway ? 0 : 1);

        TestContext.Out.WriteLine(
            $"Các trang sau khi bấm nút: " +
            $"{string.Join(" -> ", distinctPages)} | " +
            $"số bước ước tính: {steps}"
        );

        if (steps > 3)
        {
            problems.Add(
                $"[PHI CHỨC NĂNG - mức Thấp] Cần {steps} bước " +
                "để hoàn tất thanh toán, yêu cầu không quá 3"
            );
        }

        TestContext.Out.WriteLine(
            "LƯU Ý: đơn 'Chờ thanh toán' vẫn giữ chỗ tới khi hết hạn; " +
            "hủy đơn hoặc chờ hết hạn trước khi chạy lại."
        );

        _counting = false;

        Assert.That(problems, Is.Empty, string.Join(" | ", problems));
    }

    private static IEnumerable<(string name, JsonElement value)> Walk(
        JsonElement e,
        string prefix = "")
    {
        if (e.ValueKind == JsonValueKind.Object)
        {
            foreach (var p in e.EnumerateObject())
            {
                yield return (prefix + p.Name, p.Value);

                foreach (var x in Walk(p.Value, prefix + p.Name + "."))
                    yield return x;
            }
        }
        else if (e.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in e.EnumerateArray())
            {
                foreach (var x in Walk(item, prefix))
                    yield return x;
            }
        }
    }

    private async Task<string> BodyAsync() =>
        Regex.Replace(
            await Page.Locator("body").InnerTextAsync(),
            @"\s+",
            " "
        );

    private static long ToNumber(string s) =>
        long.Parse(Regex.Replace(s, @"[^\d]", ""));

    private async Task<int> ReadQtyAsync()
    {
        var m = Regex.Match(
            await BodyAsync(),
            @"Số lượng:\s*[-−–]?\s*(\d+)\s*\+?",
            RegexOptions.IgnoreCase
        );

        Assert.That(m.Success, "Không đọc được số lượng");

        return int.Parse(m.Groups[1].Value);
    }

    private async Task<long> ReadUnitPriceAsync()
    {
        var m = Regex.Match(
            await BodyAsync(),
            @"([\d\.,]+) VND / mục",
            RegexOptions.IgnoreCase
        );

        Assert.That(m.Success, "Không đọc được đơn giá");

        return ToNumber(m.Groups[1].Value);
    }

    private async Task<int> ReadSelectedAsync()
    {
        var m = Regex.Match(
            await BodyAsync(),
            @"Số mục đã chọn (\d+)",
            RegexOptions.IgnoreCase
        );

        return m.Success ? int.Parse(m.Groups[1].Value) : 0;
    }
}
