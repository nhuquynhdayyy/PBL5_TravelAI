using System.Diagnostics;
using System.Text.RegularExpressions;
using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace TravelAI.UITests;

[TestFixture]
public class Svc02Tests : PageTest
{
    private const string BaseUrl = "http://localhost:5173";

    // Tài khoản Partner đã được Admin phê duyệt (đừng commit mật khẩu lên GitHub chung)
    private const string Email = "partner.danangresort@gmail.com";
    private const string Password = "123456";

    // Dịch vụ cần xem chi tiết (một phần của tên để tránh lệch do tên bị cắt ở danh sách).
    // Đổi thành "Villa Mặt Biển" để kiểm tra trường hợp dịch vụ chưa có mô tả.
    private const string ServiceKey = "Bà Nà Hills";

    private static readonly Regex ManageName = new(@"Qu[ảa]n l[ýy] chi ti[ếe]t", RegexOptions.IgnoreCase);
    private static readonly Regex PriceRx = new(@"\d{1,3}([.,]\d{3})+\s*[₫đĐ]", RegexOptions.IgnoreCase);
    private static readonly Regex StatusRx = new(
        @"ch[ờo] ph[êe] duy[ệe]t|[đd][ãa] (ph[êe] )?duy[ệe]t|b[ịi] t[ừu] ch[ốo]i|ng[ừu]ng ho[ạa]t [đd][ộo]ng|[đd]ang hi[ểe]n th[ịi]",
        RegexOptions.IgnoreCase);

