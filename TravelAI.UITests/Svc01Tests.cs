using System.Diagnostics;
using System.Text.RegularExpressions;
using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace TravelAI.UITests;

[TestFixture]
public class Svc01Tests : PageTest
{
    private const string BaseUrl = "http://localhost:5173";

    // Tài khoản Partner đã được Admin phê duyệt (đừng commit mật khẩu lên GitHub chung)
    private const string Email = "partner.danangresort@gmail.com";
    private const string Password = "123456";

    private static readonly Regex ManageName = new(@"Qu[ảa]n l[ýy] chi ti[ếe]t", RegexOptions.IgnoreCase);

    // Các mẫu nhận diện từng dòng chữ trong thẻ dịch vụ (InnerText đã áp dụng chữ in hoa của CSS)
    private static readonly Regex TypeLine = new(@"^(kh[áa]ch s[ạa]n|tour du l[ịi]ch|tour|di chuy[ểe]n|xe)$", RegexOptions.IgnoreCase);
    private static readonly Regex PriceLine = new(@"\d{1,3}([.,]\d{3})+\s*[₫đĐ]", RegexOptions.IgnoreCase);
    private static readonly Regex StatusLine = new(@"hi[ểe]n th[ịi]|duy[ệe]t|t[ừu] ch[ốo]i|ng[ừu]ng ho[ạa]t|ch[ờo] ph[êe]", RegexOptions.IgnoreCase);
    private static readonly Regex ButtonLine = new(@"qu[ảa]n l[ýy] chi ti[ếe]t|ch[ỉi]nh s[ửu]a|^x[óo]a$", RegexOptions.IgnoreCase);
    private static readonly Regex NoImageLine = new(@"ch[ưu]a c[óo] [ảa]nh", RegexOptions.IgnoreCase);

