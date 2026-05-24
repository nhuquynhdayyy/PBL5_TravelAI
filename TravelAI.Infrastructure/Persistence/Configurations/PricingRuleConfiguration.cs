using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TravelAI.Domain.Entities;

namespace TravelAI.Infrastructure.Persistence.Configurations;

public class PricingRuleConfiguration : IEntityTypeConfiguration<PricingRule>
{
    public void Configure(EntityTypeBuilder<PricingRule> builder)
    {
        builder.HasKey(pr => pr.RuleId);
        
        builder.Property(pr => pr.PriceMultiplier)
               .HasColumnType("decimal(18,2)");
        
        builder.Property(pr => pr.Description)
               .HasMaxLength(500);
        
        builder.Property(pr => pr.CreatedAt)
               .HasDefaultValueSql("GETUTCDATE()");

        builder.HasOne(pr => pr.Service)
               .WithMany()
               .HasForeignKey(pr => pr.ServiceId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(pr => pr.ServiceId);
        builder.HasIndex(pr => new { pr.StartDate, pr.EndDate });
    }
}
