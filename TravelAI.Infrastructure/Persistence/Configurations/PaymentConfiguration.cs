using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TravelAI.Domain.Entities;

namespace TravelAI.Infrastructure.Persistence.Configurations;

public class PaymentConfiguration : IEntityTypeConfiguration<Payment>
{
    public void Configure(EntityTypeBuilder<Payment> builder)
    {
        builder.HasKey(p => p.PaymentId);
        builder.Property(p => p.Amount).HasColumnType("decimal(18,2)");
        builder.Property(p => p.Method).IsRequired().HasMaxLength(20);
        builder.Property(p => p.TransactionRef).HasMaxLength(100);

        builder.HasOne(p => p.Booking)
               .WithMany(b => b.Payments)
               .HasForeignKey(p => p.BookingId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}