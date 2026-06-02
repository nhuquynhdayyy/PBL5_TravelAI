# ============================================
# SCRIPT KHỞI ĐỘNG BACKEND - TravelAI
# ============================================

Write-Host "================================================" -ForegroundColor Yellow
Write-Host "   KHỞI ĐỘNG BACKEND - TravelAI" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Yellow
Write-Host ""

# Check if already running
Write-Host "🔍 Kiểm tra Backend có đang chạy không..." -ForegroundColor Cyan
$port7001 = netstat -ano | Select-String ":7001" | Select-String "LISTENING"
$port5134 = netstat -ano | Select-String ":5134" | Select-String "LISTENING"

if ($port7001 -or $port5134) {
    Write-Host "⚠️  Backend đã đang chạy!" -ForegroundColor Yellow
    Write-Host ""
    
    if ($port7001) {
        Write-Host "   HTTPS: https://localhost:7001 ✅" -ForegroundColor Green
    }
    if ($port5134) {
        Write-Host "   HTTP: http://localhost:5134 ✅" -ForegroundColor Green
    }
    
    Write-Host ""
    $continue = Read-Host "Bạn có muốn stop và restart không? (y/N)"
    
    if ($continue -ne "y" -and $continue -ne "Y") {
        Write-Host "✅ Backend đang chạy, không cần làm gì thêm." -ForegroundColor Green
        exit 0
    }
    
    Write-Host ""
    Write-Host "🛑 Đang stop Backend..." -ForegroundColor Yellow
    
    # Kill processes on port 7001
    if ($port7001) {
        $pid7001 = ($port7001 | Select-Object -First 1) -replace '.*LISTENING\s+(\d+).*', '$1'
        if ($pid7001) {
            Stop-Process -Id $pid7001 -Force -ErrorAction SilentlyContinue
            Write-Host "   Đã stop process PID: $pid7001" -ForegroundColor Gray
        }
    }
    
    # Kill processes on port 5134
    if ($port5134) {
        $pid5134 = ($port5134 | Select-Object -First 1) -replace '.*LISTENING\s+(\d+).*', '$1'
        if ($pid5134) {
            Stop-Process -Id $pid5134 -Force -ErrorAction SilentlyContinue
            Write-Host "   Đã stop process PID: $pid5134" -ForegroundColor Gray
        }
    }
    
    Start-Sleep -Seconds 2
}

# Check if TravelAI.WebAPI exists
$backendPath = "TravelAI.WebAPI"
if (-not (Test-Path $backendPath)) {
    Write-Host "❌ Không tìm thấy thư mục: $backendPath" -ForegroundColor Red
    Write-Host "   Vui lòng chạy script này từ thư mục gốc của project!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📦 Đang build Backend..." -ForegroundColor Cyan
Push-Location $backendPath

try {
    # Clean previous build
    dotnet clean --nologo --verbosity quiet
    
    # Build project
    $buildOutput = dotnet build --nologo --verbosity minimal 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Build thất bại!" -ForegroundColor Red
        Write-Host $buildOutput
        exit 1
    }
    
    Write-Host "✅ Build thành công!" -ForegroundColor Green
    Write-Host ""
    
    # Check launchSettings.json
    $launchSettings = Get-Content "Properties/launchSettings.json" | ConvertFrom-Json
    $httpsProfile = $launchSettings.profiles.https
    
    if ($httpsProfile.applicationUrl -match "7001") {
        Write-Host "✅ Port cấu hình đúng: 7001" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Cảnh báo: Port không phải 7001!" -ForegroundColor Yellow
        Write-Host "   URL: $($httpsProfile.applicationUrl)" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Yellow
    Write-Host "   🚀 ĐANG KHỞI ĐỘNG BACKEND..." -ForegroundColor Yellow
    Write-Host "================================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Chờ đợi Backend khởi động..." -ForegroundColor Cyan
    Write-Host "Bạn sẽ thấy:" -ForegroundColor Gray
    Write-Host "  - Now listening on: https://localhost:7001" -ForegroundColor Gray
    Write-Host "  - Now listening on: http://localhost:5134" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Nhấn Ctrl+C để dừng Backend" -ForegroundColor Yellow
    Write-Host "================================================" -ForegroundColor Yellow
    Write-Host ""
    
    # Run the application
    dotnet run --no-build
    
} finally {
    Pop-Location
}
