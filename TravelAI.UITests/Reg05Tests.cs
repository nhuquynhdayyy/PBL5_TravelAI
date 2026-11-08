using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace TravelAI.UITests;

[TestFixture]
public class Reg05Tests : PageTest
{
    private const string BaseUrl = "http://localhost:5173";
    private const string GmailUser = "test";

    [Test]
    public async Task WEB_REG_05_MatKhau7KyTu()
    {
        var email = $"{GmailUser}+reg05{DateTime.Now:yyyyMMddHHmmss}@gmail.com";
        TestContext.Out.WriteLine($"Email dùng để đăng ký: {email}");

        // Bước 1: mở website, bấm "Đăng ký"
        await Page.GotoAsync(BaseUrl);
        await Page.GetByRole(AriaRole.Banner)
            .GetByRole(AriaRole.Button, new() { Name = "Đăng ký" }).ClickAsync();

        // Bước 2: nhập thông tin, mật khẩu 7 ký tự
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "Nhập họ và tên của bạn" }).FillAsync("Nguyễn Văn A");
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "name@example.com" }).FillAsync(email);
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "••••••••" }).FillAsync("Te@1234");

        // Ghi lại hộp thoại báo lỗi nếu web có hiện
        string? dialogMessage = null;
        void Handler(object? sender, IDialog dialog)
        {
            dialogMessage = dialog.Message;
            _ = dialog.AcceptAsync();
        }
        Page.Dialog += Handler;
        try
        {
            // Bước 3: bấm "Tạo tài khoản"
            await Page.GetByRole(AriaRole.Button, new() { Name = "Tạo tài khoản" }).ClickAsync();

            // Chờ tối đa 10 giây xem web có cho đăng ký thành công không
            var registered = false;
            try
            {
                await Page.GetByText("Đăng ký thành công").First
                    .WaitForAsync(new() { State = WaitForSelectorState.Visible, Timeout = 10000 });
                registered = true;
            }
            catch (Exception ex) when (ex is System.TimeoutException || ex is PlaywrightException) { }

            TestContext.Out.WriteLine($"Hộp thoại của web (nếu có): {dialogMessage ?? "(không có)"}");

            // Expected: mật khẩu 7 ký tự phải bị từ chối, không hiện màn hình thành công
            Assert.That(registered, Is.False,
                "Web vẫn cho đăng ký với mật khẩu 7 ký tự (SRS yêu cầu tối thiểu 8 ký tự)");
        }
        finally { Page.Dialog -= Handler; }
    }
}