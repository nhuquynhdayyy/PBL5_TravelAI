using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelAI.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCheckOutDateToBookingItem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CheckOutDate",
                table: "BookingItems",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CheckOutDate",
                table: "BookingItems");
        }
    }
}
