using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TravelAI.Domain.Entities;

namespace TravelAI.Infrastructure.Persistence.Configurations;

public class ElectronicTicketConfiguration : IEntityTypeConfiguration<ElectronicTicket>
{
    public void Configure(EntityTypeBuilder<ElectronicTicket> builder)
    {
        builder.HasKey(ticket => ticket.TicketId);
        builder.Property(ticket => ticket.TicketCode).IsRequired().HasMaxLength(30);
        builder.Property(ticket => ticket.CustomerName).IsRequired().HasMaxLength(200);
        builder.Property(ticket => ticket.ServiceName).IsRequired().HasMaxLength(250);
        builder.Property(ticket => ticket.ServiceType).IsRequired().HasMaxLength(50);
        builder.Property(ticket => ticket.TotalAmount).HasColumnType("decimal(18,2)");
        builder.Property(ticket => ticket.Status).HasConversion<int>();
        builder.Property(ticket => ticket.QrPayloadJson).IsRequired().HasColumnType("nvarchar(max)");
        builder.Property(ticket => ticket.QrImageBase64).IsRequired().HasColumnType("nvarchar(max)");

        builder.HasIndex(ticket => ticket.TicketCode).IsUnique();
        builder.HasIndex(ticket => ticket.BookingId);
        builder.HasIndex(ticket => ticket.BookingItemId).IsUnique();

        builder.HasOne(ticket => ticket.Booking)
            .WithMany(booking => booking.ElectronicTickets)
            .HasForeignKey(ticket => ticket.BookingId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(ticket => ticket.BookingItem)
            .WithMany(item => item.ElectronicTickets)
            .HasForeignKey(ticket => ticket.BookingItemId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(ticket => ticket.User)
            .WithMany(user => user.ElectronicTickets)
            .HasForeignKey(ticket => ticket.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(ticket => ticket.Service)
            .WithMany(service => service.ElectronicTickets)
            .HasForeignKey(ticket => ticket.ServiceId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(ticket => ticket.VerifiedByUser)
            .WithMany(user => user.VerifiedTickets)
            .HasForeignKey(ticket => ticket.VerifiedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
