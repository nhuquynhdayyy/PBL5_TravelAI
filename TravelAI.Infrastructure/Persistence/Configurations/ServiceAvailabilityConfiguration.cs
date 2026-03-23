using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TravelAI.Domain.Entities;

namespace TravelAI.Infrastructure.Persistence.Configurations;

public class ServiceAvailabilityConfiguration : IEntityTypeConfiguration<ServiceAvailability>
{
    public void Configure(EntityTypeBuilder<ServiceAvailability> builder)
    {
        builder.HasKey(sa => sa.AvailId);
        builder.Property(sa => sa.Price).HasColumnType("decimal(18,2)");
        builder.Property(sa => sa.Date).HasColumnType("date");

        builder.HasOne(sa => sa.Service)
               .WithMany(s => s.Availabilities)
               .HasForeignKey(sa => sa.ServiceId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}