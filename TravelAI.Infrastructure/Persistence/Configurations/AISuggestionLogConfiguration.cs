using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TravelAI.Domain.Entities;

namespace TravelAI.Infrastructure.Persistence.Configurations;

public class AISuggestionLogConfiguration : IEntityTypeConfiguration<AISuggestionLog>
{
    public void Configure(EntityTypeBuilder<AISuggestionLog> builder)
    {
        builder.HasKey(l => l.LogId);

        builder.Property(l => l.DestinationName)
               .HasMaxLength(256)
               .IsRequired(false);

        builder.Property(l => l.EstimatedCost)
               .HasColumnType("decimal(18,2)")
               .IsRequired(false);

        builder.HasOne(l => l.User)
               .WithMany()
               .HasForeignKey(l => l.UserId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}