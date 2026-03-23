using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TravelAI.Domain.Entities;

namespace TravelAI.Infrastructure.Persistence.Configurations;

public class ServiceConfiguration : IEntityTypeConfiguration<Service>
{
    public void Configure(EntityTypeBuilder<Service> builder)
    {
        builder.HasKey(s => s.ServiceId);
        builder.Property(s => s.Name).IsRequired().HasMaxLength(200);
        builder.Property(s => s.BasePrice).HasColumnType("decimal(18,2)");
        builder.Property(s => s.ServiceType).HasConversion<int>();

        builder.HasOne(s => s.Partner)
               .WithMany(u => u.Services)
               .HasForeignKey(s => s.PartnerId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(s => s.TouristSpot)
               .WithMany(ts => ts.Services)
               .HasForeignKey(s => s.SpotId)
               .OnDelete(DeleteBehavior.SetNull);
    }
}