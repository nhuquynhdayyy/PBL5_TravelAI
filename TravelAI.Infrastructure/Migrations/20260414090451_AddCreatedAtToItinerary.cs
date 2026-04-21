using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelAI.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCreatedAtToItinerary : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF COL_LENGTH('Itineraries', 'CreatedAt') IS NULL
                BEGIN
                    ALTER TABLE [Itineraries]
                    ADD [CreatedAt] datetime2 NOT NULL CONSTRAINT [DF_Itineraries_CreatedAt] DEFAULT '0001-01-01T00:00:00.0000000';
                END
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF COL_LENGTH('Itineraries', 'CreatedAt') IS NOT NULL
                BEGIN
                    DECLARE @constraintName nvarchar(128);

                    SELECT @constraintName = dc.name
                    FROM sys.default_constraints dc
                    INNER JOIN sys.columns c
                        ON c.default_object_id = dc.object_id
                    WHERE dc.parent_object_id = OBJECT_ID('Itineraries')
                      AND c.name = 'CreatedAt';

                    IF @constraintName IS NOT NULL
                    BEGIN
                        EXEC('ALTER TABLE [Itineraries] DROP CONSTRAINT [' + @constraintName + ']');
                    END

                    ALTER TABLE [Itineraries] DROP COLUMN [CreatedAt];
                END
                """);
        }
    }
}
