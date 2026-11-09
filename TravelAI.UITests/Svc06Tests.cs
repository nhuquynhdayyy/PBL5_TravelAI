using System.Text.RegularExpressions;
using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace TravelAI.UITests;

[TestFixture]
public class Svc06Tests : PageTest
{
    private const string BaseUrl = "http://localhost:5173";

    // Tài khoản Partner đã được Admin phê duyệt (đừng commit mật khẩu lên GitHub chung)
    private const string Email = "partner.danangresort@gmail.com";
    private const string Password = "123456";

    // Thông báo có nhắc tới giới hạn tối thiểu (tiếng Việt của web hoặc lời nhắc tiếng Anh của trình duyệt)
    private static readonly Regex LimitRx = new(@"\b50\b|t[ốo]i thi[ểe]u|[ií]t nh[ấa]t|lengthen|at least", RegexOptions.IgnoreCase);

    [Test, CancelAfter(900_000)]
    public async Task WEB_SVC_06_MoTaNganHon50KyTu()
    {
        var problems = new List<string>();   // lỗi chức năng (làm test Failed)
        var notes = new List<string>();      // ghi chú cho báo cáo (không làm Failed)
        var dialogs = new List<string>();
        var blocked = new List<string>();    // yêu cầu ghi bị chặn (nếu có nghĩa là web đã cho gửi form)

        // Mô tả đúng 49 ký tự, không kết thúc bằng khoảng trắng
        var description = ("Khách sạn đẹp gần bãi biển Mỹ Khê tại Đà Nẵng " + new string('x', 60))[..49];
        Assert.That(description.Length, Is.EqualTo(49));

        Page.Dialog += (_, d) =>
        {
            dialogs.Add(d.Message);
            TestContext.Out.WriteLine($"[HỘP THOẠI {d.Type}] {d.Message}");
            _ = d.AcceptAsync();
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

        // AN TOÀN: chặn mọi yêu cầu ghi tới /services để test này không bao giờ tạo dịch vụ thật
        await Page.RouteAsync(new Regex(@"/services", RegexOptions.IgnoreCase), async route =>
        {
            var req = route.Request;
            if (req.Method is "POST" or "PUT" or "PATCH")
            {
                blocked.Add($"{req.Method} {req.Url}");
                TestContext.Out.WriteLine($"[ĐÃ CHẶN] {req.Method} {req.Url}");
                await route.AbortAsync();
            }
            else await route.ContinueAsync();
        });
        await Page.EvaluateAsync(@"() => {
            window.__msgs = [];
            const rx = /50|tối thiểu|ít nhất|bắt buộc|vui lòng|lỗi|thất bại|thành công/i;
            new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
                const t = (n.textContent || '').trim();
                if (t && t.length < 300 && rx.test(t)) window.__msgs.push(t);
            }))).observe(document.body, { childList: true, subtree: true });
        }");

        // Bước 2: nhập dữ liệu hợp lệ, riêng Mô tả chỉ 49 ký tự (không tải ảnh)
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "Nhập tên khách sạn, homestay" })
            .FillAsync("TEST_Mô tả ngắn " + DateTime.Now.ToString("HHmmss"));
        await Page.GetByRole(AriaRole.Spinbutton, new() { Name = "Ví dụ:" }).FillAsync("1500000");
        var combos = Page.GetByRole(AriaRole.Combobox);   // 0 = Loại hình, 1 = Tỉnh/Thành phố, 2 = Địa danh
        try { await combos.Nth(1).SelectOptionAsync(new SelectOptionValue { Label = "Đà Nẵng" }, new() { Timeout = 5000 }); }
        catch (PlaywrightException) { await combos.Nth(1).SelectOptionAsync(new SelectOptionValue { Index = 1 }); }
        await Expect(combos.Nth(2).Locator("option").Nth(1)).ToBeAttachedAsync(new() { Timeout = 60000 });
        try { await combos.Nth(2).SelectOptionAsync(new SelectOptionValue { Label = "Bãi biển Mỹ Khê" }, new() { Timeout = 5000 }); }
        catch (PlaywrightException) { await combos.Nth(2).SelectOptionAsync(new SelectOptionValue { Index = 1 }); }
        var descBox = Page.GetByRole(AriaRole.Textbox, new() { Name = "Nhập mô tả chi tiết" });
        await descBox.FillAsync(description);
        var actualLen = (await descBox.InputValueAsync()).Length;
        TestContext.Out.WriteLine($"Độ dài Mô tả đã nhập: {actualLen} ký tự");
        Assert.That(actualLen, Is.EqualTo(49), "Ô Mô tả không nhận đúng 49 ký tự đã nhập");

        // Đảm bảo không có trường nào khác đang bị coi là chưa hợp lệ (nếu có thì test không đo được riêng Mô tả)
        var otherInvalid = await Page.EvaluateAsync<string[]>(
            "() => Array.from(document.querySelectorAll('input:invalid, select:invalid')).map(e => e.tagName.toLowerCase() + '/' + (e.type || '') + '/' + (e.placeholder || ''))");
        if (otherInvalid.Length > 0)
            Assert.Inconclusive($"Có trường khác chưa hợp lệ nên không đo riêng được Mô tả: {string.Join(", ", otherInvalid)}");

        // Bước 3: bấm "Lưu và tiếp tục"
        var blockedBefore = blocked.Count;
        await Page.EvaluateAsync("() => { window.__msgs = []; }");
        await Page.GetByRole(AriaRole.Button, new() { Name = "Lưu và tiếp tục" }).ClickAsync();
        await Page.WaitForTimeoutAsync(2500);

        // Thu thập kết quả
        var url = Page.Url;
        var posted = blocked.Count > blockedBefore;
        var v = await descBox.EvaluateAsync<string[]>(
            "e => [String(e.validity.tooShort), e.validationMessage || '', String(e.minLength), String(e.required)]");
        var tooShort = v[0] == "true";
        var nativeMsg = v[1];
        var msgs = (await Page.EvaluateAsync<string[]>("() => window.__msgs || []")).Distinct().Concat(dialogs).ToList();
        var bodyText = await Page.Locator("body").InnerTextAsync();
        var bodyHasError = Regex.IsMatch(bodyText, @"(ít nhất|tối thiểu)\s*50|50\s*ký tự", RegexOptions.IgnoreCase);
        var pageMsgHasLimit = msgs.Any(m => LimitRx.IsMatch(m)) || bodyHasError;
        TestContext.Out.WriteLine($"URL sau khi bấm Lưu: {url}");
        TestContext.Out.WriteLine($"Ô Mô tả: minLength={v[2]}, required={v[3]}, tooShort={tooShort}, lời nhắc trình duyệt='{nativeMsg}'");
        TestContext.Out.WriteLine($"Thông báo hiển thị trên trang: {(msgs.Count == 0 ? "(không có)" : string.Join(" / ", msgs))}; có chữ về 50 ký tự trên trang: {bodyHasError}");
        TestContext.Out.WriteLine($"Số yêu cầu tạo dịch vụ bị chặn: {blocked.Count - blockedBefore} (không có dịch vụ nào được tạo)");
        await Page.ScreenshotAsync(new() { Path = "WEB_SVC_06_mo_ta_49_ky_tu.png", FullPage = true });

        // Expected 1: không lưu, vẫn ở trang thêm dịch vụ
        if (!url.Contains("/partner/services/add"))
        {
            File.AppendAllText("TEST_services_created.txt", $"{DateTime.Now:yyyy-MM-dd HH:mm}\t(Svc06, mô tả 49 ký tự)\t{url}\n");
            Assert.Fail($"Mô tả 49 ký tự nhưng web đã chuyển sang '{url}' (có thể đã tạo dịch vụ, kiểm tra và xóa dịch vụ TEST_)");
        }
        if (posted)
        {
            problems.Add("Mô tả 49 ký tự: web vẫn gửi yêu cầu tạo dịch vụ lên máy chủ (SRS: Mô tả tối thiểu 50 ký tự); " +
                         "yêu cầu đã bị test chặn nên không tạo dịch vụ nào");
        }
        else
        {
            // Expected 2: báo lỗi tối thiểu 50 ký tự
            if (!tooShort && !pageMsgHasLimit)
                problems.Add("Mô tả 49 ký tự: web không gửi form nhưng không báo lỗi tối thiểu 50 ký tự " +
                             "(không có lời nhắc của trình duyệt, không có thông báo trên trang)");
            else if (!pageMsgHasLimit)
                notes.Add($"Web chặn bằng lời nhắc mặc định của trình duyệt ('{nativeMsg}', hiện bằng ngôn ngữ của trình duyệt), " +
                          "chưa có thông báo tiếng Việt riêng trên trang; ảnh chụp tự động không chụp được bong bóng này nên dùng ảnh chụp tay làm bằng chứng");
        }

        foreach (var n in notes) TestContext.Out.WriteLine("GHI CHÚ: " + n);
        Assert.That(problems, Is.Empty, string.Join(" | ", problems));
    }
}