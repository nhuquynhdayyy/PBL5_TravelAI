namespace TravelAI.Application.DTOs.Auth;

public record RegisterRequest(string Email, string FullName, string Password, bool IsPartner = false);
public record LoginRequest(string Email, string Password);
public record AuthResponse(string Token, string FullName, string Email, string RoleName);
