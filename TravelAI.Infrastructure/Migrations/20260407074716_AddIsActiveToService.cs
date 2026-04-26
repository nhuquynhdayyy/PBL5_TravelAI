using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelAI.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddIsActiveToService : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF COL_LENGTH('Services', 'IsActive') IS NULL
                BEGIN
                    ALTER TABLE [Services]
                    ADD [IsActive] bit NOT NULL CONSTRAINT [DF_Services_IsActive] DEFAULT CAST(0 AS bit);
                END
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF COL_LENGTH('Services', 'IsActive') IS NOT NULL
                BEGIN
                    DECLARE @constraintName nvarchar(128);

                    SELECT @constraintName = dc.name
                    FROM sys.default_constraints dc
                    INNER JOIN sys.columns c
                        ON c.default_object_id = dc.object_id
                    WHERE dc.parent_object_id = OBJECT_ID('Services')
                      AND c.name = 'IsActive';

                    IF @constraintName IS NOT NULL
                    BEGIN
                        EXEC('ALTER TABLE [Services] DROP CONSTRAINT [' + @constraintName + ']');
                    END

                    ALTER TABLE [Services] DROP COLUMN [IsActive];
                END
                """);
        }
    }
}
