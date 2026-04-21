using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelAI.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDescriptionToService : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF COL_LENGTH('Services', 'Description') IS NULL
                BEGIN
                    ALTER TABLE [Services]
                    ADD [Description] nvarchar(max) NOT NULL CONSTRAINT [DF_Services_Description] DEFAULT N'';
                END
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF COL_LENGTH('Services', 'Description') IS NOT NULL
                BEGIN
                    DECLARE @constraintName nvarchar(128);

                    SELECT @constraintName = dc.name
                    FROM sys.default_constraints dc
                    INNER JOIN sys.columns c
                        ON c.default_object_id = dc.object_id
                    WHERE dc.parent_object_id = OBJECT_ID('Services')
                      AND c.name = 'Description';

                    IF @constraintName IS NOT NULL
                    BEGIN
                        EXEC('ALTER TABLE [Services] DROP CONSTRAINT [' + @constraintName + ']');
                    END

                    ALTER TABLE [Services] DROP COLUMN [Description];
                END
                """);
        }
    }
}
