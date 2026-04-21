using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TravelAI.Domain.Entities;

namespace TravelAI.Infrastructure.Persistence.Configurations;

public class ReviewConfiguration : IEntityTypeConfiguration<Review>
{
    public void Configure(EntityTypeBuilder<Review> builder)
    {
        builder.HasKey(r => r.ReviewId);
        builder.Property(r => r.Comment).HasMaxLength(500);
        builder.Property(r => r.ReplyText).HasMaxLength(1000);
        builder.HasIndex(r => new { r.ServiceId, r.UserId }).IsUnique();

        builder.HasOne(r => r.Service)
               .WithMany(s => s.Reviews)
               .HasForeignKey(r => r.ServiceId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(r => r.User)
               .WithMany(u => u.Reviews)
               .HasForeignKey(r => r.UserId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}
