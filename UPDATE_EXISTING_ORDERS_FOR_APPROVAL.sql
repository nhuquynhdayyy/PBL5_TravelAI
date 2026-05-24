-- =====================================================================
-- CẬP NHẬT CÁC ĐƠN HÀNG CŨ ĐỂ TEST TÍNH NĂNG APPROVAL
-- =====================================================================

USE TravelAI_DB;
GO

-- =====================================================================
-- OPTION 0: TỰ ĐỘNG CẬP NHẬT TẤT CẢ ĐƠN CŨ (KHUYẾN NGHỊ)
-- =====================================================================
-- Cập nhật tất cả đơn Paid chưa có ApprovalDeadline
-- Set deadline = 24 giờ kể từ thời điểm thanh toán
UPDATE b
SET 
    b.ApprovalDeadline = DATEADD(HOUR, 24, COALESCE(p.PaymentTime, b.CreatedAt)),
    b.IsApprovedByPartner = 0
FROM Bookings b
LEFT JOIN (
    SELECT 
        BookingId, 
        MAX(PaymentTime) AS PaymentTime
    FROM Payments
    GROUP BY BookingId
) p ON b.BookingId = p.BookingId
WHERE b.Status = 2  -- BookingStatus.Paid
  AND b.ApprovalDeadline IS NULL;

PRINT '✅ Đã cập nhật ApprovalDeadline cho tất cả đơn hàng cũ';
GO

-- =====================================================================
-- OPTION 1: Update đơn #23 thành đơn KHẨN CẤP (còn 1 giờ)
-- =====================================================================
UPDATE Bookings
SET 
    ApprovalDeadline = DATEADD(HOUR, 1, GETUTCDATE()),
    IsApprovedByPartner = 0,
    Status = 2  -- Paid
WHERE BookingId = 23;

PRINT '✅ Đơn #23: Còn 1 giờ (KHẨN CẤP - màu đỏ)';

-- =====================================================================
-- OPTION 2: Update đơn #19 thành đơn KHẨN CẤP (còn 8 giờ)
-- =====================================================================
UPDATE Bookings
SET 
    ApprovalDeadline = DATEADD(HOUR, 8, GETUTCDATE()),
    IsApprovedByPartner = 0,
    Status = 2  -- Paid
WHERE BookingId = 19;

PRINT '✅ Đơn #19: Còn 8 giờ (KHẨN CẤP - màu vàng)';

-- =====================================================================
-- OPTION 3: Update đơn #22 thành đơn QUÁ HẠN
-- =====================================================================
UPDATE Bookings
SET 
    ApprovalDeadline = DATEADD(HOUR, -2, GETUTCDATE()),  -- Quá hạn 2 giờ
    IsApprovedByPartner = 0,
    Status = 2  -- Paid
WHERE BookingId = 22;

PRINT '✅ Đơn #22: Quá hạn 2 giờ (sẽ bị hủy)';

-- =====================================================================
-- KIỂM TRA KẾT QUẢ
-- =====================================================================
SELECT 
    b.BookingId,
    b.Status,
    b.IsApprovedByPartner,
    b.ApprovalDeadline,
    DATEDIFF(HOUR, GETUTCDATE(), b.ApprovalDeadline) AS HoursUntilDeadline,
    CASE 
        WHEN b.ApprovalDeadline < GETUTCDATE() THEN '🔴 QUÁ HẠN'
        WHEN DATEDIFF(HOUR, GETUTCDATE(), b.ApprovalDeadline) < 2 THEN '🔴 KHẨN CẤP (< 2 giờ)'
        WHEN DATEDIFF(HOUR, GETUTCDATE(), b.ApprovalDeadline) < 12 THEN '🟡 KHẨN CẤP (< 12 giờ)'
        ELSE '⚪ Bình thường'
    END AS UrgencyLevel,
    u.FullName AS CustomerName,
    s.Name AS ServiceName
FROM Bookings b
INNER JOIN Users u ON b.UserId = u.UserId
INNER JOIN BookingItems bi ON b.BookingId = bi.BookingId
INNER JOIN Services s ON bi.ServiceId = s.ServiceId
WHERE b.BookingId IN (23, 19, 22)
ORDER BY b.ApprovalDeadline;

GO

-- =====================================================================
-- BONUS: Tạo thêm đơn mới với các trạng thái khác nhau
-- =====================================================================

-- Đơn còn 30 phút (cực kỳ khẩn cấp)
/*
INSERT INTO Bookings (UserId, TotalAmount, Status, CreatedAt, IsApprovedByPartner, ApprovalDeadline)
VALUES (4, 500000, 2, GETUTCDATE(), 0, DATEADD(MINUTE, 30, GETUTCDATE()));

DECLARE @NewBookingId INT = SCOPE_IDENTITY();

INSERT INTO BookingItems (BookingId, ServiceId, Quantity, PriceAtBooking, CheckInDate)
SELECT @NewBookingId, ServiceId, 1, BasePrice, DATEADD(DAY, 7, GETUTCDATE())
FROM Services WHERE IsActive = 1 ORDER BY ServiceId OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY;

INSERT INTO Payments (BookingId, Method, TransactionRef, Amount, PaymentTime)
VALUES (@NewBookingId, 'VNPay', 'VNP' + CAST(@NewBookingId AS VARCHAR), 500000, GETUTCDATE());

PRINT '✅ Tạo đơn mới: Còn 30 phút';
*/
