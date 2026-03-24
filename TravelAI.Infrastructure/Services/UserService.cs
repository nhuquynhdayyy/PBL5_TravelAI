using TravelAI.Application.DTOs.User;
using TravelAI.Domain.Entities;
using TravelAI.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace TravelAI.Infrastructure.Services;

public class UserService
{
    private readonly ApplicationDbContext _context;
    public UserService(ApplicationDbContext context) => _context = context;

    public async Task<bool> UpdateProfileAsync(int userId, UpdateUserRequest request, string webRootPath)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return false;

        user.FullName = request.FullName;
        user.Phone = request.Phone;

        // Xử lý Upload ảnh nếu người dùng có chọn file mới
        if (request.Avatar != null)
        {
            string folderPath = Path.Combine(webRootPath, "uploads", "avatars");
            if (!Directory.Exists(folderPath)) Directory.CreateDirectory(folderPath);

            // Đặt tên file duy nhất để tránh trùng lặp
            string fileName = $"{userId}_{Guid.NewGuid()}{Path.GetExtension(request.Avatar.FileName)}";
            string filePath = Path.Combine(folderPath, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await request.Avatar.CopyToAsync(stream);
            }
            user.AvatarUrl = $"/uploads/avatars/{fileName}"; // Lưu đường dẫn tương đối
        }

        return await _context.SaveChangesAsync() > 0;
    }
}