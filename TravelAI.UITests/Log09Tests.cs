using System.Text.RegularExpressions;
using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace TravelAI.UITests;

[TestFixture]
public class Log09Tests : PageTest
{
    private const string BaseUrl = "http://localhost:5173";

    private const string WeakPassword = "abc123";          // không đạt tiêu chí
    private const string ValidPassword = "Newpass@123";    // đạt tiêu chí
    private const string MismatchPassword = "Newpass@124"; // khác ValidPassword

    private const string ExpectedMismatchText = "Mật khẩu xác nhận không khớp";

    private static readonly string LinkFile = Path.Combine(Path.GetTempPath(), "travelai_reset_link_09.txt");

    private string? _dialog;

    [Test, CancelAfter(1_200_000)]
    public async Task WEB_LOG_09_MatKhauMoiKhongDatHoacKhongKhop()
    {
        if (File.Exists(LinkFile)) File.Delete(LinkFile);
        var problems = new List<string>();

        // ===== Bước 1: chờ bạn dán liên kết trong email vào file (tối đa 10 phút) =====
        TestContext.Out.WriteLine($"Đang chờ liên kết trong file: {LinkFile}");
        string? link = null;
        var deadline = DateTime.UtcNow.AddMinutes(10);
        while (DateTime.UtcNow < deadline)
        {
            if (File.Exists(LinkFile))
            {
                var text = (await File.ReadAllTextAsync(LinkFile)).Trim();
                if (text.StartsWith("http")) { link = text; break; }
            }
            await Task.Delay(2000);
        }
        Assert.That(link, Is.Not.Null, $"Sau 10 phút chưa có liên kết trong {LinkFile}");

        // Web có thể báo lỗi bằng hộp thoại, nên bắt hộp thoại
        Page.Dialog += (_, d) => { _dialog = d.Message; _ = d.AcceptAsync(); };

        await Page.GotoAsync(link!);
        await Expect(Page).ToHaveURLAsync(new Regex(@"/reset-password"));

        // ===== Bước 2: mật khẩu mới không đạt tiêu chí (abc123) =====
        var body2 = await TryResetAsync(WeakPassword, WeakPassword, "WEB_LOG_09_buoc2_matkhauyeu.png");

        if (Succeeded(body2))
        {
            // Web chấp nhận mật khẩu yếu và đã đặt lại: liên kết đã dùng, không làm tiếp bước 3 được
            problems.Add($"Bước 2: web chấp nhận mật khẩu '{WeakPassword}' và đặt lại thành công (SRS UC002b 9a yêu cầu từ chối)");
            Assert.That(problems, Is.Empty, string.Join(" | ", problems));
            return;
        }

        // Expected bước 2: hiển thị điều kiện mật khẩu chưa đạt
        if (!body2.Contains("8 ký tự", StringComparison.OrdinalIgnoreCase)
            || !body2.Contains("chữ hoa", StringComparison.OrdinalIgnoreCase))
            problems.Add("Bước 2: không thấy điều kiện mật khẩu chưa đạt (tối thiểu 8 ký tự, chữ hoa, chữ thường, số, ký tự đặc biệt)");
        if (!Regex.IsMatch(Page.Url, "/reset-password"))
            problems.Add($"Bước 2: web rời khỏi trang đặt lại mật khẩu (URL: {Page.Url})");

        // ===== Bước 3: hai mật khẩu không khớp =====
        var body3 = await TryResetAsync(ValidPassword, MismatchPassword, "WEB_LOG_09_buoc3_khongkhop.png");

        if (Succeeded(body3))
        {
            problems.Add("Bước 3: web đặt lại thành công dù hai mật khẩu không khớp (SRS UC002b 9b yêu cầu từ chối)");
        }
        else
        {
            // Expected bước 3: đúng câu theo SRS
            if (!body3.Contains(ExpectedMismatchText, StringComparison.OrdinalIgnoreCase))
                problems.Add($"Bước 3: thông báo khác SRS UC002b 9b: SRS ghi '{ExpectedMismatchText}', " +
                             "web hiển thị khác (xem ảnh WEB_LOG_09_buoc3_khongkhop.png và nội dung trang trong log)");
            if (!Regex.IsMatch(Page.Url, "/reset-password"))
                problems.Add($"Bước 3: web rời khỏi trang đặt lại mật khẩu (URL: {Page.Url})");
        }

        Assert.That(problems, Is.Empty, string.Join(" | ", problems));
    }

    // Nhập hai ô, bấm "Đặt lại mật khẩu", chờ rồi trả về toàn bộ chữ trên trang (kèm hộp thoại nếu có)
    private async Task<string> TryResetAsync(string password, string confirm, string screenshotName)
    {
        _dialog = null;
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "Tối thiểu 8 ký tự" }).FillAsync(password);
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "Nhập lại mật khẩu mới" }).FillAsync(confirm);
        await Page.GetByRole(AriaRole.Button, new() { Name = "Đặt lại mật khẩu" })
            .ClickAsync(new() { Timeout = 10000 });
        await Page.WaitForTimeoutAsync(3000);

        var body = Regex.Replace(await Page.Locator("body").InnerTextAsync(), @"\s+", " ");
        if (_dialog != null) body += " " + _dialog;
        TestContext.Out.WriteLine($"[{password} / {confirm}] Nội dung trang: {body}");
        if (_dialog != null) TestContext.Out.WriteLine($"[{password} / {confirm}] Hộp thoại: {_dialog}");
        await Page.ScreenshotAsync(new() { Path = screenshotName });
        return body;
    }

    // Đã đặt lại thành công: hiện màn "Đăng nhập ngay" hoặc đã chuyển sang /login
    private bool Succeeded(string body) =>
        body.Contains("Đăng nhập ngay", StringComparison.OrdinalIgnoreCase)
        || Regex.IsMatch(Page.Url, "/login");
}