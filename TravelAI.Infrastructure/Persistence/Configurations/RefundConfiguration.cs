using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TravelAI.Domain.Entities;

namespace TravelAI.Infrastructure.Persistence.Configurations;

public class RefundConfiguration : IEntityTypeConfiguration<Refund>
{
    public void Configure(EntityTypeBuilder<Refund> builder)
    {
        builder.HasKey(r => r.RefundId);
        builder.Property(r => r.RefundAmount).HasColumnType("decimal(18,2)");
        builder.Property(r => r.RefundRef).HasMaxLength(100);
        builder.Property(r => r.Reason).HasMaxLength(255);

        builder.HasOne(r => r.Payment)
               .WithMany(p => p.Refunds)
               .HasForeignKey(r => r.PaymentId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}