using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TravelAI.Domain.Entities;

namespace TravelAI.Infrastructure.Persistence.Configurations;

public class TouristSpotConfiguration : IEntityTypeConfiguration<TouristSpot>
{
    public void Configure(EntityTypeBuilder<TouristSpot> builder)
    {
        builder.HasKey(ts => ts.SpotId);
        builder.Property(ts => ts.Name).IsRequired().HasMaxLength(200);
        builder.Property(ts => ts.OpeningHours).HasMaxLength(100);

        builder.HasOne(ts => ts.Destination)
               .WithMany(d => d.TouristSpots)
               .HasForeignKey(ts => ts.DestinationId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}