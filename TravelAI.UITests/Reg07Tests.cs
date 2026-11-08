using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace TravelAI.UITests;

[TestFixture]
public class Reg07Tests : PageTest
{
    private const string BaseUrl = "http://localhost:5173";
    private const string GmailUser = "abcde";

    [TestCase("test@1234")]    // thiếu chữ hoa
    [TestCase("TEST@1234")]    // thiếu chữ thường
    [TestCase("Test@abcd")]    // thiếu số
    [TestCase("Test12345")]    // thiếu ký tự đặc biệt
    public async Task WEB_REG_07_MatKhauThieuThanhPhan(string password)
    {
        var email = $"{GmailUser}+reg07{DateTime.Now:yyyyMMddHHmmssfff}@gmail.com";
        TestContext.Out.WriteLine($"Mật khẩu thử: {password} | Email: {email}");

        // Bước 1: mở website, bấm "Đăng ký"
        await Page.GotoAsync(BaseUrl);
        await Page.GetByRole(AriaRole.Banner)
            .GetByRole(AriaRole.Button, new() { Name = "Đăng ký" }).ClickAsync();

        // Bước 2 và 3: nhập thông tin với mật khẩu thiếu thành phần
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "Nhập họ và tên của bạn" }).FillAsync("Nguyễn Văn A");
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "name@example.com" }).FillAsync(email);
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "••••••••" }).FillAsync(password);

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
            // Bước 4: bấm "Tạo tài khoản"
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

            // Expected: mật khẩu thiếu thành phần phải bị từ chối
            Assert.That(registered, Is.False,
                $"Web vẫn cho đăng ký với mật khẩu '{password}' (SRS yêu cầu đủ chữ hoa, thường, số, ký tự đặc biệt)");
        }
        finally { Page.Dialog -= Handler; }
    }
}