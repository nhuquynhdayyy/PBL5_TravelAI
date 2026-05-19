using Microsoft.EntityFrameworkCore;
using TravelAI.Application.DTOs.Booking;
using TravelAI.Application.Helpers;
using TravelAI.Application.Interfaces;
using TravelAI.Domain.Entities;
using TravelAI.Domain.Enums;
using TravelAI.Infrastructure.Persistence;

namespace TravelAI.Infrastructure.Services;

public class BookingService : IBookingService
{
    private readonly ApplicationDbContext _context;

    public BookingService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int?> CreateDraftBookingAsync(int userId, CreateBookingRequest request)
    {
        if (request.Quantity <= 0)
        {
            throw new InvalidOperationException("So luong phai lon hon 0.");
        }

        var service = await _context.Services.FindAsync(request.ServiceId);
        if (service == null)
        {
            return null;
        }

        if (service.ServiceType == ServiceType.Transport && request.CheckOutDate.HasValue)
        {
            return await CreateTransportBookingAsync(userId, request, service);
        }

        return await CreateStandardBookingAsync(userId, request);
    }

    private async Task<int?> CreateStandardBookingAsync(int userId, CreateBookingRequest request)
    {
        var checkInDate = request.CheckInDate.Date;
        var availability = await _context.ServiceAvailabilities
            .FirstOrDefaultAsync(a => a.ServiceId == request.ServiceId && a.Date == checkInDate);

        if (availability == null || RemainingStock(availability) < request.Quantity)
        {
            return null;
        }

        var booking = new Booking
        {
            UserId = userId,
            TotalAmount = availability.Price * request.Quantity,
            Status = BookingStatus.Pending,
            CreatedAt = DateTimeHelper.Now
        };

        _context.Bookings.Add(booking);
        await _context.SaveChangesAsync();

        _context.BookingItems.Add(new BookingItem
        {
            BookingId = booking.BookingId,
            ServiceId = request.ServiceId,
            Quantity = request.Quantity,
            PriceAtBooking = availability.Price,
            CheckInDate = checkInDate
        });

        availability.HeldCount += request.Quantity;

        await _context.SaveChangesAsync();
        return booking.BookingId;
    }

    private async Task<int?> CreateTransportBookingAsync(int userId, CreateBookingRequest request, Service service)
    {
        var checkInDate = request.CheckInDate.Date;
        var checkOutDate = request.CheckOutDate!.Value.Date;

        if (checkOutDate < checkInDate)
        {
            throw new InvalidOperationException("Ngay tra xe phai lon hon hoac bang ngay nhan xe.");
        }

        var rentalDays = (checkOutDate - checkInDate).Days + 1;
        var availabilities = await _context.ServiceAvailabilities
            .Where(a => a.ServiceId == request.ServiceId
                && a.Date >= checkInDate
                && a.Date <= checkOutDate)
            .OrderBy(a => a.Date)
            .ToListAsync();

        EnsureTransportAvailability(availabilities, checkInDate, checkOutDate, request.Quantity);

        var totalAmount = service.BasePrice * rentalDays * request.Quantity;
        var booking = new Booking
        {
            UserId = userId,
            TotalAmount = totalAmount,
            Status = BookingStatus.Pending,
            CreatedAt = DateTimeHelper.Now
        };

        _context.Bookings.Add(booking);
        await _context.SaveChangesAsync();

        _context.BookingItems.Add(new BookingItem
        {
            BookingId = booking.BookingId,
            ServiceId = request.ServiceId,
            Quantity = request.Quantity,
            PriceAtBooking = service.BasePrice * rentalDays,
            CheckInDate = checkInDate,
            CheckOutDate = checkOutDate,
            Notes = $"Thue xe {rentalDays} ngay"
        });

        foreach (var availability in availabilities)
        {
            availability.HeldCount += request.Quantity;
        }

        await _context.SaveChangesAsync();
        return booking.BookingId;
    }

    private static void EnsureTransportAvailability(
        IReadOnlyCollection<ServiceAvailability> availabilities,
        DateTime startDate,
        DateTime endDate,
        int requestedQuantity)
    {
        var availabilityByDate = availabilities.ToDictionary(a => a.Date.Date);

        for (var date = startDate.Date; date <= endDate.Date; date = date.AddDays(1))
        {
            if (!availabilityByDate.TryGetValue(date, out var availability))
            {
                throw new InvalidOperationException($"Xe da het cho trong ngay {date:dd/MM/yyyy}");
            }

            if (RemainingStock(availability) < requestedQuantity)
            {
                throw new InvalidOperationException($"Xe da het cho trong ngay {date:dd/MM/yyyy}");
            }
        }
    }

    private static int RemainingStock(ServiceAvailability availability)
    {
        return availability.TotalStock - (availability.BookedCount + availability.HeldCount);
    }
}
