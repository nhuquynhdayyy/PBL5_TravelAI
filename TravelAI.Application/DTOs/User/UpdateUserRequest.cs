using Microsoft.AspNetCore.Http;

namespace TravelAI.Application.DTOs.User;

public class UpdateUserRequest
{
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public IFormFile? Avatar { get; set; } // Nhận file ảnh từ Form-data
}