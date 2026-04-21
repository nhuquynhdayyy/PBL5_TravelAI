using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelAI.Infrastructure.Migrations
{
    public partial class AddReviewReplyAndUniqueIndex : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ReplyText",
                table: "Reviews",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.DropIndex(
                name: "IX_Reviews_ServiceId",
                table: "Reviews");

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_ServiceId_UserId",
                table: "Reviews",
                columns: new[] { "ServiceId", "UserId" },
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Reviews_ServiceId_UserId",
                table: "Reviews");

            migrationBuilder.DropColumn(
                name: "ReplyText",
                table: "Reviews");

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_ServiceId",
                table: "Reviews",
                column: "ServiceId");
        }
    }
}
