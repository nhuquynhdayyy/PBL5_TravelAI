using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using TravelAI.Application.Helpers;
using TravelAI.Domain.Entities;

namespace TravelAI.Infrastructure.Persistence.Interceptors;

/// <summary>
/// Interceptor để tự động set CreatedAt theo giờ Việt Nam khi tạo entity mới
/// </summary>
public class VietnamTimezoneInterceptor : SaveChangesInterceptor
{
    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        UpdateTimestamps(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        UpdateTimestamps(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private static void UpdateTimestamps(DbContext? context)
    {
        if (context == null) return;

        var now = DateTimeHelper.Now;

        foreach (var entry in context.ChangeTracker.Entries())
        {
            if (entry.State == EntityState.Added)
            {
                // Set CreatedAt cho các entity mới
                switch (entry.Entity)
                {
                    case User user when user.CreatedAt == default:
                        user.CreatedAt = now;
                        break;
                    case Booking booking when booking.CreatedAt == default:
                        booking.CreatedAt = now;
                        break;
                    case Review review when review.CreatedAt == default:
                        review.CreatedAt = now;
                        break;
                    case AuditLog auditLog when auditLog.Timestamp == default:
                        auditLog.Timestamp = now;
                        break;
                    case PricingRule pricingRule when pricingRule.CreatedAt == default:
                        pricingRule.CreatedAt = now;
                        break;
                    case Itinerary itinerary when itinerary.CreatedAt == default:
                        itinerary.CreatedAt = now;
                        break;
                    case AISuggestionLog aiLog when aiLog.CreatedAt == default:
                        aiLog.CreatedAt = now;
                        break;
                }
            }
        }
    }
}
