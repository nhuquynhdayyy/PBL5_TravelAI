using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelAI.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateExistingBookingsWithApprovalDeadline : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Cập nhật tất cả đơn hàng Paid chưa có ApprovalDeadline
            // Set deadline = 24 giờ kể từ thời điểm thanh toán (hoặc CreatedAt nếu chưa có payment)
            migrationBuilder.Sql(@"
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
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Rollback: Set ApprovalDeadline về NULL cho các đơn đã update
            migrationBuilder.Sql(@"
                UPDATE Bookings
                SET ApprovalDeadline = NULL
                WHERE Status = 2 
                  AND ApprovalDeadline IS NOT NULL
                  AND IsApprovedByPartner = 0;
            ");
        }
    }
}
