using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TravelAI.Domain.Entities;

namespace TravelAI.Infrastructure.Persistence.Configurations;

public class ItineraryConfiguration : IEntityTypeConfiguration<Itinerary>
{
    public void Configure(EntityTypeBuilder<Itinerary> builder)
    {
        builder.HasKey(i => i.ItineraryId);
        builder.Property(i => i.Title).IsRequired().HasMaxLength(200);
        builder.Property(i => i.EstimatedCost).HasColumnType("decimal(18,2)");
        builder.Property(i => i.Status).HasConversion<int>();

        builder.HasOne(i => i.User)
               .WithMany(u => u.Itineraries)
               .HasForeignKey(i => i.UserId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}