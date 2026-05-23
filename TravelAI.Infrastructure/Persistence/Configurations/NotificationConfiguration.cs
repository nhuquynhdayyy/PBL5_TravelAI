using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TravelAI.Domain.Entities;

namespace TravelAI.Infrastructure.Persistence.Configurations;

public class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> builder)
    {
        builder.HasKey(n => n.NotificationId);

        builder.Property(n => n.Title).HasMaxLength(200).IsRequired();
        builder.Property(n => n.Type).HasMaxLength(100).IsRequired();
        builder.Property(n => n.Message).HasMaxLength(1000).IsRequired();
        builder.Property(n => n.MetadataJson).HasColumnType("nvarchar(max)");
        builder.Property(n => n.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");

        builder.HasIndex(n => new { n.UserId, n.IsRead, n.CreatedAt });
        builder.HasIndex(n => new { n.PartnerId, n.IsRead, n.CreatedAt });
        builder.HasIndex(n => new { n.Type, n.CreatedAt });
    }
}
