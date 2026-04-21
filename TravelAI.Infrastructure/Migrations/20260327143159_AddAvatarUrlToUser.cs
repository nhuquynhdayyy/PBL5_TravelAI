using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelAI.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAvatarUrlToUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF COL_LENGTH('Users', 'AvatarUrl') IS NULL
                BEGIN
                    ALTER TABLE [Users]
                    ADD [AvatarUrl] nvarchar(max) NULL;
                END
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF COL_LENGTH('Users', 'AvatarUrl') IS NOT NULL
                BEGIN
                    ALTER TABLE [Users] DROP COLUMN [AvatarUrl];
                END
                """);
        }
    }
}