    [Test, CancelAfter(600_000)]
    public async Task WEB_SVC_02_XemChiTietDichVu()
    {
        var problems = new List<string>();   // lỗi chức năng (làm test Failed)
        var notes = new List<string>();      // ghi chú cho báo cáo (không làm Failed)

        // Điều kiện: đăng nhập bằng tài khoản Partner (có thể mất tới ~25 giây)
        await Page.GotoAsync(BaseUrl + "/login");
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "name@company.com" }).FillAsync(Email);
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "••••••••" }).FillAsync(Password);
        await Page.GetByRole(AriaRole.Main).GetByRole(AriaRole.Button, new() { Name = "Đăng nhập" }).ClickAsync();
        await Expect(Page).ToHaveURLAsync(new Regex(@"/partner/"), new() { Timeout = 60000 });

        // Bước 1: vào menu "Dịch vụ", chờ danh sách tải xong (có thể mất ~25 giây)
        await Page.GetByRole(AriaRole.Navigation)
            .GetByRole(AriaRole.Link, new() { Name = "Dịch vụ", Exact = true }).First.ClickAsync();
        await Expect(Page).ToHaveURLAsync(new Regex(@"/partner/services/?$"));
        var manage = Page.GetByRole(AriaRole.Link, new() { NameRegex = ManageName })
            .Or(Page.GetByRole(AriaRole.Button, new() { NameRegex = ManageName }));
        await Expect(manage.First).ToBeVisibleAsync(new() { Timeout = 60000 });

        // Tìm thẻ của dịch vụ cần xem (đi lên từ nút "Quản lý chi tiết" đến phần tử đầu tiên có chứa giá tiền)
        var count = await manage.CountAsync();
        var idx = -1;
        var listText = "";
        for (var i = 0; i < count; i++)
        {
            var t = await manage.Nth(i).EvaluateAsync<string>(@"el => {
                let c = el.parentElement;
                while (c) {
                    const t = c.innerText || '';
                    if (/\d{1,3}([.,]\d{3})+\s*[₫đĐ]/i.test(t)) return t;
                    c = c.parentElement;
                }
                return '';
            }");
            if (t.Contains(ServiceKey, StringComparison.OrdinalIgnoreCase)) { idx = i; listText = t; break; }
        }
        if (idx < 0) Assert.Inconclusive($"Không tìm thấy dịch vụ chứa '{ServiceKey}' trong danh sách (Pre-conditions chưa đúng)");

        var listPrice = PriceRx.Match(listText).Value;
        var listDigits = Regex.Replace(listPrice, @"\D", "");
        TestContext.Out.WriteLine($"Thẻ #{idx + 1} ở danh sách: {listText.Replace("\n", " | ")}");

        // Bước 2: bấm "Quản lý chi tiết"
        var clock = Stopwatch.StartNew();
        await manage.Nth(idx).ClickAsync();
        try
        {
            await Expect(Page).ToHaveURLAsync(new Regex(@"/partner/services/\d+/manage"), new() { Timeout = 60000 });
            await Expect(Page.GetByText(ServiceKey).First).ToBeVisibleAsync(new() { Timeout = 60000 });
        }
        catch (PlaywrightException)
        {
            await Page.ScreenshotAsync(new() { Path = "WEB_SVC_02_loi.png", FullPage = true });
            Assert.Fail($"Bấm 'Quản lý chi tiết' nhưng không mở được trang chi tiết (URL hiện tại: {Page.Url})");
        }
        TestContext.Out.WriteLine($"Trang chi tiết hiện sau {clock.ElapsedMilliseconds} ms, URL: {Page.Url}");
        if (clock.ElapsedMilliseconds > 3000) notes.Add($"Phản hồi chậm: trang chi tiết hiện sau {clock.ElapsedMilliseconds} ms");
        await Page.WaitForTimeoutAsync(1500);   // chờ ảnh (nếu có) tải xong
        await Page.ScreenshotAsync(new() { Path = "WEB_SVC_02_chi_tiet.png", FullPage = true });

        var body = await Page.Locator("body").InnerTextAsync();
        TestContext.Out.WriteLine("Nội dung trang: " + body.Replace("\n", " | "));

        // Expected: giá gốc khớp giá ở danh sách
        var detailPrices = PriceRx.Matches(body).Select(m => m.Value).Distinct().ToList();
        TestContext.Out.WriteLine($"Giá ở danh sách: {listPrice}; giá trên trang chi tiết: {string.Join(", ", detailPrices)}");
        if (detailPrices.Count == 0) problems.Add("Trang chi tiết không hiển thị giá gốc");
        else if (!detailPrices.Any(p => Regex.Replace(p, @"\D", "") == listDigits))
            problems.Add($"Giá trên trang chi tiết ({string.Join(", ", detailPrices)}) khác giá ở danh sách ({listPrice})");

        // Expected: trạng thái
        var status = StatusRx.Match(body);
        TestContext.Out.WriteLine($"Trạng thái: '{status.Value}'");
        if (!status.Success) problems.Add("Trang chi tiết không hiển thị trạng thái dịch vụ");
        else if (!Regex.IsMatch(status.Value, @"ph[êe] duy[ệe]t|t[ừu] ch[ốo]i|ng[ừu]ng ho[ạa]t", RegexOptions.IgnoreCase))
            notes.Add($"Nhãn trạng thái là '{status.Value}', khác tên trạng thái trong SRS (Chờ phê duyệt/Đã phê duyệt/Bị từ chối/Ngừng hoạt động)");

        // Expected: mô tả (hoặc thông báo chưa có mô tả)
        if (!Regex.IsMatch(body, @"M[ôo] t[ảa]", RegexOptions.IgnoreCase)) problems.Add("Trang chi tiết không có phần Mô tả");
        else if (Regex.IsMatch(body, @"ch[ưu]a [đd][ưu][ơo]c c[ậa]p nh[ậa]t", RegexOptions.IgnoreCase))
            notes.Add("Dịch vụ chưa có mô tả: web hiển thị thông báo chưa cập nhật (đạt)");

        // Expected: hình ảnh (không tính logo/biểu tượng ở header, footer)
        var imgs = await Page.EvaluateAsync<int[]>(@"() => {
            const l = Array.from(document.images).filter(i => !i.closest('header, nav, footer') && i.width >= 100 && i.height >= 80);
            return [l.length, l.filter(i => i.complete && i.naturalWidth === 0).length];
        }");
        TestContext.Out.WriteLine($"Số ảnh dịch vụ trên trang: {imgs[0]} (lỗi tải: {imgs[1]})");
        if (imgs[0] == 0) problems.Add("Trang chi tiết không hiển thị hình ảnh dịch vụ (SRS UC007 mục Xem, bước 4)");
        else if (imgs[1] > 0) notes.Add($"{imgs[1]}/{imgs[0]} ảnh trên trang chi tiết bị lỗi không tải được");

        // Expected: chính sách
        var content = await Page.EvaluateAsync<string>(@"() => {
            const c = document.body.cloneNode(true);
            c.querySelectorAll('header, nav, footer').forEach(e => e.remove());
            return c.textContent;
        }");
        if (!Regex.IsMatch(content, @"ch[íi]nh s[áa]ch", RegexOptions.IgnoreCase))
            problems.Add("Trang chi tiết không hiển thị chính sách của dịch vụ (SRS UC007 mục Xem, bước 4)");

        // Expected: nút "Quản lý lịch bán & tồn kho"
        var stockBtn = Page.GetByRole(AriaRole.Link, new() { NameRegex = new Regex(@"l[ịi]ch b[áa]n", RegexOptions.IgnoreCase) })
            .Or(Page.GetByRole(AriaRole.Button, new() { NameRegex = new Regex(@"l[ịi]ch b[áa]n", RegexOptions.IgnoreCase) })).First;
        if (await stockBtn.CountAsync() == 0) problems.Add("Trang chi tiết thiếu nút 'Quản lý lịch bán & tồn kho'");

        foreach (var n in notes) TestContext.Out.WriteLine("GHI CHÚ: " + n);
        Assert.That(problems, Is.Empty, string.Join(" | ", problems));
    }
}