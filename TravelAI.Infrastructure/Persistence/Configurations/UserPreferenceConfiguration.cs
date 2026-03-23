using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TravelAI.Domain.Entities;

namespace TravelAI.Infrastructure.Persistence.Configurations;

public class UserPreferenceConfiguration : IEntityTypeConfiguration<UserPreference>
{
    public void Configure(EntityTypeBuilder<UserPreference> builder)
    {
        builder.HasKey(up => up.PrefId);

        builder.Property(up => up.TravelStyle).HasMaxLength(50);
        builder.Property(up => up.BudgetLevel).HasConversion<int>();
        builder.Property(up => up.TravelPace).HasConversion<int>();

        builder.HasOne(up => up.User)
               .WithMany(u => u.Preferences)
               .HasForeignKey(up => up.UserId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}