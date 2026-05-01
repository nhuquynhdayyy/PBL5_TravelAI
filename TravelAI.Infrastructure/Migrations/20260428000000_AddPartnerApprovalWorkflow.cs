using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using TravelAI.Infrastructure.Persistence;

#nullable disable

namespace TravelAI.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260428000000_AddPartnerApprovalWorkflow")]
    public partial class AddPartnerApprovalWorkflow : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF COL_LENGTH('PartnerProfiles', 'ContactPhone') IS NULL
                BEGIN
                    ALTER TABLE [PartnerProfiles] ADD [ContactPhone] nvarchar(30) NULL;
                END
                """);

            migrationBuilder.Sql(
                """
                IF COL_LENGTH('PartnerProfiles', 'BusinessLicenseUrl') IS NULL
                BEGIN
                    ALTER TABLE [PartnerProfiles] ADD [BusinessLicenseUrl] nvarchar(500) NULL;
                END
                """);

            migrationBuilder.Sql(
                """
                IF COL_LENGTH('PartnerProfiles', 'VerificationStatus') IS NULL
                BEGIN
                    ALTER TABLE [PartnerProfiles] ADD [VerificationStatus] int NOT NULL CONSTRAINT [DF_PartnerProfiles_VerificationStatus] DEFAULT 0;
                END
                """);

            migrationBuilder.Sql(
                """
                IF COL_LENGTH('PartnerProfiles', 'ReviewNote') IS NULL
                BEGIN
                    ALTER TABLE [PartnerProfiles] ADD [ReviewNote] nvarchar(1000) NULL;
                END
                """);

            migrationBuilder.Sql(
                """
                IF COL_LENGTH('PartnerProfiles', 'SubmittedAt') IS NULL
                BEGIN
                    ALTER TABLE [PartnerProfiles] ADD [SubmittedAt] datetime2 NULL;
                END
                """);

            migrationBuilder.Sql(
                """
                IF COL_LENGTH('PartnerProfiles', 'ReviewedAt') IS NULL
                BEGIN
                    ALTER TABLE [PartnerProfiles] ADD [ReviewedAt] datetime2 NULL;
                END
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF COL_LENGTH('PartnerProfiles', 'ReviewedAt') IS NOT NULL
                BEGIN
                    ALTER TABLE [PartnerProfiles] DROP COLUMN [ReviewedAt];
                END
                """);

            migrationBuilder.Sql(
                """
                IF COL_LENGTH('PartnerProfiles', 'SubmittedAt') IS NOT NULL
                BEGIN
                    ALTER TABLE [PartnerProfiles] DROP COLUMN [SubmittedAt];
                END
                """);

            migrationBuilder.Sql(
                """
                IF COL_LENGTH('PartnerProfiles', 'ReviewNote') IS NOT NULL
                BEGIN
                    ALTER TABLE [PartnerProfiles] DROP COLUMN [ReviewNote];
                END
                """);

            migrationBuilder.Sql(
                """
                IF COL_LENGTH('PartnerProfiles', 'VerificationStatus') IS NOT NULL
                BEGIN
                    DECLARE @constraintName nvarchar(128);

                    SELECT @constraintName = dc.name
                    FROM sys.default_constraints dc
                    INNER JOIN sys.columns c
                        ON c.default_object_id = dc.object_id
                    WHERE dc.parent_object_id = OBJECT_ID('PartnerProfiles')
                      AND c.name = 'VerificationStatus';

                    IF @constraintName IS NOT NULL
                    BEGIN
                        EXEC('ALTER TABLE [PartnerProfiles] DROP CONSTRAINT [' + @constraintName + ']');
                    END

                    ALTER TABLE [PartnerProfiles] DROP COLUMN [VerificationStatus];
                END
                """);

            migrationBuilder.Sql(
                """
                IF COL_LENGTH('PartnerProfiles', 'BusinessLicenseUrl') IS NOT NULL
                BEGIN
                    ALTER TABLE [PartnerProfiles] DROP COLUMN [BusinessLicenseUrl];
                END
                """);

            migrationBuilder.Sql(
                """
                IF COL_LENGTH('PartnerProfiles', 'ContactPhone') IS NOT NULL
                BEGIN
                    ALTER TABLE [PartnerProfiles] DROP COLUMN [ContactPhone];
                END
                """);
        }
    }
}
