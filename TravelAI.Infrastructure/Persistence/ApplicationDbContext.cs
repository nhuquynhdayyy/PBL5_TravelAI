using Microsoft.EntityFrameworkCore;
using TravelAI.Application.Abstractions;
using TravelAI.Domain.Entities;

namespace TravelAI.Infrastructure.Persistence;

public class ApplicationDbContext : DbContext, IApplicationDbContext {
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) {}

    public DbSet<Role> Roles => Set<Role>();
    public DbSet<User> Users => Set<User>();
    public DbSet<PartnerProfile> PartnerProfiles => Set<PartnerProfile>();
    public DbSet<UserPreference> UserPreferences => Set<UserPreference>();
    public DbSet<Destination> Destinations => Set<Destination>();
    public DbSet<TouristSpot> TouristSpots => Set<TouristSpot>();
    public DbSet<Service> Services => Set<Service>();
    public DbSet<ServiceAttribute> ServiceAttributes => Set<ServiceAttribute>();
    public DbSet<Service_Spot> Service_Spots => Set<Service_Spot>();
    public DbSet<ServiceImage> ServiceImages => Set<ServiceImage>();
    public DbSet<ServiceAvailability> ServiceAvailabilities => Set<ServiceAvailability>();
    public DbSet<Itinerary> Itineraries => Set<Itinerary>();
    public DbSet<ItineraryItem> ItineraryItems => Set<ItineraryItem>();
    public DbSet<AISuggestionLog> AISuggestionLogs => Set<AISuggestionLog>();
    public DbSet<Promotion> Promotions => Set<Promotion>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<BookingItem> BookingItems => Set<BookingItem>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Refund> Refunds => Set<Refund>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<Spot> Spots => Set<Spot>(); 

    protected override void OnModelCreating(ModelBuilder modelBuilder) {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
    }
}