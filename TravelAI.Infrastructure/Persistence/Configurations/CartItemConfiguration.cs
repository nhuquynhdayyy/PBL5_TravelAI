using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TravelAI.Domain.Entities;

namespace TravelAI.Infrastructure.Persistence.Configurations;

public class CartItemConfiguration : IEntityTypeConfiguration<CartItem>
{
    public void Configure(EntityTypeBuilder<CartItem> builder)
    {
        builder.HasKey(ci => ci.CartItemId);
        builder.Property(ci => ci.PriceAtBooking).HasColumnType("decimal(18,2)");
        builder.Property(ci => ci.CheckInDate).HasColumnType("date");
        builder.Property(ci => ci.CheckOutDate).HasColumnType("date");
        builder.Property(ci => ci.Notes).HasMaxLength(255);
        builder.Property(ci => ci.CreatedAt).HasColumnType("datetime");

        builder.HasOne(ci => ci.User)
               .WithMany()
               .HasForeignKey(ci => ci.UserId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(ci => ci.Service)
               .WithMany()
               .HasForeignKey(ci => ci.ServiceId)
               .OnDelete(DeleteBehavior.Restrict);

        // Index để tìm cart items của user nhanh hơn
        builder.HasIndex(ci => ci.UserId);
        
        // Unique index để tránh duplicate cart item (same user, service, dates)
        builder.HasIndex(ci => new { ci.UserId, ci.ServiceId, ci.CheckInDate, ci.CheckOutDate })
               .IsUnique();
    }
}
