using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TravelAI.Domain.Entities;

namespace TravelAI.Infrastructure.Persistence.Configurations;

public class BookingItemConfiguration : IEntityTypeConfiguration<BookingItem>
{
    public void Configure(EntityTypeBuilder<BookingItem> builder)
    {
        builder.HasKey(bi => bi.ItemId);
        builder.Property(bi => bi.PriceAtBooking).HasColumnType("decimal(18,2)");
        builder.Property(bi => bi.CheckInDate).HasColumnType("date");
        builder.Property(bi => bi.Notes).HasMaxLength(255);

        builder.HasOne(bi => bi.Booking)
               .WithMany(b => b.BookingItems)
               .HasForeignKey(bi => bi.BookingId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(bi => bi.Service)
               .WithMany(s => s.BookingItems)
               .HasForeignKey(bi => bi.ServiceId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}