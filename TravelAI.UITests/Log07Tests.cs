using System.Text.RegularExpressions;
using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace TravelAI.UITests;

[TestFixture]
public class Log07Tests : PageTest
{
    private const string BaseUrl = "http://localhost:5173";

    private const string Email = "nguyenhoangoanh5d@gmail.com";

    private const string OldPassword = "Oanh141356@";
    private const string NewPassword = "Newpass@456";

    private const string ExpectedSuccessText = "Đặt lại mật khẩu thành công";

    // Bạn dán liên kết đặt lại mật khẩu vào file này trong lúc test đang chờ
    private static readonly string LinkFile = Path.Combine(Path.GetTempPath(), "travelai_reset_link.txt");

    [Test, CancelAfter(1_200_000)]
    public async Task WEB_LOG_07_QuenMatKhauDatLaiThanhCong()
    {
        if (File.Exists(LinkFile)) File.Delete(LinkFile);

        // Các điểm lệch SRS: test chạy tiếp hết các bước rồi mới báo ở cuối
        var problems = new List<string>();

        // ===== Bước 1: bấm "Đăng nhập" rồi "Quên mật khẩu?" =====
        await Page.GotoAsync(BaseUrl);
        await Page.GetByRole(AriaRole.Banner).GetByRole(AriaRole.Button, new() { Name = "Đăng nhập" }).ClickAsync();
        await Page.GetByRole(AriaRole.Link, new() { Name = "Quên mật khẩu?" }).ClickAsync();
        await Expect(Page).ToHaveURLAsync(new Regex(@"/forgot-password"));
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Quên mật khẩu?" })).ToBeVisibleAsync();

        // ===== Bước 2: nhập email, gửi yêu cầu =====
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "name@example.com" }).FillAsync(Email);
        await Page.GetByRole(AriaRole.Button, new() { Name = "Gửi link đặt lại mật khẩu" }).ClickAsync();

        // Expected 1: hiện màn "Kiểm tra hộp thư!" kèm email đã nhập
        await Expect(Page.GetByText("Kiểm tra hộp thư")).ToBeVisibleAsync(new() { Timeout = 60000 });
        await Expect(Page.GetByText(Email).First).ToBeVisibleAsync();
        await Page.ScreenshotAsync(new() { Path = "WEB_LOG_07_buoc2_kiemtrahopthu.png" });

        // ===== Bước 3: chờ bạn dán liên kết trong email vào file (tối đa 10 phút) =====
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

        // ===== Bước 4: mở liên kết, nhập mật khẩu mới và xác nhận =====
        var resetDialog = CaptureDialog(Page);
        await Page.GotoAsync(link!);
        await Expect(Page).ToHaveURLAsync(new Regex(@"/reset-password"));

        await Page.GetByRole(AriaRole.Textbox, new() { Name = "Tối thiểu 8 ký tự" }).FillAsync(NewPassword);
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "Nhập lại mật khẩu mới" }).FillAsync(NewPassword);
        await Page.ScreenshotAsync(new() { Path = "WEB_LOG_07_buoc4_nhapmatkhaumoi.png" });

        await Page.GetByRole(AriaRole.Button, new() { Name = "Đặt lại mật khẩu" }).ClickAsync();

        // Chờ màn thành công (liên kết/nút "Đăng nhập ngay"), hoặc web chuyển trang, hoặc hiện hộp thoại lỗi
        var successTask = Page.GetByRole(AriaRole.Link, new() { Name = "Đăng nhập ngay" })
            .Or(Page.GetByRole(AriaRole.Button, new() { Name = "Đăng nhập ngay" }))
            .First.WaitForAsync(new() { State = WaitForSelectorState.Visible, Timeout = 60000 });
        var loginTask = Page.WaitForURLAsync(new Regex(@"/login"), new() { Timeout = 60000 });
        _ = successTask.ContinueWith(t => { _ = t.Exception; });
        _ = loginTask.ContinueWith(t => { _ = t.Exception; });

        var first = await Task.WhenAny(successTask, loginTask, resetDialog.Task);

        // Luôn chụp ảnh và in nội dung trang để biết web hiển thị gì
        await Page.ScreenshotAsync(new() { Path = "WEB_LOG_07_buoc4_ketqua.png" });
        var bodyText = await Page.Locator("body").InnerTextAsync();
        TestContext.Out.WriteLine("Nội dung trang sau khi bấm nút:\n" + bodyText);

        if (first == resetDialog.Task)
        {
            Assert.Fail($"Web hiện hộp thoại thay vì màn thành công: {await resetDialog.Task}");
        }
        else if (first == loginTask)
        {
            problems.Add("Web chuyển về Đăng nhập ngay, không thấy màn thông báo thành công");
        }
        else
        {
            await successTask;   // nếu quá 60 giây không thấy màn thành công thì lỗi hiện ra ở đây

            // Expected 2: thông báo thành công đúng SRS UC002b bước 11
            if (!bodyText.Contains(ExpectedSuccessText, StringComparison.OrdinalIgnoreCase))
                problems.Add($"Thông báo thành công khác SRS UC002b bước 11: SRS ghi '{ExpectedSuccessText}', " +
                             "web hiển thị khác (xem ảnh WEB_LOG_07_buoc4_ketqua.png)");

            // Expected 3: web tự chuyển về màn hình Đăng nhập (chờ tối đa 15 giây)
            try
            {
                await Page.WaitForURLAsync(new Regex(@"/login"), new() { Timeout = 15000 });
            }
            catch (Exception ex) when (ex is PlaywrightException || ex is System.TimeoutException)
            {
                problems.Add("Web không tự chuyển về màn hình Đăng nhập sau khi đặt lại thành công");
            }
        }

        // Dù web có tự chuyển hay không, đi tới trang Đăng nhập để kiểm tra các bước sau
        if (!Regex.IsMatch(Page.Url, @"/login")) await Page.GotoAsync(BaseUrl + "/login");
        await Page.ScreenshotAsync(new() { Path = "WEB_LOG_07_buoc4_vedangnhap.png" });

        // ===== Bước 5a: đăng nhập bằng mật khẩu mới =====
        await LoginAsync(Page, Email, NewPassword);
        await Expect(Page).Not.ToHaveURLAsync(new Regex(@"/login"), new() { Timeout = 60000 });
        await Expect(Page.GetByRole(AriaRole.Banner).GetByRole(AriaRole.Button, new() { Name = "Đăng nhập" }))
            .ToHaveCountAsync(0);
        await Page.ScreenshotAsync(new() { Path = "WEB_LOG_07_buoc5_dangnhapmatkhaumoi.png" });

        // ===== Bước 5b: thử mật khẩu cũ trong phiên trình duyệt mới =====
        var ctx2 = await Browser.NewContextAsync();
        try
        {
            var page2 = await ctx2.NewPageAsync();
            var oldDialog = CaptureDialog(page2);
            await LoginAsync(page2, Email, OldPassword);

            var finished = await Task.WhenAny(oldDialog.Task, Task.Delay(60000));
            Assert.That(finished, Is.SameAs(oldDialog.Task), "Dùng mật khẩu cũ mà không thấy thông báo lỗi");
            var oldMsg = await oldDialog.Task;
            TestContext.Out.WriteLine($"Thông báo khi dùng mật khẩu cũ: {oldMsg}");

            // Expected 4: mật khẩu cũ không còn dùng được
            Assert.That(oldMsg, Is.EqualTo("Email hoặc mật khẩu không đúng."));
            await Expect(page2).ToHaveURLAsync(new Regex(@"/login"));
            await page2.ScreenshotAsync(new() { Path = "WEB_LOG_07_buoc5_matkhaucu.png" });
        }
        finally { await ctx2.CloseAsync(); }

        // Kết luận: báo tất cả điểm lệch SRS đã gặp ở trên
        Assert.That(problems, Is.Empty, string.Join(" | ", problems));
    }

    // Web báo lỗi bằng hộp thoại của trình duyệt, nên phải bắt hộp thoại trước khi bấm nút
    private static TaskCompletionSource<string> CaptureDialog(IPage page)
    {
        var tcs = new TaskCompletionSource<string>();
        page.Dialog += (_, d) =>
        {
            tcs.TrySetResult(d.Message);
            _ = d.AcceptAsync();
        };
        return tcs;
    }

    private static async Task LoginAsync(IPage page, string email, string password)
    {
        await page.GotoAsync(BaseUrl + "/login");
        await page.GetByRole(AriaRole.Textbox, new() { Name = "name@company.com" }).FillAsync(email);
        await page.GetByRole(AriaRole.Textbox, new() { Name = "••••••••" }).FillAsync(password);
        await page.GetByRole(AriaRole.Main).GetByRole(AriaRole.Button, new() { Name = "Đăng nhập" }).ClickAsync();
    }
}