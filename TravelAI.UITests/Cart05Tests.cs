using System.Diagnostics;
using System.Text.RegularExpressions;
using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace TravelAI.UITests;

[TestFixture]
public class Cart05Tests : PageTest
{
    private const string BaseUrl = "http://localhost:5173";

    // Thay bằng tài khoản Customer thật, giỏ có 1 mục
    private const string Email = "cristiananguyen@gmail.com";
    private const string Password = "123456";

    [Test, CancelAfter(600_000)]
    public async Task WEB_CART_05_KhongTheDatSoLuongKhongHopLe()
    {
        var problems = new List<string>();
        var changeCalls = new List<string>();   // yêu cầu làm thay đổi dữ liệu (cập nhật giỏ, tạo đơn...)
        var counting = false;

        Page.Dialog += (_, d) => { TestContext.Out.WriteLine($"[HỘP THOẠI] {d.Message}"); _ = d.AcceptAsync(); };
        Page.Request += (_, r) =>
        {
            if (!counting || r.Method == "GET") return;
            if (r.Url.Contains("/api/") && !Regex.IsMatch(r.Url, "notifications|auth|hubs"))
                changeCalls.Add($"{r.Method} {r.Url}");
        };

        // Điều kiện: đăng nhập (có thể mất tới ~25 giây)
        await Page.GotoAsync(BaseUrl + "/login");
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "name@company.com" }).FillAsync(Email);
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "••••••••" }).FillAsync(Password);
        await Page.GetByRole(AriaRole.Main).GetByRole(AriaRole.Button, new() { Name = "Đăng nhập" }).ClickAsync();
        await Expect(Page).Not.ToHaveURLAsync(new Regex(@"/login"), new() { Timeout = 60000 });
        await Page.GotoAsync(BaseUrl);
        var header = Page.GetByRole(AriaRole.Banner);
        await Expect(header.GetByRole(AriaRole.Button, new() { Name = "Đăng nhập" })).ToHaveCountAsync(0);

        // Bước 1: vào Giỏ hàng
        await header.GetByRole(AriaRole.Link, new() { Name = "Giỏ hàng" }).ClickAsync();
        await Expect(Page).ToHaveURLAsync(new Regex(@"/cart"));
        var card = Page.GetByRole(AriaRole.Article).First;
        await Expect(card).ToBeVisibleAsync(new() { Timeout = 30000 });
        await Page.WaitForTimeoutAsync(2000);   // nghỉ như người dùng thật trước khi thao tác

        var minus = card.Locator("button").Filter(new() { HasTextRegex = new Regex(@"^\s*[-−–]\s*$") }).First;
        var plus = card.Locator("button").Filter(new() { HasTextRegex = new Regex(@"^\s*\+\s*$") }).First;

        // Điều kiện: số lượng đang là 1 (nếu lớn hơn thì giảm về 1, đây là bước chuẩn bị)
        for (var i = 0; i < 10 && await ReadQtyAsync() > 1; i++)
        {
            var cur = await ReadQtyAsync();
            await minus.ClickAsync();
            await WaitQtyAsync(cur - 1);
        }
        if (await ReadQtyAsync() != 1) Assert.Inconclusive("Không đưa được số lượng về 1");
        await Page.ScreenshotAsync(new() { Path = "WEB_CART_05_b0_soluong1.png" });

        // Từ đây, mọi yêu cầu làm thay đổi dữ liệu đều bị tính là lỗi
        counting = true;

        // Bước 2: nút "-" phải bị vô hiệu hóa khi số lượng = 1
        var disabled = await minus.IsDisabledAsync();
        TestContext.Out.WriteLine($"Nút '-' bị vô hiệu hóa: {disabled}");
        if (!disabled) problems.Add("Nút '-' không bị vô hiệu hóa khi số lượng = 1");

        // Thử bấm "-" 3 lần (ép bấm, bỏ qua kiểm tra enabled của Playwright)
        for (var i = 0; i < 3; i++)
            await minus.ClickAsync(new() { Force = true, Timeout = 5000 });
        await Page.WaitForTimeoutAsync(3000);
        var q1 = await ReadQtyAsync();
        TestContext.Out.WriteLine($"Số lượng sau khi bấm '-' 3 lần: {q1}");
        if (q1 != 1) problems.Add($"Bấm '-' khi số lượng = 1 làm số lượng thành {q1}");

        // Bước 3: số lượng không phải ô nhập; thử gõ "0" và "-1" bằng bàn phím
        var editable = await card.GetByRole(AriaRole.Spinbutton).CountAsync()
                     + await card.GetByRole(AriaRole.Textbox).CountAsync();
        TestContext.Out.WriteLine($"Số ô nhập (spinbutton/textbox) trong mục giỏ hàng: {editable}");
        if (editable > 0) problems.Add($"Mục giỏ hàng có {editable} ô nhập số lượng; cần kiểm tra giá trị 0 / âm bằng tay");

        var qtyText = card.GetByText("1", new() { Exact = true });
        if (await qtyText.CountAsync() > 0)
        {
            await qtyText.First.DblClickAsync();
            await Page.Keyboard.PressAsync("Control+A");
            await Page.Keyboard.TypeAsync("0");
            await Page.Keyboard.PressAsync("Enter");
            await Page.Keyboard.TypeAsync("-1");
            await Page.Keyboard.PressAsync("Enter");
            await Page.WaitForTimeoutAsync(2000);
        }
        var q2 = await ReadQtyAsync();
        TestContext.Out.WriteLine($"Số lượng sau khi gõ 0 và -1: {q2}");
        if (q2 != 1) problems.Add($"Gõ 0 / -1 làm số lượng thành {q2}");
        await Page.ScreenshotAsync(new() { Path = "WEB_CART_05_b1_sau_khi_thu.png" });

        // Bước 4: tải lại trang, số lượng vẫn là 1 (backend không bị đổi)
        await Page.ReloadAsync();
        await Expect(Page.GetByRole(AriaRole.Article).First).ToBeVisibleAsync(new() { Timeout = 30000 });
        await Page.WaitForTimeoutAsync(1000);
        var q3 = await ReadQtyAsync();
        TestContext.Out.WriteLine($"Số lượng sau khi tải lại trang: {q3}");
        if (q3 != 1) problems.Add($"Sau khi tải lại trang, số lượng là {q3}");
        await Page.ScreenshotAsync(new() { Path = "WEB_CART_05_b2_sau_khi_tai_lai.png" });

        // Không có yêu cầu thay đổi dữ liệu nào được gửi (không cập nhật giỏ, không tạo đơn)
        TestContext.Out.WriteLine("Yêu cầu thay đổi dữ liệu trong lúc thử: " +
                                  (changeCalls.Count == 0 ? "(không có)" : string.Join(" | ", changeCalls)));
        if (changeCalls.Count > 0)
            problems.Add("Web đã gửi yêu cầu thay đổi dữ liệu dù số lượng không hợp lệ: " + string.Join(", ", changeCalls));

        // Dọn trạng thái: không cần, test không làm thay đổi giỏ hàng
        Assert.That(problems, Is.Empty, string.Join(" | ", problems));
    }

    private async Task<string> BodyAsync() =>
        Regex.Replace(await Page.Locator("body").InnerTextAsync(), @"\s+", " ");

    private async Task<int> ReadQtyAsync()
    {
        var m = Regex.Match(await BodyAsync(), @"Số lượng:\s*[-−–]?\s*(\d+)\s*\+?", RegexOptions.IgnoreCase);
        Assert.That(m.Success, "Không đọc được số lượng");
        return int.Parse(m.Groups[1].Value);
    }

    private async Task WaitQtyAsync(int expected)
    {
        var sw = Stopwatch.StartNew();
        while (sw.ElapsedMilliseconds < 30000 && await ReadQtyAsync() != expected)
            await Page.WaitForTimeoutAsync(200);
    }
}