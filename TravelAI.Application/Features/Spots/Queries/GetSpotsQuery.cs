// using MediatR;
// using Microsoft.EntityFrameworkCore;
// using TravelAI.Application.Abstractions; // Đúng theo ảnh bạn gửi
// using TravelAI.Domain.Entities;

// namespace TravelAI.Application.Features.Spots.Queries;

// public class GetSpotsQuery : IRequest<IEnumerable<TouristSpot>>
// {
//     public int? DestinationId { get; set; }
//     public string? SearchTerm { get; set; }
// }

// public class GetSpotsQueryHandler : IRequestHandler<GetSpotsQuery, IEnumerable<TouristSpot>>
// {
//     private readonly IApplicationDbContext _context;

//     public GetSpotsQueryHandler(IApplicationDbContext context)
//     {
//         _context = context;
//     }

//     public async Task<IEnumerable<TouristSpot>> Handle(GetSpotsQuery request, CancellationToken cancellationToken)
//     {
//         var query = _context.TouristSpots.AsQueryable();

//         // Lọc theo ID tỉnh nếu có
//         if (request.DestinationId.HasValue)
//         {
//             query = query.Where(s => s.DestinationId == request.DestinationId.Value);
//         }

//         // Tìm kiếm theo từ khóa nếu có
//         if (!string.IsNullOrWhiteSpace(request.SearchTerm))
//         {
//             var keyword = request.SearchTerm.Trim();
//             query = query.Where(s => 
//                 s.Name.Contains(keyword) || 
//                 (s.Description != null && s.Description.Contains(keyword)));
//         }

//         return await query.ToListAsync(cancellationToken);
//     }
// }

using MediatR;
using Microsoft.EntityFrameworkCore;
using TravelAI.Application.Abstractions;
using TravelAI.Domain.Entities;

namespace TravelAI.Application.Features.Spots.Queries;

public class GetSpotsQuery : IRequest<IEnumerable<TouristSpot>>
{
    public int? DestinationId { get; set; }
    public string? SearchTerm { get; set; }
}

public class GetSpotsQueryHandler : IRequestHandler<GetSpotsQuery, IEnumerable<TouristSpot>>
{
    private readonly IApplicationDbContext _context;

    public GetSpotsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<TouristSpot>> Handle(GetSpotsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.TouristSpots.AsQueryable();

        // ✅ Filter theo destination
        if (request.DestinationId.HasValue)
        {
            query = query.Where(x => x.DestinationId == request.DestinationId.Value);
        }

        // ✅ Search
        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var keyword = request.SearchTerm.Trim();
            query = query.Where(x =>
                x.Name.Contains(keyword) ||
                (x.Description != null && x.Description.Contains(keyword)));
        }

        // ✅ Order (SỬA Ở ĐÂY nếu bạn không có Id)
        query = query.OrderByDescending(x => x.SpotId);

        return await query.ToListAsync(cancellationToken);
    }
}