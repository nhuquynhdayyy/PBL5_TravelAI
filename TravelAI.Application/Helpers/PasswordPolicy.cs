namespace TravelAI.Application.Helpers;

public static class PasswordPolicy
{
    public const string ErrorMessage = "Mật khẩu phải có tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt, không chứa khoảng trắng.";

    public static bool IsValid(string? password)
    {
        if (string.IsNullOrEmpty(password) || password.Length < 8 || password.Any(char.IsWhiteSpace))
            return false;

        return password.Any(c => c is >= 'A' and <= 'Z')
            && password.Any(c => c is >= 'a' and <= 'z')
            && password.Any(c => c is >= '0' and <= '9')
            && password.Any(c => !IsAsciiLetterOrDigit(c));
    }

    private static bool IsAsciiLetterOrDigit(char character) =>
        character is >= 'A' and <= 'Z'
            or >= 'a' and <= 'z'
            or >= '0' and <= '9';
}
