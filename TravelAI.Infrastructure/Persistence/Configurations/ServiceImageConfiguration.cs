using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TravelAI.Domain.Entities;

namespace TravelAI.Infrastructure.Persistence.Configurations;

public class ServiceImageConfiguration : IEntityTypeConfiguration<ServiceImage>
{
    public void Configure(EntityTypeBuilder<ServiceImage> builder)
    {
        builder.HasKey(si => si.ImageId);
        builder.Property(si => si.ImageUrl).IsRequired();

        builder.HasOne(si => si.Service)
               .WithMany(s => s.Images)
               .HasForeignKey(si => si.ServiceId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}