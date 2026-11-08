using System.Diagnostics;
using System.Text.RegularExpressions;
using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace TravelAI.UITests;

[TestFixture]
public class Cart04Tests : PageTest
{
    private const string BaseUrl = "http://localhost:5173";

    // Thay bằng tài khoản Customer thật (giỏ có ít nhất 1 dịch vụ)
    private const string Email = "cristiananguyen@gmail.com";
    private const string Password = "123456";

    // Trang đích của nút gợi ý: trang tìm kiếm / danh sách dịch vụ (sửa nếu web dùng đường dẫn khác)
    private static readonly Regex SearchPath = new(@"/services|/search", RegexOptions.IgnoreCase);

    // Thông báo giỏ trống, chấp nhận cả dạng có dấu và không dấu để kiểm tra chức năng
    private static readonly Regex EmptyText = new(@"Gi[oỏ] h[aà]ng [dđ]ang tr[oố]ng", RegexOptions.IgnoreCase);
    private static readonly Regex SuggestName = new(@"xem d[iị]ch v[uụ]", RegexOptions.IgnoreCase);

    private readonly Stopwatch _clock = Stopwatch.StartNew();

    [Test, CancelAfter(600_000)]
    public async Task WEB_CART_04_GioHangTrong()
    {
        var problems = new List<string>();   // lỗi chức năng
        var notes = new List<string>();      // ghi chú cho báo cáo (không làm Failed)
        var dialogs = new List<string>();

        // Hộp thoại xác nhận của "XÓA TẤT CẢ": phải chọn OK (không có handler thì trình duyệt tự bấm Huỷ)
        Page.Dialog += (_, d) =>
        {
            dialogs.Add(d.Message);
            TestContext.Out.WriteLine($"[HỘP THOẠI {d.Type}] {d.Message}");
            _ = d.AcceptAsync();
        };
        Page.Response += (_, r) =>
        {
            if (r.Url.Contains("/api/cart") && r.Request.Method != "GET")
                TestContext.Out.WriteLine($"[t={_clock.ElapsedMilliseconds,6} ms] {r.Request.Method} {r.Status} {r.Url}");
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

        // Bước 1: vào Giỏ hàng, chờ danh sách hoặc thông báo trống hiện ra
        await header.GetByRole(AriaRole.Link, new() { Name = "Giỏ hàng" }).ClickAsync();
        await Expect(Page).ToHaveURLAsync(new Regex(@"/cart"));
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Giỏ hàng của bạn" })).ToBeVisibleAsync();
        await Expect(Page.GetByRole(AriaRole.Article).Or(Page.GetByText(EmptyText)).First)
            .ToBeVisibleAsync(new() { Timeout = 30000 });
        await Page.WaitForTimeoutAsync(2000);   // nghỉ như người dùng thật trước khi thao tác

        var itemCount = await Page.GetByRole(AriaRole.Article).CountAsync();
        TestContext.Out.WriteLine($"Số dịch vụ trong giỏ trước khi xóa: {itemCount}");
        await Page.ScreenshotAsync(new() { Path = "WEB_CART_04_truoc_khi_xoa.png" });

        if (itemCount == 0)
        {
            notes.Add("Giỏ hàng đã trống từ đầu nên bỏ qua bước xóa; chỉ kiểm tra màn hình giỏ trống (Pre-conditions chưa đúng)");
        }
        else
        {
            // Bước 2: bấm "XÓA TẤT CẢ" (hộp thoại xác nhận được chọn OK ở handler trên)
            var sw = Stopwatch.StartNew();
            await Page.GetByRole(AriaRole.Button, new() { Name = "Xóa tất cả" }).ClickAsync();
            try
            {
                await Expect(Page.GetByText(EmptyText).First).ToBeVisibleAsync(new() { Timeout = 60000 });
            }
            catch (PlaywrightException)
            {
                await Page.ScreenshotAsync(new() { Path = "WEB_CART_04_loi_khong_trong.png" });
                Assert.Fail("Bấm XÓA TẤT CẢ nhưng sau 60 giây giỏ hàng chưa hiện thông báo trống" +
                            (dialogs.Count == 0 ? " (web không hiện hộp thoại xác nhận)" : $" (hộp thoại: {dialogs[0]})"));
            }
            TestContext.Out.WriteLine($"Thông báo giỏ trống hiện sau {sw.ElapsedMilliseconds} ms");
            if (sw.ElapsedMilliseconds > 3000) notes.Add($"Phản hồi chậm: giao diện đổi sau {sw.ElapsedMilliseconds} ms");
            notes.Add(dialogs.Count > 0
                ? $"Web hiện hộp thoại xác nhận khi XÓA TẤT CẢ: '{dialogs[0]}'"
                : "Web KHÔNG hiện hộp thoại xác nhận khi XÓA TẤT CẢ");
        }

        // Tải lại trang để chắc chắn backend đã xóa hết
        await Page.ReloadAsync();
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Giỏ hàng của bạn" })).ToBeVisibleAsync();
        await Expect(Page.GetByText(EmptyText).First).ToBeVisibleAsync(new() { Timeout = 60000 });
        await Page.ScreenshotAsync(new() { Path = "WEB_CART_04_gio_trong.png" });

        // Expected 1: danh sách và khung Tổng tiền biến mất
        if (await Page.GetByRole(AriaRole.Article).CountAsync() != 0)
            problems.Add("Giỏ trống nhưng vẫn còn dịch vụ trong danh sách");
        if (await Page.GetByRole(AriaRole.Heading, new() { Name = "Tổng tiền" }).CountAsync() != 0)
            problems.Add("Giỏ trống nhưng vẫn hiển thị khung Tổng tiền");

        // Expected 2: thông báo giỏ trống (ghi chú nếu hiển thị không dấu)
        var emptyShown = (await Page.GetByText(EmptyText).First.InnerTextAsync()).Trim();
        TestContext.Out.WriteLine($"Thông báo giỏ trống: '{emptyShown}'");
        if (!Regex.IsMatch(emptyShown, @"Giỏ hàng đang trống", RegexOptions.IgnoreCase))
            notes.Add($"LỖI GIAO DIỆN (mức Thấp): thông báo giỏ trống hiển thị không dấu: '{emptyShown}'");

        // Expected 3: menu Giỏ hàng không còn số lượng
        var cartMenu = Regex.Replace(await header.GetByRole(AriaRole.Link, new() { Name = "Giỏ hàng" }).InnerTextAsync(), @"\s+", " ");
        TestContext.Out.WriteLine($"Menu giỏ hàng: '{cartMenu}'");
        if (Regex.IsMatch(cartMenu, @"\d")) problems.Add($"Giỏ trống nhưng menu Giỏ hàng vẫn hiện số lượng: '{cartMenu}'");

        // Expected 4: nút gợi ý dẫn tới trang tìm kiếm/danh sách dịch vụ
        var suggest = Page.GetByRole(AriaRole.Link, new() { NameRegex = SuggestName })
            .Or(Page.GetByRole(AriaRole.Button, new() { NameRegex = SuggestName })).First;
        await Expect(suggest).ToBeVisibleAsync();
        var suggestText = (await suggest.InnerTextAsync()).Trim();
        TestContext.Out.WriteLine($"Nút gợi ý: '{suggestText}'");
        if (!Regex.IsMatch(suggestText, @"Xem dịch vụ", RegexOptions.IgnoreCase))
            notes.Add($"LỖI GIAO DIỆN (mức Thấp): nút gợi ý hiển thị không dấu: '{suggestText}'");

        await suggest.ClickAsync();
        try
        {
            await Expect(Page).ToHaveURLAsync(SearchPath, new() { Timeout = 30000 });
        }
        catch (PlaywrightException)
        {
            problems.Add($"Bấm nút gợi ý nhưng chuyển tới '{Page.Url}', không phải trang tìm kiếm/danh sách dịch vụ ({SearchPath})");
        }
        TestContext.Out.WriteLine($"Sau khi bấm nút gợi ý, URL: {Page.Url}");
        await Page.ScreenshotAsync(new() { Path = "WEB_CART_04_sau_khi_bam_goi_y.png" });

        foreach (var n in notes) TestContext.Out.WriteLine("GHI CHÚ: " + n);
        Assert.That(problems, Is.Empty, string.Join(" | ", problems));
    }
}