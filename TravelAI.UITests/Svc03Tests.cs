using System.Diagnostics;
using System.Text.RegularExpressions;
using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace TravelAI.UITests;

[TestFixture]
public class Svc03Tests : PageTest
{
    private const string BaseUrl = "http://localhost:5173";

    // Tài khoản Partner đã được Admin phê duyệt (đừng commit mật khẩu lên GitHub chung)
    private const string Email = "partner.danangresort@gmail.com";
    private const string Password = "123456";

    private const string Province = "Đà Nẵng";
    private const string Landmark = "Bãi biển Mỹ Khê";
    private const string Description = "Một khách sạn đẹp nằm ngay gần bãi biển Mỹ Khê nổi tiếng tại Đà Nẵng";   // 68 ký tự (>= 50)
    private const string PriceInput = "1500000";

    private static readonly Regex ManageName = new(@"Qu[ảa]n l[ýy] chi ti[ếe]t", RegexOptions.IgnoreCase);
    private static readonly Regex PendingRx = new(@"ch[ờo] (ph[êe] )?duy[ệe]t", RegexOptions.IgnoreCase);
    private static readonly Regex ApprovedRx = new(@"[đd][ãa] (ph[êe] )?duy[ệe]t|[đd]ang hi[ểe]n th[ịi]", RegexOptions.IgnoreCase);
    private static readonly Regex SuccessRx = new(@"th[êe]m d[ịi]ch v[ụu] th[àa]nh c[ôo]ng|th[àa]nh c[ôo]ng", RegexOptions.IgnoreCase);

