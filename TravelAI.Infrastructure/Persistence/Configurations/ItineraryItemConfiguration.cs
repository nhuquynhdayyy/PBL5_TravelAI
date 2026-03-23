using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TravelAI.Domain.Entities;

namespace TravelAI.Infrastructure.Persistence.Configurations;

public class ItineraryItemConfiguration : IEntityTypeConfiguration<ItineraryItem>
{
    public void Configure(EntityTypeBuilder<ItineraryItem> builder)
    {
        builder.HasKey(ii => ii.ItemId);

        builder.HasOne(ii => ii.Itinerary)
               .WithMany(i => i.Items)
               .HasForeignKey(ii => ii.ItineraryId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(ii => ii.Service)
               .WithMany()
               .HasForeignKey(ii => ii.ServiceId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(ii => ii.TouristSpot)
               .WithMany()
               .HasForeignKey(ii => ii.SpotId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}