    [Test, CancelAfter(600_000)]
    public async Task WEB_SVC_01_XemDanhSachDichVu()
    {
        var problems = new List<string>();   // lỗi chức năng (làm test Failed)
        var notes = new List<string>();      // ghi chú cho báo cáo (không làm Failed)

        // Điều kiện: đăng nhập bằng tài khoản Partner (có thể mất tới ~25 giây)
        await Page.GotoAsync(BaseUrl + "/login");
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "name@company.com" }).FillAsync(Email);
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "••••••••" }).FillAsync(Password);
        await Page.GetByRole(AriaRole.Main).GetByRole(AriaRole.Button, new() { Name = "Đăng nhập" }).ClickAsync();
        await Expect(Page).ToHaveURLAsync(new Regex(@"/partner/"), new() { Timeout = 60000 });

        // Bước 2: bấm menu "Dịch vụ"
        var clock = Stopwatch.StartNew();
        await Page.GetByRole(AriaRole.Navigation)
            .GetByRole(AriaRole.Link, new() { Name = "Dịch vụ", Exact = true }).First.ClickAsync();
        await Expect(Page).ToHaveURLAsync(new Regex(@"/partner/services/?$"));
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Dịch vụ của tôi" })).ToBeVisibleAsync();

        // Chờ danh sách tải xong (mỗi thẻ có một nút "Quản lý chi tiết")
        var manage = Page.GetByRole(AriaRole.Link, new() { NameRegex = ManageName })
            .Or(Page.GetByRole(AriaRole.Button, new() { NameRegex = ManageName }));
        try
        {
            await Expect(manage.First).ToBeVisibleAsync(new() { Timeout = 60000 });
        }
        catch (PlaywrightException)
        {
            await Page.ScreenshotAsync(new() { Path = "WEB_SVC_01_loi.png", FullPage = true });
            var body = await Page.Locator("body").InnerTextAsync();
            if (Regex.IsMatch(body, @"ch[ưu]a c[óo] d[ịi]ch v[ụu]", RegexOptions.IgnoreCase))
                Assert.Inconclusive("Partner chưa có dịch vụ nào nên không kiểm tra được danh sách (Pre-conditions chưa đúng)");
            Assert.Fail("Sau 60 giây trang 'Dịch vụ của tôi' không hiện thẻ dịch vụ nào");
        }
        TestContext.Out.WriteLine($"Danh sách hiện sau {clock.ElapsedMilliseconds} ms");
        if (clock.ElapsedMilliseconds > 3000) notes.Add($"Phản hồi chậm: danh sách dịch vụ hiện sau {clock.ElapsedMilliseconds} ms");
        await Page.WaitForTimeoutAsync(2000);   // chờ ảnh tải xong trước khi kiểm tra ảnh lỗi

        // Duyệt từng thẻ dịch vụ
        var count = await manage.CountAsync();
        TestContext.Out.WriteLine($"Số dịch vụ hiển thị: {count}");
        var noImage = 0;
        for (var i = 0; i < count; i++)
        {
            // Thẻ = thẻ div gần nhất chứa cả nút "Quản lý chi tiết" và nút "Chỉnh sửa"
                        // Thẻ = phần tử cha nhỏ nhất của nút "Quản lý chi tiết" mà có chứa giá tiền
            var data = await manage.Nth(i).EvaluateAsync<string[]>(@"el => {
                let c = el.parentElement;
                while (c) {
                    const t = c.innerText || '';
                    if (/\d{1,3}([.,]\d{3})+\s*[₫đĐ]/i.test(t))
                        return [String(c.querySelectorAll('a,button').length), t];
                    c = c.parentElement;
                }
                return ['0', ''];
            }");
            var actions = int.Parse(data[0]);
            var text = data[1];
            if (i == 0) TestContext.Out.WriteLine("Nội dung thẻ #1: " + text.Replace("\n", " | "));
            var lines = text.Split('\n').Select(l => l.Trim()).Where(l => l.Length > 0).ToList();

            var title = lines.FirstOrDefault(l => !TypeLine.IsMatch(l) && !PriceLine.IsMatch(l)
                && !StatusLine.IsMatch(l) && !ButtonLine.IsMatch(l) && !NoImageLine.IsMatch(l)) ?? "(không xác định)";
            var type = lines.FirstOrDefault(l => TypeLine.IsMatch(l));
            var price = lines.FirstOrDefault(l => PriceLine.IsMatch(l));
            var status = lines.FirstOrDefault(l => StatusLine.IsMatch(l));
            if (NoImageLine.IsMatch(text)) noImage++;
            TestContext.Out.WriteLine($"#{i + 1}: {title} | loại: {type} | giá: {price} | trạng thái: {status} | số nút: {actions}");

            if (type == null) problems.Add($"Thẻ #{i + 1} '{title}' không hiện loại dịch vụ");
            if (price == null) problems.Add($"Thẻ #{i + 1} '{title}' không hiện giá");
            if (status == null) problems.Add($"Thẻ #{i + 1} '{title}' không hiện trạng thái");
            if (actions < 3) problems.Add($"Thẻ #{i + 1} '{title}' thiếu nút (chỉ có {actions}/3: Quản lý chi tiết, Chỉnh sửa, Xóa)");
            if (status != null && !Regex.IsMatch(status, @"ph[êe] duy[ệe]t|t[ừu] ch[ốo]i|ng[ừu]ng ho[ạa]t", RegexOptions.IgnoreCase)
                && !notes.Any(n => n.StartsWith("Nhãn trạng thái")))
                notes.Add($"Nhãn trạng thái trên thẻ là '{status}', khác tên trạng thái trong SRS (Chờ phê duyệt/Đã phê duyệt/Bị từ chối/Ngừng hoạt động)");
        }

        // Ghi chú về ảnh (không thuộc Expected của case này nhưng cần đưa vào báo cáo)
        var broken = await Page.EvaluateAsync<string[]>(
            "() => Array.from(document.images).filter(i => i.complete && i.naturalWidth === 0).map(i => i.alt || i.src)");
        if (broken.Length > 0) notes.Add($"{broken.Length} ảnh dịch vụ bị lỗi không tải được: {string.Join("; ", broken)}");
        if (noImage > 0) notes.Add($"{noImage}/{count} dịch vụ hiển thị 'Chưa có ảnh'");

        // Nút chỉnh sửa hiển thị không dấu
        var editText = (await Page.GetByRole(AriaRole.Link, new() { NameRegex = new Regex(@"Ch[iỉ]nh s[ửu]a", RegexOptions.IgnoreCase) })
            .Or(Page.GetByRole(AriaRole.Button, new() { NameRegex = new Regex(@"Ch[iỉ]nh s[ửu]a", RegexOptions.IgnoreCase) }))
            .First.InnerTextAsync()).Trim();
        TestContext.Out.WriteLine($"Nút sửa: '{editText}'");
        if (!Regex.IsMatch(editText, @"Chỉnh sửa", RegexOptions.IgnoreCase))
            notes.Add($"LỖI GIAO DIỆN (mức Thấp): nút sửa hiển thị không dấu: '{editText}'");

        await Page.ScreenshotAsync(new() { Path = "WEB_SVC_01_danh_sach.png", FullPage = true });

        foreach (var n in notes) TestContext.Out.WriteLine("GHI CHÚ: " + n);
        Assert.That(problems, Is.Empty, string.Join(" | ", problems));
    }
}