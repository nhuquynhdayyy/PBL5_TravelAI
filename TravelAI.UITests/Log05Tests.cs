using System.Text.RegularExpressions;
using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace TravelAI.UITests;

[TestFixture]
public class Log05Tests : PageTest
{
    private const string BaseUrl = "http://localhost:5173";

    // Tài khoản đã bị Admin vô hiệu hóa, dùng RIÊNG cho case này
    private const string LockedEmail = "cristiananguyen@gmail.com";
    private const string LockedPassword = "123456";

    private const string ExpectedMessage = "Tài khoản của bạn đã bị vô hiệu hóa, vui lòng liên hệ Admin.";

    [Test]
    public async Task WEB_LOG_05_DangNhapTaiKhoanBiKhoa()
    {
        // Web báo lỗi bằng hộp thoại của trình duyệt, nên phải bắt hộp thoại trước khi bấm nút
        var dialogTcs = new TaskCompletionSource<string>();
        void Handler(object? sender, IDialog dialog)
        {
            dialogTcs.TrySetResult(dialog.Message);
            _ = dialog.AcceptAsync();
        }
        Page.Dialog += Handler;

        try
        {
            // Bước 1: mở website, bấm "Đăng nhập" ở header
            await Page.GotoAsync(BaseUrl);
            var header = Page.GetByRole(AriaRole.Banner);
            await header.GetByRole(AriaRole.Button, new() { Name = "Đăng nhập" }).ClickAsync();
            await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Chào mừng quay lại" }))
                .ToBeVisibleAsync();

            // Bước 2: nhập email và mật khẩu đúng của tài khoản bị khóa
            await Page.GetByRole(AriaRole.Textbox, new() { Name = "name@company.com" }).FillAsync(LockedEmail);
            await Page.GetByRole(AriaRole.Textbox, new() { Name = "••••••••" }).FillAsync(LockedPassword);

            // Bước 3: bấm "Đăng nhập" trong form
            await Page.GetByRole(AriaRole.Main).GetByRole(AriaRole.Button, new() { Name = "Đăng nhập" }).ClickAsync();

            // Chờ hộp thoại (tối đa 60 giây)
            var finished = await Task.WhenAny(dialogTcs.Task, Task.Delay(60000));
            Assert.That(finished, Is.SameAs(dialogTcs.Task), "Không thấy thông báo nào sau 60 giây");
            var message = await dialogTcs.Task;
            TestContext.Out.WriteLine($"Thông báo của web: {message}");
            TestContext.Out.WriteLine($"Thông báo theo SRS: {ExpectedMessage}");

            await Page.ScreenshotAsync(new() { Path = "WEB_LOG_05.png" });

            // Kiểm tra gộp để báo cáo cho biết rõ phần nào đúng, phần nào sai
            Assert.Multiple(async () =>
            {
                // Chức năng: không đăng nhập được, vẫn ở trang Đăng nhập
                Assert.That(Page.Url, Does.Contain("/login"), "Tài khoản bị khóa nhưng web đã chuyển khỏi trang Đăng nhập");
                await Expect(header.GetByRole(AriaRole.Button, new() { Name = "Đăng nhập" })).ToBeVisibleAsync();

                // Câu thông báo phải đúng SRS
                Assert.That(message, Is.EqualTo(ExpectedMessage),
                    "Câu thông báo của web khác SRS UC002 (4b)");
            });
        }
        finally { Page.Dialog -= Handler; }
    }
}