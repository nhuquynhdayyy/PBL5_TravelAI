using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelAI.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAnalyticsColumnsToAISuggestionLog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ReplyTime, ApprovalDeadline, ApprovedAt, IsApprovedByPartner, PricingRules
            // đã được thêm vào DB trước đó (ngoài EF migration).
            // Migration này chỉ thêm 2 cột analytics còn thiếu.

            migrationBuilder.AddColumn<string>(
                name: "DestinationName",
                table: "AISuggestionLogs",
                type: "nvarchar(256)",
                maxLength: 256,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "EstimatedCost",
                table: "AISuggestionLogs",
                type: "decimal(18,2)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DestinationName",
                table: "AISuggestionLogs");

            migrationBuilder.DropColumn(
                name: "EstimatedCost",
                table: "AISuggestionLogs");
        }
    }
}
