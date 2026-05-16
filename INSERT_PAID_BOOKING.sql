-- =====================================================================
-- TẠO ĐỚN HÀNG ĐÃ THANH TOÁN (PAID BOOKING)
-- Database: TravelAI_DB
-- =====================================================================

USE TravelAI_DB;
GO

-- Khai báo biến
DECLARE @UserId INT = 4; -- UserId cố định
DECLARE @ServiceId INT;
DECLARE @PromoId INT = NULL; -- Để NULL nếu không dùng mã giảm giá
DECLARE @BookingId INT;
DECLARE @Quantity INT = 2;
DECLARE @PriceAtBooking DECIMAL(18,2);
DECLARE @TotalAmount DECIMAL(18,2);
DECLARE @CheckInDate DATETIME2 = '2026-06-15'; -- Check-in ngày 15/6/2026

-- =====================================================================
-- BƯỚC 1: KIỂM TRA USER TỒN TẠI
-- =====================================================================
IF NOT EXISTS (SELECT 1 FROM Users WHERE UserId = @UserId)
BEGIN
    PRINT '❌ ERROR: UserId = 4 không tồn tại!';
    RETURN;
END

PRINT '✅ UserId: ' + CAST(@UserId AS VARCHAR(10));

-- =====================================================================
-- BƯỚC 2: LẤY THÔNG TIN SERVICE
-- =====================================================================
-- Lấy ServiceId của dịch vụ đầu tiên đang active (hoặc chọn service cụ thể)
SELECT TOP 1 
    @ServiceId = ServiceId,
    @PriceAtBooking = BasePrice
FROM Services 
WHERE IsActive = 1
ORDER BY ServiceId;

PRINT 'ServiceId: ' + CAST(@ServiceId AS VARCHAR(10));
PRINT 'PriceAtBooking: ' + CAST(@PriceAtBooking AS VARCHAR(20));

-- =====================================================================
-- BƯỚC 3: TÍNH TỔNG TIỀN (có thể áp dụng mã giảm giá)
-- =====================================================================
-- Nếu muốn dùng mã giảm giá, uncomment dòng dưới:
-- SELECT TOP 1 @PromoId = PromoId FROM Promotions WHERE IsActive = 1 AND ExpiryDate > GETUTCDATE();

IF @PromoId IS NOT NULL
BEGIN
    DECLARE @DiscountPercent DECIMAL(5,2);
    SELECT @DiscountPercent = DiscountPercent FROM Promotions WHERE PromoId = @PromoId;
    SET @TotalAmount = @PriceAtBooking * @Quantity * (1 - @DiscountPercent);
END
ELSE
BEGIN
    SET @TotalAmount = @PriceAtBooking * @Quantity;
END

PRINT 'TotalAmount: ' + CAST(@TotalAmount AS VARCHAR(20));

-- =====================================================================
-- BƯỚC 4: TẠO BOOKING (Status = 2 là Paid)
-- =====================================================================
INSERT INTO Bookings (UserId, PromoId, TotalAmount, Status, CreatedAt, IsApprovedByPartner, ApprovalDeadline)
VALUES (
    @UserId,
    @PromoId,
    @TotalAmount,
    2, -- BookingStatus.Paid = 2 ✅
    GETUTCDATE(),
    0, -- Chưa được partner duyệt
    DATEADD(HOUR, 24, GETUTCDATE()) -- Deadline duyệt sau 24 giờ
);

SET @BookingId = SCOPE_IDENTITY();
PRINT 'BookingId created: ' + CAST(@BookingId AS VARCHAR(10));

-- =====================================================================
-- BƯỚC 5: TẠO BOOKING ITEM
-- =====================================================================
INSERT INTO BookingItems (BookingId, ServiceId, Quantity, PriceAtBooking, CheckInDate, Notes)
VALUES (
    @BookingId,
    @ServiceId,
    @Quantity,
    @PriceAtBooking,
    @CheckInDate,
    N'Đơn hàng test - Yêu cầu xác nhận sớm'
);

PRINT 'BookingItem created for BookingId: ' + CAST(@BookingId AS VARCHAR(10));

-- =====================================================================
-- BƯỚC 6: TẠO PAYMENT (Đã thanh toán)
-- =====================================================================
DECLARE @TransactionRef VARCHAR(50) = 'VNP' + FORMAT(GETUTCDATE(), 'yyyyMMddHHmmss');

INSERT INTO Payments (BookingId, Method, TransactionRef, Amount, PaymentTime)
VALUES (
    @BookingId,
    'VNPay', -- Hoặc 'Momo', 'ZaloPay', 'BankTransfer'
    @TransactionRef,
    @TotalAmount,
    GETUTCDATE()
);

PRINT 'Payment created with TransactionRef: ' + @TransactionRef;

-- =====================================================================
-- BƯỚC 7: CẬP NHẬT SERVICE AVAILABILITY (Giảm stock)
-- =====================================================================
UPDATE ServiceAvailabilities
SET BookedCount = BookedCount + @Quantity
WHERE ServiceId = @ServiceId 
  AND Date = CAST(@CheckInDate AS DATE)
  AND (TotalStock - BookedCount - HeldCount) >= @Quantity;

IF @@ROWCOUNT > 0
    PRINT 'ServiceAvailability updated successfully';
ELSE
    PRINT 'WARNING: ServiceAvailability not found or insufficient stock!';

-- =====================================================================
-- BƯỚC 8: KIỂM TRA KẾT QUẢ
-- =====================================================================
SELECT 
    b.BookingId,
    b.TotalAmount,
    b.Status AS BookingStatus,
    b.CreatedAt,
    b.IsApprovedByPartner,
    b.ApprovalDeadline,
    u.FullName AS CustomerName,
    u.Email AS CustomerEmail,
    s.Name AS ServiceName,
    s.ServiceType,
    bi.Quantity,
    bi.PriceAtBooking,
    bi.CheckInDate,
    p.Method AS PaymentMethod,
    p.TransactionRef,
    p.Amount AS PaymentAmount,
    p.PaymentTime
FROM Bookings b
INNER JOIN Users u ON b.UserId = u.UserId
INNER JOIN BookingItems bi ON b.BookingId = bi.BookingId
INNER JOIN Services s ON bi.ServiceId = s.ServiceId
INNER JOIN Payments p ON b.BookingId = p.BookingId
WHERE b.BookingId = @BookingId;

PRINT '✅ Đơn hàng đã được tạo thành công!';
GO
