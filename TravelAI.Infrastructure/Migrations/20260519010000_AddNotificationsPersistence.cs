using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using TravelAI.Infrastructure.Persistence;

#nullable disable

namespace TravelAI.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260519010000_AddNotificationsPersistence")]
    public partial class AddNotificationsPersistence : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF OBJECT_ID(N'[Notifications]', N'U') IS NULL
                BEGIN
                    CREATE TABLE [Notifications] (
                        [NotificationId] int NOT NULL IDENTITY,
                        [UserId] int NULL,
                        [PartnerId] int NULL,
                        [Type] nvarchar(100) NOT NULL,
                        [Message] nvarchar(1000) NOT NULL,
                        [IsRead] bit NOT NULL,
                        [CreatedAt] datetime2 NOT NULL CONSTRAINT [DF_Notifications_CreatedAt] DEFAULT SYSUTCDATETIME(),
                        [MetadataJson] nvarchar(max) NULL,
                        CONSTRAINT [PK_Notifications] PRIMARY KEY ([NotificationId])
                    );
                END

                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Notifications_UserId_IsRead_CreatedAt' AND object_id = OBJECT_ID(N'[Notifications]'))
                BEGIN
                    CREATE INDEX [IX_Notifications_UserId_IsRead_CreatedAt] ON [Notifications] ([UserId], [IsRead], [CreatedAt]);
                END

                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Notifications_PartnerId_IsRead_CreatedAt' AND object_id = OBJECT_ID(N'[Notifications]'))
                BEGIN
                    CREATE INDEX [IX_Notifications_PartnerId_IsRead_CreatedAt] ON [Notifications] ([PartnerId], [IsRead], [CreatedAt]);
                END

                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Notifications_Type_CreatedAt' AND object_id = OBJECT_ID(N'[Notifications]'))
                BEGIN
                    CREATE INDEX [IX_Notifications_Type_CreatedAt] ON [Notifications] ([Type], [CreatedAt]);
                END
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF OBJECT_ID(N'[Notifications]', N'U') IS NOT NULL
                BEGIN
                    DROP TABLE [Notifications];
                END
                """);
        }
    }
}