    [Test, CancelAfter(900_000)]
    public async Task WEB_SVC_03_ThemKhachSanHopLe()
    {
        var problems = new List<string>();   // lỗi chức năng (làm test Failed)
        var notes = new List<string>();      // ghi chú cho báo cáo (không làm Failed)
        var dialogs = new List<string>();

        // Tên có thêm giờ để mỗi lần chạy tạo một dịch vụ riêng, dễ nhận biết và dọn sau
        var name = "TEST_Khách sạn A " + DateTime.Now.ToString("HHmmss");

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

        // Bước 1: Dịch vụ -> Đăng dịch vụ mới
        await Page.GetByRole(AriaRole.Navigation)
            .GetByRole(AriaRole.Link, new() { Name = "Dịch vụ", Exact = true }).First.ClickAsync();
        await Expect(Page).ToHaveURLAsync(new Regex(@"/partner/services/?$"));
        var addBtn = Page.GetByRole(AriaRole.Link, new() { Name = "Đăng dịch vụ mới" })
            .Or(Page.GetByRole(AriaRole.Button, new() { Name = "Đăng dịch vụ mới" })).First;
        await Expect(addBtn).ToBeVisibleAsync(new() { Timeout = 60000 });
                        // Chờ web tải xong trạng thái duyệt hồ sơ. Trong lúc tải, web hiện banner
        // "Tài khoản đối tác chưa được phê duyệt" và nút "Đăng dịch vụ mới" chưa dùng được (có thể mất ~25 giây)
        var banner = Page.GetByText("Tài khoản đối tác chưa được phê duyệt");
        var waitClock = Stopwatch.StartNew();
        var sawBanner = await banner.CountAsync() > 0;
        try
        {
            await Expect(banner).ToBeHiddenAsync(new() { Timeout = 90000 });
        }
        catch (PlaywrightException)
        {
            await Page.ScreenshotAsync(new() { Path = "WEB_SVC_03_banner_chua_duyet.png", FullPage = true });
            Assert.Fail("Sau 90 giây web vẫn hiện 'Tài khoản đối tác chưa được phê duyệt' " +
                        "(trong khi trang Doanh nghiệp ghi Đã phê duyệt)");
        }
        TestContext.Out.WriteLine($"Banner 'chưa được phê duyệt' biến mất sau {waitClock.ElapsedMilliseconds} ms (đã thấy banner: {sawBanner})");
        if (sawBanner || waitClock.ElapsedMilliseconds > 1500)
            notes.Add($"Khi trang Dịch vụ đang tải (~{waitClock.ElapsedMilliseconds / 1000} giây), web hiện banner 'Tài khoản đối tác chưa được phê duyệt', " +
                      "nút 'Đăng dịch vụ mới' bị mờ; bấm trong lúc này thì báo 'Hồ sơ đối tác chưa được duyệt' và chuyển sang /partner/profile, " +
                      "dù hồ sơ thực tế đã được phê duyệt");

        // Bấm "Đăng dịch vụ mới" (thử lại tối đa 3 lần nếu vẫn bị chặn)
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
                var blocked = dialogs.Skip(before).Any(d => Regex.IsMatch(d, @"ch[ưu]a .{1,8}duy[ệe]t", RegexOptions.IgnoreCase));
                if (!blocked || attempts >= 3)
                {
                    await Page.ScreenshotAsync(new() { Path = "WEB_SVC_03_khong_mo_duoc_form.png", FullPage = true });
                    Assert.Fail($"Bấm 'Đăng dịch vụ mới' {attempts} lần nhưng không mở được form (URL: {Page.Url}). Hộp thoại: {string.Join(" / ", dialogs)}");
                }
                TestContext.Out.WriteLine($"Lần {attempts}: vẫn bị chặn, quay lại danh sách và chờ banner biến mất");
                await Page.GotoAsync(BaseUrl + "/partner/services");
                await Expect(banner).ToBeHiddenAsync(new() { Timeout = 90000 });
            }
        }
        TestContext.Out.WriteLine($"Mở được form sau {attempts} lần bấm");

        // Bước 2: nhập dữ liệu (không tải ảnh)
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "Nhập tên khách sạn, homestay" }).FillAsync(name);
        await Page.GetByRole(AriaRole.Spinbutton, new() { Name = "Ví dụ:" }).FillAsync(PriceInput);

        var combos = Page.GetByRole(AriaRole.Combobox);   // 0 = Loại hình, 1 = Tỉnh/Thành phố, 2 = Địa danh
        TestContext.Out.WriteLine("Loại hình mặc định: " + (await combos.Nth(0).Locator("option:checked").InnerTextAsync()).Trim());
        try { await combos.Nth(1).SelectOptionAsync(new SelectOptionValue { Label = Province }, new() { Timeout = 5000 }); }
        catch (PlaywrightException)
        {
            TestContext.Out.WriteLine($"Không chọn được tỉnh theo tên '{Province}', chọn theo giá trị 2");
            await combos.Nth(1).SelectOptionAsync(new[] { "2" });
        }
        // Chờ danh sách địa danh tải xong (có ít nhất 1 lựa chọn thật ngoài dòng gợi ý)
        await Expect(combos.Nth(2).Locator("option").Nth(1)).ToBeAttachedAsync(new() { Timeout = 60000 });
        try { await combos.Nth(2).SelectOptionAsync(new SelectOptionValue { Label = Landmark }, new() { Timeout = 5000 }); }
        catch (PlaywrightException)
        {
            TestContext.Out.WriteLine($"Không chọn được địa danh '{Landmark}', chọn lựa chọn thật đầu tiên");
            await combos.Nth(2).SelectOptionAsync(new SelectOptionValue { Index = 1 });
        }
        TestContext.Out.WriteLine("Tỉnh: " + (await combos.Nth(1).Locator("option:checked").InnerTextAsync()).Trim()
            + " | Địa danh: " + (await combos.Nth(2).Locator("option:checked").InnerTextAsync()).Trim());
        await Page.GetByRole(AriaRole.Textbox, new() { Name = "Nhập mô tả chi tiết" }).FillAsync(Description);

        // Ghi lại mọi thông báo thoáng qua (toast) xuất hiện sau khi bấm Lưu
        await Page.EvaluateAsync(@"() => {
            window.__msgs = [];
            const rx = /thành công|kiểm duyệt|phê duyệt|lỗi|không thể|thất bại/i;
            new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
                const t = (n.textContent || '').trim();
                if (t && t.length < 300 && rx.test(t)) window.__msgs.push(t);
            }))).observe(document.body, { childList: true, subtree: true });
        }");
        await Page.ScreenshotAsync(new() { Path = "WEB_SVC_03_truoc_khi_luu.png", FullPage = true });

        // Bước 3: bấm "Lưu và tiếp tục"
        var clock = Stopwatch.StartNew();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Lưu và tiếp tục" }).ClickAsync();
        try
        {
            await Expect(Page).ToHaveURLAsync(new Regex(@"/partner/services/\d+/manage"), new() { Timeout = 60000 });
        }
        catch (PlaywrightException)
        {
            await Page.ScreenshotAsync(new() { Path = "WEB_SVC_03_loi_luu.png", FullPage = true });
            var msgsFail = await Page.EvaluateAsync<string[]>("() => window.__msgs || []");
            Assert.Fail($"Bấm 'Lưu và tiếp tục' nhưng sau 60 giây không chuyển sang trang quản lý dịch vụ (URL: {Page.Url}). " +
                        $"Thông báo: {string.Join(" / ", msgsFail.Concat(dialogs))}");
        }
        TestContext.Out.WriteLine($"Lưu xong sau {clock.ElapsedMilliseconds} ms, URL: {Page.Url}");
        if (clock.ElapsedMilliseconds > 3000) notes.Add($"Phản hồi chậm: lưu dịch vụ mất {clock.ElapsedMilliseconds} ms");
        var serviceUrl = Page.Url;
        File.AppendAllText("TEST_services_created.txt", $"{DateTime.Now:yyyy-MM-dd HH:mm}\t{name}\t{serviceUrl}\n");   // để dọn dữ liệu sau
        await Expect(Page.GetByText(name).First).ToBeVisibleAsync(new() { Timeout = 60000 });
        await Page.WaitForTimeoutAsync(1500);

        // Expected 1: thông báo thêm thành công
        var msgs = (await Page.EvaluateAsync<string[]>("() => window.__msgs || []")).Distinct().ToList();
        msgs.AddRange(dialogs);
        TestContext.Out.WriteLine("Thông báo bắt được: " + (msgs.Count == 0 ? "(không có)" : string.Join(" / ", msgs)));
        var success = msgs.FirstOrDefault(m => SuccessRx.IsMatch(m));
        if (success == null) problems.Add("Không hiển thị thông báo thêm dịch vụ thành công (SRS UC007 mục Thêm, bước 7)");
        else if (!Regex.IsMatch(success, @"ki[ểe]m duy[ệe]t|ch[ờo] (ph[êe] )?duy[ệe]t", RegexOptions.IgnoreCase))
            notes.Add($"Thông báo thành công là '{success}', không nêu việc đang chờ kiểm duyệt như SRS");

        // Expected 2: trang quản lý dịch vụ vừa tạo (tên, giá, trạng thái)
        var body = await Page.Locator("body").InnerTextAsync();
        await Page.ScreenshotAsync(new() { Path = "WEB_SVC_03_trang_quan_ly.png", FullPage = true });
        var detailPrice = Regex.Match(body, @"\d{1,3}([.,]\d{3})+\s*[₫đĐ]").Value;
        TestContext.Out.WriteLine($"Trang quản lý: giá '{detailPrice}'");
        if (Regex.Replace(detailPrice, @"\D", "") != PriceInput)
            problems.Add($"Giá trên trang quản lý là '{detailPrice}', khác giá đã nhập 1.500.000₫");
        var detailStatus = Regex.Match(body, @"(?<=TR[ẠA]NG TH[ÁA]I[^\n]*\n+\s*)[^\n]+", RegexOptions.IgnoreCase).Value.Trim();
        TestContext.Out.WriteLine($"Trang quản lý: trạng thái '{detailStatus}'");
        if (!PendingRx.IsMatch(detailStatus))
            problems.Add($"Trạng thái trên trang quản lý là '{detailStatus}', không phải 'Chờ phê duyệt' như SRS");

        // Bước 4: quay lại danh sách, tìm dịch vụ vừa tạo
        await Page.GetByText("Quay lại danh sách dịch vụ").ClickAsync();
        await Expect(Page).ToHaveURLAsync(new Regex(@"/partner/services/?$"));
        var manage = Page.GetByRole(AriaRole.Link, new() { NameRegex = ManageName })
            .Or(Page.GetByRole(AriaRole.Button, new() { NameRegex = ManageName }));
        await Expect(manage.First).ToBeVisibleAsync(new() { Timeout = 60000 });   // danh sách có thể mất ~25 giây
                var title = Page.GetByText(name).First;
        TestContext.Out.WriteLine($"Số dịch vụ trong danh sách khi vừa quay lại: {await manage.CountAsync()}");
        try { await Expect(title).ToBeAttachedAsync(new() { Timeout = 10000 }); }
        catch (PlaywrightException)
        {
            await Page.ScreenshotAsync(new() { Path = "WEB_SVC_03_ds_sau_khi_quay_lai.png", FullPage = true });
            TestContext.Out.WriteLine("Vừa quay lại danh sách: CHƯA thấy dịch vụ mới, tải lại trang (F5) để kiểm tra");
            await Page.ReloadAsync();
            await Expect(Page.GetByText("Tài khoản đối tác chưa được phê duyệt")).ToBeHiddenAsync(new() { Timeout = 90000 });
            await Expect(manage.First).ToBeVisibleAsync(new() { Timeout = 60000 });
            try { await Expect(title).ToBeAttachedAsync(new() { Timeout = 15000 }); }
            catch (PlaywrightException)
            {
                var total = await manage.CountAsync();
                await Page.ScreenshotAsync(new() { Path = "WEB_SVC_03_khong_thay_trong_ds.png", FullPage = true });
                TestContext.Out.WriteLine($"Sau khi tải lại, danh sách có {total} dịch vụ, không có '{name}'");
                Assert.Fail($"Dịch vụ '{name}' không xuất hiện trong 'Dịch vụ của tôi' kể cả sau khi tải lại trang");
            }
            problems.Add("Danh sách không tự cập nhật: dịch vụ mới chỉ xuất hiện sau khi tải lại trang (F5)");
        }
        var cardText = await title.EvaluateAsync<string>(@"el => {
            let c = el;
            while (c) {
                if (/qu[ảa]n l[ýy] chi ti[ếe]t/i.test(c.innerText || '')) return c.innerText;
                c = c.parentElement;
            }
            return '';
        }");
        TestContext.Out.WriteLine("Thẻ trong danh sách: " + cardText.Replace("\n", " | "));
        await title.ScrollIntoViewIfNeededAsync();
        await Page.ScreenshotAsync(new() { Path = "WEB_SVC_03_danh_sach.png", FullPage = true });

        // Expected 3: thẻ có loại Khách sạn, giá 1.500.000đ, trạng thái Chờ phê duyệt
        if (!Regex.IsMatch(cardText, @"kh[áa]ch s[ạa]n", RegexOptions.IgnoreCase))
            problems.Add("Thẻ dịch vụ mới trong danh sách không hiển thị loại 'Khách sạn'");
        var cardPrice = Regex.Match(cardText, @"\d{1,3}([.,]\d{3})+\s*[₫đĐ]").Value;
        if (Regex.Replace(cardPrice, @"\D", "") != PriceInput)
            problems.Add($"Giá trên thẻ trong danh sách là '{cardPrice}', khác giá đã nhập 1.500.000₫");
        var cardLines = cardText.Split('\n').Select(l => l.Trim()).Where(l => l.Length > 0).ToList();
        var cardStatus = cardLines.FirstOrDefault(l => PendingRx.IsMatch(l) || ApprovedRx.IsMatch(l) || Regex.IsMatch(l, @"t[ừu] ch[ốo]i|ng[ừu]ng", RegexOptions.IgnoreCase)) ?? "(không có nhãn trạng thái)";
        TestContext.Out.WriteLine($"Trạng thái trong danh sách: '{cardStatus}'");
        if (!PendingRx.IsMatch(cardStatus))
            problems.Add($"Trạng thái trong danh sách là '{cardStatus}', không phải 'Chờ phê duyệt' như SRS");
        else if (!Regex.IsMatch(cardStatus, @"ph[êe] duy[ệe]t", RegexOptions.IgnoreCase))
            notes.Add($"Nhãn trạng thái là '{cardStatus}', khác SRS 'Chờ phê duyệt'");

        // Ghi chú: web cho lưu khi không có ảnh (SRS yêu cầu tối thiểu 3 ảnh)
        notes.Add("Web cho phép lưu dịch vụ khi không tải ảnh nào (SRS Bảng 16 yêu cầu tối thiểu 3 ảnh); sẽ kiểm tra riêng ở case về ảnh");

        foreach (var n in notes) TestContext.Out.WriteLine("GHI CHÚ: " + n);
        Assert.That(problems, Is.Empty, string.Join(" | ", problems));
    }
}