using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TravelAI.Domain.Entities;

namespace TravelAI.Infrastructure.Persistence.Configurations;

public class AISuggestionLogConfiguration : IEntityTypeConfiguration<AISuggestionLog>
{
    public void Configure(EntityTypeBuilder<AISuggestionLog> builder)
    {
        builder.HasKey(l => l.LogId);

        builder.HasOne(l => l.User)
               .WithMany()
               .HasForeignKey(l => l.UserId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}