using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelAI.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddImageUrlToTouristSpot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF COL_LENGTH('TouristSpots', 'ImageUrl') IS NULL
                BEGIN
                    ALTER TABLE [TouristSpots]
                    ADD [ImageUrl] nvarchar(max) NULL;
                END
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF COL_LENGTH('TouristSpots', 'ImageUrl') IS NOT NULL
                BEGIN
                    ALTER TABLE [TouristSpots] DROP COLUMN [ImageUrl];
                END
                """);
        }
    }
}
