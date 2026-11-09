using System.Diagnostics;
using System.Text.RegularExpressions;
using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace TravelAI.UITests;

[TestFixture]
public class Svc05Tests : PageTest
{
    private const string BaseUrl = "http://localhost:5173";

    // Tài khoản Partner đã được Admin phê duyệt (đừng commit mật khẩu lên GitHub chung)
    private const string Email = "partner.danangresort@gmail.com";
    private const string Password = "123456";

    private const string Description = "Một khách sạn đẹp nằm ngay gần bãi biển Mỹ Khê nổi tiếng tại Đà Nẵng";   // 68 ký tự (>= 50)

    // Thông báo có nhắc tới giới hạn độ dài
    private static readonly Regex LimitRx = new(@"255|qu[áa] d[àa]i|t[ốo]i [đd]a|v[ưu][ợơo]t|k[ýy] t[ựu]", RegexOptions.IgnoreCase);

    [Test, CancelAfter(900_000)]
    public async Task WEB_SVC_05_TenDichVuQua255KyTu()
    {
        var problems = new List<string>();   // lỗi chức năng (làm test Failed)
        var notes = new List<string>();      // ghi chú cho báo cáo (không làm Failed)
        var dialogs = new List<string>();
        var posts = new List<(string Url, int Status, string Body)>();   // các yêu cầu ghi gửi lên máy chủ và kết quả

        var prefix = "TEST_TenDai_" + DateTime.Now.ToString("HHmmss") + "_";
        var longName = prefix + new string('A', 256 - prefix.Length);
        Assert.That(longName.Length, Is.EqualTo(256));

        Page.Dialog += (_, d) =>
        {
            dialogs.Add(d.Message);
            TestContext.Out.WriteLine($"[HỘP THOẠI {d.Type}] {d.Message}");
            _ = d.AcceptAsync();
        };
        Page.Response += async (_, r) =>
        {
            try
            {
                if (r.Request.Method == "POST" && Regex.IsMatch(r.Url, @"/service", RegexOptions.IgnoreCase))
                {
                    var body = await r.TextAsync();
                    posts.Add((r.Url, r.Status, body));
                    TestContext.Out.WriteLine($"[POST {r.Status}] {r.Url} -> {(body.Length > 200 ? body[..200] : body)}");
                }
            }
            catch { /* bỏ qua phản hồi không đọc được */ }
        };

        // Điều kiện: đăng nhập bằng tài khoản Partner (có thể mất tới ~25 giây)
        await Page.GotoAsync(BaseUrl + "/login");
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "name@company.com" }).FillAsync(Email);
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "••••••••" }).FillAsync(Password);
        await Page.GetByRole(AriaRole.Main).GetByRole(AriaRole.Button, new() { Name = "Đăng nhập" }).ClickAsync();
        await Expect(Page).ToHaveURLAsync(new Regex(@"/partner/"), new() { Timeout = 60000 });

        // Bước 1: Dịch vụ -> chờ web tải xong trạng thái duyệt hồ sơ -> Đăng dịch vụ mới
        await Page.GetByRole(AriaRole.Navigation)
            .GetByRole(AriaRole.Link, new() { Name = "Dịch vụ", Exact = true }).First.ClickAsync();
        await Expect(Page).ToHaveURLAsync(new Regex(@"/partner/services/?$"));
        var banner = Page.GetByText("Tài khoản đối tác chưa được phê duyệt");
        await Expect(banner).ToBeHiddenAsync(new() { Timeout = 90000 });
        var addBtn = Page.GetByRole(AriaRole.Link, new() { Name = "Đăng dịch vụ mới" })
            .Or(Page.GetByRole(AriaRole.Button, new() { Name = "Đăng dịch vụ mới" })).First;
        await Expect(addBtn).ToBeVisibleAsync(new() { Timeout = 60000 });
        var attempts = 0;
        while (true)
        {
            attempts++;
            var before = dialogs.Count;
            await addBtn.ClickAsync();
            try
            {
                await Expect(Page).ToHaveURLAsync(new Regex(@"/partner/services/add"), new() { Timeout = 5000 });
                break;
            }
            catch (PlaywrightException)
            {
                var isBlocked = dialogs.Skip(before).Any(d => Regex.IsMatch(d, @"ch[ưu]a .{1,8}duy[ệe]t", RegexOptions.IgnoreCase));
                if (!isBlocked || attempts >= 3)
                    Assert.Fail($"Bấm 'Đăng dịch vụ mới' {attempts} lần nhưng không mở được form (URL: {Page.Url}). Hộp thoại: {string.Join(" / ", dialogs)}");
                await Page.GotoAsync(BaseUrl + "/partner/services");
                await Expect(banner).ToBeHiddenAsync(new() { Timeout = 90000 });
            }
        }

        // Bước 2: nhập tên 256 ký tự, các trường khác hợp lệ (không tải ảnh)
        var nameBox = Page.GetByRole(AriaRole.Textbox, new() { Name = "Nhập tên khách sạn, homestay" });
        await nameBox.FillAsync(longName);
        await Page.GetByRole(AriaRole.Spinbutton, new() { Name = "Ví dụ:" }).FillAsync("1500000");
        var combos = Page.GetByRole(AriaRole.Combobox);   // 0 = Loại hình, 1 = Tỉnh/Thành phố, 2 = Địa danh
        try { await combos.Nth(1).SelectOptionAsync(new SelectOptionValue { Label = "Đà Nẵng" }, new() { Timeout = 5000 }); }
        catch (PlaywrightException) { await combos.Nth(1).SelectOptionAsync(new SelectOptionValue { Index = 1 }); }
        await Expect(combos.Nth(2).Locator("option").Nth(1)).ToBeAttachedAsync(new() { Timeout = 60000 });
        try { await combos.Nth(2).SelectOptionAsync(new SelectOptionValue { Label = "Bãi biển Mỹ Khê" }, new() { Timeout = 5000 }); }
        catch (PlaywrightException) { await combos.Nth(2).SelectOptionAsync(new SelectOptionValue { Index = 1 }); }
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "Nhập mô tả chi tiết" }).FillAsync(Description);

        var maxAttr = await nameBox.GetAttributeAsync("maxlength");
        var actualLen = (await nameBox.InputValueAsync()).Length;
        TestContext.Out.WriteLine($"Đã nhập tên {longName.Length} ký tự; thuộc tính maxlength của ô Tên: {maxAttr ?? "(không có)"}; độ dài thực tế trong ô: {actualLen}");
        await Page.ScreenshotAsync(new() { Path = "WEB_SVC_05_truoc_khi_luu.png", FullPage = true });

        if (actualLen < 256)
        {
            // Giao diện không cho nhập quá giới hạn: đạt Expected "không cho nhập quá 255 ký tự".
            // Không bấm Lưu vì lúc này tên (<= 255 ký tự) là hợp lệ và sẽ tạo dịch vụ thật.
            notes.Add($"Ô Tên giới hạn số ký tự nhập (maxlength={maxAttr ?? "?"}): chỉ nhập được {actualLen}/256 ký tự nên không thể nhập tên quá dài. " +
                      "Chưa kiểm tra được phía máy chủ vì giao diện đã chặn");
        }
        else
        {
            // Bước 3: bấm "Lưu và tiếp tục"
            await Page.EvaluateAsync(@"() => {
                window.__msgs = [];
                const rx = /255|quá dài|tối đa|vượt|lỗi|thất bại|không thể|không hợp lệ|thành công|bắt buộc/i;
                new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
                    const t = (n.textContent || '').trim();
                    if (t && t.length < 300 && rx.test(t)) window.__msgs.push(t);
                }))).observe(document.body, { childList: true, subtree: true });
            }");
            await Page.GetByRole(AriaRole.Button, new() { Name = "Lưu và tiếp tục" }).ClickAsync();

            // Chờ phản hồi: có yêu cầu gửi lên máy chủ, hoặc chuyển trang, hoặc có thông báo (tối đa 20 giây)
            var sw = Stopwatch.StartNew();
            while (sw.ElapsedMilliseconds < 20000)
            {
                await Page.WaitForTimeoutAsync(500);
                if (posts.Count > 0 || !Page.Url.Contains("/partner/services/add") || dialogs.Count > 0) break;
                var m = await Page.EvaluateAsync<string[]>("() => window.__msgs || []");
                if (m.Length > 0) break;
            }
            await Page.WaitForTimeoutAsync(1500);   // chờ phản hồi và thông báo hiện hết

            var msgs = (await Page.EvaluateAsync<string[]>("() => window.__msgs || []")).Distinct().Concat(dialogs).ToList();
            var urlNow = Page.Url;
            TestContext.Out.WriteLine($"URL sau khi bấm Lưu: {urlNow}");
            TestContext.Out.WriteLine($"Thông báo hiển thị: {(msgs.Count == 0 ? "(không có)" : string.Join(" / ", msgs))}");
            await Page.ScreenshotAsync(new() { Path = "WEB_SVC_05_sau_khi_luu.png", FullPage = true });

            var created = posts.Where(p => p.Status is >= 200 and < 300).ToList();
            if (!urlNow.Contains("/partner/services/add") || created.Count > 0)
            {
                File.AppendAllText("TEST_services_created.txt", $"{DateTime.Now:yyyy-MM-dd HH:mm}\t(Svc05, tên 256 ký tự)\t{urlNow}\n");
                problems.Add("Tên 256 ký tự: web và máy chủ chấp nhận và đã tạo dịch vụ (SRS: tên tối đa 255 ký tự); cần xóa dịch vụ TEST_TenDai_ vừa tạo");
            }
            else if (posts.Count > 0)
            {
                var p = posts[^1];
                if (p.Status >= 500)
                    problems.Add($"Máy chủ trả lỗi {p.Status} khi tên dài 256 ký tự (không kiểm tra đầu vào, không báo lỗi rõ ràng) " +
                                 $"(thông báo trên trang: {(msgs.Count == 0 ? "không có" : string.Join(" / ", msgs))})");
                else if (!LimitRx.IsMatch(p.Body) && !msgs.Any(x => LimitRx.IsMatch(x)))
                    notes.Add($"Máy chủ từ chối (HTTP {p.Status}) nhưng thông báo không nêu giới hạn 255 ký tự");
                else
                    notes.Add($"Máy chủ từ chối (HTTP {p.Status}) và có thông báo về giới hạn độ dài (đạt)");
            }
            else
            {
                // Không có yêu cầu nào gửi đi, vẫn ở trang thêm: giao diện tự chặn
                var native = await nameBox.EvaluateAsync<string>("e => e.validationMessage || ''");
                TestContext.Out.WriteLine($"Lời nhắc của trình duyệt ở ô Tên: '{native}'");
                if (msgs.Count == 0 && native.Length == 0)
                    problems.Add("Bấm Lưu với tên 256 ký tự nhưng web không gửi yêu cầu và không báo lỗi gì");
                else if (!msgs.Any(x => LimitRx.IsMatch(x)) && !LimitRx.IsMatch(native))
                    notes.Add("Web chặn việc lưu nhưng thông báo không nêu giới hạn 255 ký tự");
            }
        }

        foreach (var n in notes) TestContext.Out.WriteLine("GHI CHÚ: " + n);
        Assert.That(problems, Is.Empty, string.Join(" | ", problems));
    }
}