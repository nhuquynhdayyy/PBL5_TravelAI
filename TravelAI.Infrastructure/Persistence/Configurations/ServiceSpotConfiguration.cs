using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TravelAI.Domain.Entities;

namespace TravelAI.Infrastructure.Persistence.Configurations;

public class ServiceSpotConfiguration : IEntityTypeConfiguration<Service_Spot>
{
    public void Configure(EntityTypeBuilder<Service_Spot> builder)
    {
        builder.HasKey(ss => ss.Id);

        builder.HasOne(ss => ss.Service)
               .WithMany(s => s.ServiceSpots)
               .HasForeignKey(ss => ss.ServiceId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(ss => ss.TouristSpot)
               .WithMany(ts => ts.ServiceSpots)
               .HasForeignKey(ss => ss.SpotId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}