using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TravelAI.Domain.Entities;

namespace TravelAI.Infrastructure.Persistence.Configurations;

public class PartnerProfileConfiguration : IEntityTypeConfiguration<PartnerProfile>
{
    public void Configure(EntityTypeBuilder<PartnerProfile> builder)
    {
        builder.HasKey(p => p.ProfileId);

        builder.Property(p => p.BusinessName).IsRequired().HasMaxLength(200);
        builder.Property(p => p.TaxCode).HasMaxLength(50);
        builder.Property(p => p.BankAccount).HasMaxLength(50);
        builder.Property(p => p.Address).HasMaxLength(255);
        builder.Property(p => p.ContactPhone).HasMaxLength(30);
        builder.Property(p => p.BusinessLicenseUrl).HasMaxLength(500);
        builder.Property(p => p.ReviewNote).HasMaxLength(1000);
        builder.Property(p => p.VerificationStatus).HasConversion<int>();

        builder.HasOne(p => p.User)
               .WithOne(u => u.PartnerProfile)
               .HasForeignKey<PartnerProfile>(p => p.UserId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
