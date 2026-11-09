using System.Text.RegularExpressions;
using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace TravelAI.UITests;

[TestFixture]
public class Svc04Tests : PageTest
{
    private const string BaseUrl = "http://localhost:5173";

    // Tài khoản Partner đã được Admin phê duyệt (đừng commit mật khẩu lên GitHub chung)
    private const string Email = "partner.danangresort@gmail.com";
    private const string Password = "123456";

    [Test, CancelAfter(900_000)]
    public async Task WEB_SVC_04_ThemDichVuFormTrong()
    {
        var problems = new List<string>();   // lỗi chức năng (làm test Failed)
        var notes = new List<string>();      // ghi chú cho báo cáo (không làm Failed)
        var dialogs = new List<string>();
        var blocked = new List<string>();    // yêu cầu ghi bị chặn (nếu có nghĩa là web đã cho gửi form trống)

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
            const rx = /bắt buộc|vui lòng|không được|tối thiểu|lỗi|thất bại|thành công/i;
            new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
                const t = (n.textContent || '').trim();
                if (t && t.length < 300 && rx.test(t)) window.__msgs.push(t);
            }))).observe(document.body, { childList: true, subtree: true });
        }");

        // Bước 2: không nhập gì. Bước 3: bấm "Lưu và tiếp tục"
        await Page.GetByRole(AriaRole.Button, new() { Name = "Lưu và tiếp tục" }).ClickAsync();
        await Page.WaitForTimeoutAsync(2500);

        // Expected 1: không lưu, vẫn ở trang thêm dịch vụ
        TestContext.Out.WriteLine($"URL sau khi bấm Lưu: {Page.Url}");
        if (!Page.Url.Contains("/partner/services/add"))
        {
            File.AppendAllText("TEST_services_created.txt", $"{DateTime.Now:yyyy-MM-dd HH:mm}\t(Svc04)\t{Page.Url}\n");
            Assert.Fail($"Form để trống nhưng web đã chuyển sang '{Page.Url}' (có thể đã tạo dịch vụ, kiểm tra và xóa dịch vụ TEST_)");
        }
        if (blocked.Count > 0)
            problems.Add("Form để trống nhưng web vẫn gửi yêu cầu tạo dịch vụ lên máy chủ (đã bị test chặn, không tạo dịch vụ nào)");

        // Expected 2: báo lỗi bắt buộc. Lấy ô được focus, lời nhắc của trình duyệt và TẤT CẢ các trường đang bị đánh dấu "chưa hợp lệ"
        var info = await Page.EvaluateAsync<string[][]>(@"() => {
            const selects = Array.from(document.querySelectorAll('select'));
            const describe = e => [e.tagName.toLowerCase(), e.type || '', e.placeholder || '',
                String(selects.indexOf(e)), e.validationMessage || ''];
            const focus = document.activeElement ? describe(document.activeElement) : [];
            const invalid = Array.from(document.querySelectorAll('input:invalid, select:invalid, textarea:invalid')).map(describe);
            return [focus].concat(invalid);
        }");
        string FieldName(string[] f) =>
            f[0] == "input" && f[1] == "file" ? "Hình ảnh" :
            f[0] == "input" && f[1] == "number" ? "Giá bán cơ bản" :
            f[0] == "input" && f[2].Contains("tên", StringComparison.OrdinalIgnoreCase) ? "Tên dịch vụ" :
            f[0] == "select" && f[3] == "0" ? "Loại hình dịch vụ" :
            f[0] == "select" && f[3] == "1" ? "Tỉnh/Thành phố" :
            f[0] == "select" && f[3] == "2" ? "Địa danh" :
            f[0] == "textarea" ? "Mô tả" : $"{f[0]}/{f[1]}/{f[2]}";

        var focusInfo = info[0];
        var invalidFields = info.Skip(1).Select(FieldName).ToList();
        var nativeMsg = info.Skip(1).Select(f => f[4]).FirstOrDefault(m => m.Length > 0) ?? "";
        var msgs = (await Page.EvaluateAsync<string[]>("() => window.__msgs || []")).Distinct().Concat(dialogs).ToList();
        TestContext.Out.WriteLine($"Ô đang được focus: {(focusInfo.Length > 0 ? FieldName(focusInfo) : "(không có)")}");
        TestContext.Out.WriteLine($"Các trường bị đánh dấu bắt buộc/chưa hợp lệ: {(invalidFields.Count == 0 ? "(không có)" : string.Join(", ", invalidFields))}");
        TestContext.Out.WriteLine($"Lời nhắc của trình duyệt: '{nativeMsg}'");
        TestContext.Out.WriteLine($"Thông báo hiển thị trên trang: {(msgs.Count == 0 ? "(không có)" : string.Join(" / ", msgs))}");
        await Page.ScreenshotAsync(new() { Path = "WEB_SVC_04_form_trong.png", FullPage = true });

        if (invalidFields.Count == 0 && msgs.Count == 0)
            problems.Add("Bấm Lưu khi form trống nhưng không thấy báo lỗi bắt buộc ở trường nào (không có thông báo, không có trường nào bị đánh dấu)");
        else
        {
            foreach (var required in new[] { "Tên dịch vụ", "Giá bán cơ bản", "Tỉnh/Thành phố", "Mô tả" })
                if (!invalidFields.Contains(required) && !msgs.Any(m => m.Contains(required, StringComparison.OrdinalIgnoreCase)))
                    problems.Add($"Trường '{required}' không được đánh dấu bắt buộc: bấm Lưu khi form trống mà trường này không bị báo lỗi");
            if (nativeMsg.Length > 0)
                notes.Add($"Web dùng thông báo mặc định của trình duyệt ('{nativeMsg}'): chỉ hiện bong bóng ở trường đầu tiên, không tô đỏ đồng thời các trường bắt buộc; " +
                          "ảnh chụp tự động không chụp được bong bóng này nên dùng ảnh chụp tay làm bằng chứng");
            if (!invalidFields.Contains("Địa danh"))
                notes.Add("Trường 'Địa danh' không bị báo lỗi khi form trống vì đang bị vô hiệu cho đến khi chọn Tỉnh/Thành phố");
        }
        notes.Add("Trường 'Hình ảnh' không được kiểm tra ở case này (web đã lưu được khi không có ảnh ở WEB_SVC_03); xem case về ảnh");

        TestContext.Out.WriteLine($"Số yêu cầu tạo dịch vụ bị chặn: {blocked.Count} (không có dịch vụ nào được tạo)");
        foreach (var n in notes) TestContext.Out.WriteLine("GHI CHÚ: " + n);
        Assert.That(problems, Is.Empty, string.Join(" | ", problems));
    }
}