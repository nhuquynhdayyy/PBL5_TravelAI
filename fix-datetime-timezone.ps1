# Script to replace DateTime.UtcNow with DateTimeHelper.Now

$files = @(
    "TravelAI.WebAPI/Controllers/PartnerController.cs",
    "TravelAI.WebAPI/Controllers/BookingsController.cs",
    "TravelAI.WebAPI/Controllers/AdminController.cs",
    "TravelAI.Infrastructure/Persistence/DbInitializer.cs",
    "TravelAI.Infrastructure/Application/Services/AuthService.cs",
    "TravelAI.Infrastructure/BackgroundJobs/OrderApprovalTimeoutJob.cs",
    "TravelAI.Infrastructure/BackgroundJobs/OrderApprovalReminderJob.cs"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Processing $file..."
        
        $content = Get-Content $file -Raw
        
        # Add using statement if not exists
        if ($content -notmatch "using TravelAI\.Application\.Helpers;") {
            $content = $content -replace "(using [^;]+;`n)+", "`$0using TravelAI.Application.Helpers;`n"
        }
        
        # Replace DateTime.UtcNow with DateTimeHelper.Now
        $content = $content -replace "DateTime\.UtcNow", "DateTimeHelper.Now"
        
        # Save file
        Set-Content -Path $file -Value $content -NoNewline
        
        Write-Host "Updated $file"
    } else {
        Write-Host "File not found: $file"
    }
}

Write-Host "Done! All files updated to use Vietnam timezone."
