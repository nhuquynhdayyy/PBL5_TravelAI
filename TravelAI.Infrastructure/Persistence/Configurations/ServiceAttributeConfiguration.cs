using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TravelAI.Domain.Entities;

namespace TravelAI.Infrastructure.Persistence.Configurations;

public class ServiceAttributeConfiguration : IEntityTypeConfiguration<ServiceAttribute>
{
    public void Configure(EntityTypeBuilder<ServiceAttribute> builder)
    {
        builder.HasKey(sa => sa.AttrId);
        builder.Property(sa => sa.AttrKey).IsRequired().HasMaxLength(50);
        builder.Property(sa => sa.AttrValue).IsRequired().HasMaxLength(255);

        builder.HasOne(sa => sa.Service)
               .WithMany(s => s.Attributes)
               .HasForeignKey(sa => sa.ServiceId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}