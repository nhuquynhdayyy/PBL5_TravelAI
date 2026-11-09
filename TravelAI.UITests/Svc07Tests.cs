using System.Collections.Concurrent;
using System.Diagnostics;
using System.Text.RegularExpressions;
using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace TravelAI.UITests;

[TestFixture]
public class Svc07Tests : PageTest
{
    private const string BaseUrl = "http://localhost:5173";

    // Tài khoản Partner đã được Admin phê duyệt (đừng commit mật khẩu lên GitHub chung)
    private const string Email = "partner.danangresort@gmail.com";
    private const string Password = "123456";

    private const string Description = "Một khách sạn đẹp nằm ngay gần bãi biển Mỹ Khê nổi tiếng tại Đà Nẵng, có hồ bơi, nhà hàng, phòng rộng rãi thoáng mát, view biển tuyệt đẹp, phục vụ ăn sáng miễn phí và đưa đón sân bay cho khách.";   // khoảng 190 ký tự

    private static readonly Regex ApiServices = new(@"/api/services/?$", RegexOptions.IgnoreCase);

    [Test, CancelAfter(1_500_000)]
    public async Task WEB_SVC_07_GiaCoBanKhongHopLe()
    {
        var problems = new List<string>();   // lỗi chức năng (làm test Failed)
        var notes = new List<string>();      // ghi chú cho báo cáo (không làm Failed)
        var dialogs = new List<string>();
        var started = new ConcurrentQueue<string>();                               // yêu cầu tạo dịch vụ đã gửi đi
        var posts = new ConcurrentQueue<(string Url, int Status, string Body)>();  // phản hồi của máy chủ

        Page.Dialog += (_, d) =>
        {
            dialogs.Add(d.Message);
            TestContext.Out.WriteLine($"[HỘP THOẠI {d.Type}] {d.Message}");
            _ = d.AcceptAsync();
        };
        Page.Request += (_, r) =>
        {
            if (r.Method == "POST" && ApiServices.IsMatch(r.Url)) started.Enqueue(r.Url);
        };
        Page.Response += async (_, r) =>
        {
            try
            {
                if (r.Request.Method == "POST" && ApiServices.IsMatch(r.Url))
                {
                    var body = await r.TextAsync();
                    posts.Enqueue((r.Url, r.Status, body));
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

        // Mở form thêm dịch vụ (chờ web tải xong trạng thái duyệt hồ sơ, thử lại nếu bị chặn)
        async Task OpenFormAsync()
        {
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
                    return;
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
        }

        // Điền các trường hợp lệ (không điền giá, không tải ảnh)
        async Task FillOthersAsync(string name)
        {
            // 1. Tên
            await Page.GetByRole(AriaRole.Textbox, new() { Name = "Nhập tên khách sạn, homestay" }).FillAsync(name);

            var combos = Page.GetByRole(AriaRole.Combobox);   // 0 = Loại hình, 1 = Tỉnh/Thành phố, 2 = Địa danh

            // 2. Tỉnh/Thành phố (chờ danh sách tải xong vì backend chậm)
            await Expect(combos.Nth(1).Locator("option").Nth(1)).ToBeAttachedAsync(new() { Timeout = 60000 });
            try { await combos.Nth(1).SelectOptionAsync(new SelectOptionValue { Label = "Đà Nẵng" }, new() { Timeout = 10000 }); }
            catch (Exception ex) when (ex is TimeoutException || ex is PlaywrightException)
            { await combos.Nth(1).SelectOptionAsync(new SelectOptionValue { Index = 1 }); }

            // 3. Địa danh
            await Expect(combos.Nth(2).Locator("option").Nth(1)).ToBeAttachedAsync(new() { Timeout = 60000 });
            try { await combos.Nth(2).SelectOptionAsync(new SelectOptionValue { Label = "Bãi biển Mỹ Khê" }, new() { Timeout = 10000 }); }
            catch (Exception ex) when (ex is TimeoutException || ex is PlaywrightException)
            { await combos.Nth(2).SelectOptionAsync(new SelectOptionValue { Index = 1 }); }

            // 4. Mô tả (kiểm tra chữ còn nguyên sau khi form render lại)
            var desc = Page.GetByRole(AriaRole.Textbox, new() { Name = "Nhập mô tả chi tiết" });
            await desc.FillAsync(Description);
            await Expect(desc).ToHaveValueAsync(Description);
            await Page.WaitForTimeoutAsync(1500);
            await Expect(desc).ToHaveValueAsync(Description, new() { Timeout = 5000 });
        }

        var cases = new[]
        {
            (Tag: "gia_am",       Value: "-1000"),
            (Tag: "gia_chu",      Value: "abc"),
            (Tag: "gia_0",        Value: "0"),
            (Tag: "gia_thapphan", Value: "1500.5")
        };
        var summary = new List<string>();

        foreach (var c in cases)
        {
            // Bước 1-2: mở form mới, nhập các trường hợp lệ rồi nhập giá cần thử
            await OpenFormAsync();
            var name = $"TEST_{c.Tag}_{DateTime.Now:HHmmss}";
            await FillOthersAsync(name);

            var priceBox = Page.GetByRole(AriaRole.Spinbutton, new() { Name = "Ví dụ:" });
            await priceBox.ClickAsync();
            if (c.Value == "abc")
            {
                // Ô số không cho Fill chữ, nên gõ từng phím như người dùng thật
                await priceBox.ClearAsync();
                await priceBox.PressSequentiallyAsync("abc");
            }
            else await priceBox.FillAsync(c.Value);
            var shown = await priceBox.InputValueAsync();
            var attrs = await priceBox.EvaluateAsync<string[]>(
                "e => [e.getAttribute('min') ?? '', e.getAttribute('step') ?? '', e.getAttribute('max') ?? '']");
            var native = await priceBox.EvaluateAsync<string>("e => e.validationMessage || ''");   // lời nhắc của trình duyệt (nếu bị chặn)

            // Các trường khác phải hợp lệ để chỉ đo riêng ô giá
            var otherInvalid = await Page.EvaluateAsync<string[]>(
                "() => Array.from(document.querySelectorAll('input:invalid, select:invalid, textarea:invalid')).filter(e => e.type !== 'number').map(e => e.tagName.toLowerCase() + '/' + (e.placeholder || '').slice(0,30) + ' | lỗi: ' + e.validationMessage + ' | minlength=' + (e.getAttribute('minlength') ?? '') + ' maxlength=' + (e.getAttribute('maxlength') ?? '') + ' | độ dài chữ=' + (e.value || '').length)");
            if (otherInvalid.Length > 0)
                Assert.Inconclusive($"Có trường khác chưa hợp lệ nên không đo riêng được ô giá: {string.Join(" ;; ", otherInvalid)}");

            await Page.EvaluateAsync(@"() => {
                window.__msgs = [];
                if (!window.__obs) {
                    window.__obs = true;
                    const rx = /giá|lỗi|không hợp lệ|bắt buộc|vui lòng|thất bại|thành công|không thể|âm/i;
                    new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
                        const t = (n.textContent || '').trim();
                        if (t && t.length < 300 && rx.test(t)) window.__msgs.push(t);
                    }))).observe(document.body, { childList: true, subtree: true });
                }
            }");

            // Bước 3: bấm "Lưu và tiếp tục"
            var startedBefore = started.Count;
            var postsBefore = posts.Count;
            await Page.GetByRole(AriaRole.Button, new() { Name = "Lưu và tiếp tục" }).ClickAsync();
            var sw = Stopwatch.StartNew();
            while (sw.ElapsedMilliseconds < 4000 && started.Count == startedBefore && Page.Url.Contains("/partner/services/add"))
                await Page.WaitForTimeoutAsync(300);
            var requested = started.Count > startedBefore;
            if (requested)
            {
                sw.Restart();
                while (sw.ElapsedMilliseconds < 20000 && posts.Count == postsBefore) await Page.WaitForTimeoutAsync(300);
                await Page.WaitForTimeoutAsync(1500);
            }
            else await Page.WaitForTimeoutAsync(1000);

            var respList = posts.ToArray().Skip(postsBefore).ToList();
            var hasResp = respList.Count > 0;
            var resp = hasResp ? respList[^1] : default;
            var created = hasResp && resp.Status is >= 200 and < 300;
            var msgs = (await Page.EvaluateAsync<string[]>("() => window.__msgs || []")).Distinct().ToList();
            var urlNow = Page.Url;
            await Page.ScreenshotAsync(new() { Path = $"WEB_SVC_07_{c.Tag}.png", FullPage = true });

            var line = $"[Giá '{c.Value}'] ô hiển thị='{shown}'; min='{attrs[0]}', step='{attrs[1]}', max='{attrs[2]}'; " +
                       $"lời nhắc trình duyệt='{native}'; gửi yêu cầu tạo={requested}; " +
                       $"phản hồi={(hasResp ? "HTTP " + resp.Status : "(không có)")}; thông báo trên trang={(msgs.Count == 0 ? "(không có)" : string.Join(" / ", msgs))}";
            TestContext.Out.WriteLine(line);
            summary.Add(line);

            if (created)
                File.AppendAllText("TEST_services_created.txt", $"{DateTime.Now:yyyy-MM-dd HH:mm}\t{name} (giá '{c.Value}')\t{urlNow}\n");

            var hasMsg = native.Length > 0 || msgs.Count > 0;
            switch (c.Tag)
            {
                case "gia_am":
                    if (created)
                        problems.Add($"Giá âm (-1000): web và máy chủ chấp nhận và đã tạo dịch vụ '{name}' (SRS: giá là số nguyên >= 0); cần xóa dịch vụ này");
                    else if (hasResp && resp.Status >= 500)
                        problems.Add($"Giá âm (-1000): máy chủ trả lỗi {resp.Status} thay vì từ chối bằng thông báo rõ ràng");
                    else if (requested && !hasResp)
                        problems.Add("Giá âm (-1000): web gửi yêu cầu nhưng không nhận được phản hồi sau 20 giây");
                    else if (!requested && !hasMsg)
                        problems.Add("Giá âm (-1000): web không gửi form nhưng không báo lỗi gì (không có lời nhắc, không có thông báo)");
                    else if (!requested)
                        notes.Add($"Giá âm (-1000) bị chặn ở giao diện (min='{attrs[0]}'), thông báo: '{native}' (lời nhắc mặc định của trình duyệt, không phải thông báo tiếng Việt của web)");
                    else
                        notes.Add($"Giá âm (-1000) bị máy chủ từ chối (HTTP {resp.Status}), thông báo trên trang: {(msgs.Count == 0 ? "không có" : string.Join(" / ", msgs))}");
                    break;

                case "gia_chu":
                    notes.Add($"Giá 'abc': ô giá là ô số (step='{attrs[1]}'), gõ chữ không vào được, giá trị còn lại trong ô là '{shown}'");
                    if (created || requested)
                        problems.Add($"Giá 'abc': ô giá còn '{shown}' nhưng web vẫn gửi yêu cầu tạo dịch vụ");
                    else if (!hasMsg)
                        problems.Add("Giá 'abc': ô giá trống nhưng bấm Lưu không báo lỗi bắt buộc");
                    break;

                case "gia_0":
                    if (hasResp && resp.Status >= 500)
                        problems.Add($"Giá 0: máy chủ trả lỗi {resp.Status}");
                    else if (created)
                        notes.Add($"Giá 0: web chấp nhận và đã tạo dịch vụ '{name}' (SRS: số nguyên >= 0, nên 0 hợp lệ); cần xóa dịch vụ này");
                    else
                        notes.Add($"Giá 0: bị từ chối ({(requested ? "HTTP " + resp.Status : "chặn ở giao diện: '" + native + "'")}); SRS cho phép giá >= 0, nên đây có thể là lệch SRS");
                    break;

                case "gia_thapphan":
                    if (hasResp && resp.Status >= 500)
                        problems.Add($"Giá 1500.5: máy chủ trả lỗi {resp.Status}");
                    else if (created)
                        notes.Add($"Giá 1500.5: web chấp nhận số thập phân và đã tạo dịch vụ '{name}' (SRS: giá là số nguyên, nên đây là lệch SRS); cần xóa dịch vụ này");
                    else
                        notes.Add($"Giá 1500.5: bị từ chối ({(requested ? "HTTP " + resp.Status : "chặn ở giao diện: '" + native + "'")}) đúng SRS (số nguyên)");
                    // Muốn tính số thập phân được chấp nhận là Failed, đổi notes.Add ở nhánh 'created' thành problems.Add
                    break;
            }
        }

        TestContext.Out.WriteLine("=== TỔNG HỢP ===");
        foreach (var s in summary) TestContext.Out.WriteLine(s);
        foreach (var n in notes) TestContext.Out.WriteLine("GHI CHÚ: " + n);
        Assert.That(problems, Is.Empty, string.Join(" | ", problems));
    }
}