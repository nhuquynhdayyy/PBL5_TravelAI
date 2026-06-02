# ============================================
# SCRIPT KHỞI ĐỘNG BACKEND + FRONTEND
# ============================================

Write-Host "================================================" -ForegroundColor Yellow
Write-Host "   KHỞI ĐỘNG TravelAI - FULL STACK" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Yellow
Write-Host ""

# Check prerequisites
Write-Host "🔍 Kiểm tra yêu cầu hệ thống..." -ForegroundColor Cyan

# Check .NET
$dotnetVersion = dotnet --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ .NET SDK: $dotnetVersion" -ForegroundColor Green
} else {
    Write-Host "❌ .NET SDK chưa cài đặt!" -ForegroundColor Red
    exit 1
}

# Check Node.js
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js chưa cài đặt!" -ForegroundColor Red
    exit 1
}

# Check npm
$npmVersion = npm --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ npm: v$npmVersion" -ForegroundColor Green
} else {
    Write-Host "❌ npm chưa cài đặt!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Check if processes already running
$backendRunning = (netstat -ano | Select-String ":7001" | Select-String "LISTENING") -ne $null
$frontendRunning = (netstat -ano | Select-String ":5173" | Select-String "LISTENING") -ne $null

if ($backendRunning -and $frontendRunning) {
    Write-Host "✅ Backend và Frontend đã đang chạy!" -ForegroundColor Green
    Write-Host "   Backend: https://localhost:7001" -ForegroundColor Cyan
    Write-Host "   Frontend: http://localhost:5173" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Mở browser: http://localhost:5173" -ForegroundColor Yellow
    Write-Host ""
    exit 0
}

Write-Host "================================================" -ForegroundColor Yellow
Write-Host "   📦 CHUẨN BỊ KHỞI ĐỘNG" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Sẽ mở 2 terminal windows:" -ForegroundColor Cyan
Write-Host "  1. Backend (TravelAI.WebAPI)" -ForegroundColor Gray
Write-Host "  2. Frontend (travel-ai-ui)" -ForegroundColor Gray
Write-Host ""
Write-Host "Đợi cả 2 hiển thị 'listening' trước khi test!" -ForegroundColor Yellow
Write-Host ""

$continue = Read-Host "Tiếp tục? (Y/n)"
if ($continue -eq "n" -or $continue -eq "N") {
    Write-Host "Đã hủy." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "🚀 Đang khởi động..." -ForegroundColor Cyan
Write-Host ""

# Get current directory
$currentDir = Get-Location

# Start Backend in new window
Write-Host "1️⃣  Khởi động Backend..." -ForegroundColor Cyan
$backendScript = Join-Path $currentDir "start-backend.ps1"
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "`"$backendScript`""
Write-Host "   ✅ Backend terminal đã mở" -ForegroundColor Green

# Wait a bit
Start-Sleep -Seconds 2

# Start Frontend in new window
Write-Host "2️⃣  Khởi động Frontend..." -ForegroundColor Cyan
$frontendScript = Join-Path $currentDir "start-frontend.ps1"
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "`"$frontendScript`""
Write-Host "   ✅ Frontend terminal đã mở" -ForegroundColor Green

Write-Host ""
Write-Host "================================================" -ForegroundColor Yellow
Write-Host "   ⏳ ĐỢI KHỞI ĐỘNG HOÀN TẤT" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Đang chờ services khởi động..." -ForegroundColor Cyan
Write-Host ""

# Wait for backend (max 60 seconds)
$backendReady = $false
$attempts = 0
$maxAttempts = 30

while (-not $backendReady -and $attempts -lt $maxAttempts) {
    $attempts++
    $port7001 = netstat -ano | Select-String ":7001" | Select-String "LISTENING"
    
    if ($port7001) {
        $backendReady = $true
        Write-Host "✅ Backend ready: https://localhost:7001" -ForegroundColor Green
    } else {
        Write-Host "   Đợi Backend... ($attempts/$maxAttempts)" -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
}

if (-not $backendReady) {
    Write-Host "⚠️  Backend chưa sẵn sàng sau 60 giây" -ForegroundColor Yellow
    Write-Host "   Kiểm tra terminal Backend để xem lỗi" -ForegroundColor Yellow
}

# Wait for frontend (max 60 seconds)
$frontendReady = $false
$attempts = 0

while (-not $frontendReady -and $attempts -lt $maxAttempts) {
    $attempts++
    $port5173 = netstat -ano | Select-String ":5173" | Select-String "LISTENING"
    
    if ($port5173) {
        $frontendReady = $true
        Write-Host "✅ Frontend ready: http://localhost:5173" -ForegroundColor Green
    } else {
        Write-Host "   Đợi Frontend... ($attempts/$maxAttempts)" -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
}

if (-not $frontendReady) {
    Write-Host "⚠️  Frontend chưa sẵn sàng sau 60 giây" -ForegroundColor Yellow
    Write-Host "   Kiểm tra terminal Frontend để xem lỗi" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Yellow

if ($backendReady -and $frontendReady) {
    Write-Host "   🎉 TẤT CẢ ĐÃ SẴN SÀNG!" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📍 URLs:" -ForegroundColor Cyan
    Write-Host "   Backend API: https://localhost:7001" -ForegroundColor White
    Write-Host "   Swagger: https://localhost:7001/" -ForegroundColor White
    Write-Host "   Frontend: http://localhost:5173" -ForegroundColor White
    Write-Host "   Test SignalR: http://localhost:5173/test-signalr" -ForegroundColor White
    Write-Host ""
    Write-Host "🎯 Bước tiếp theo:" -ForegroundColor Cyan
    Write-Host "   1. Mở browser: http://localhost:5173" -ForegroundColor Gray
    Write-Host "   2. Đăng nhập" -ForegroundColor Gray
    Write-Host "   3. Test SignalR: http://localhost:5173/test-signalr" -ForegroundColor Gray
    Write-Host "   4. Chạy test script: .\test-notifications.ps1" -ForegroundColor Gray
    Write-Host ""
    
    # Auto open browser
    $openBrowser = Read-Host "Mở browser tự động? (Y/n)"
    if ($openBrowser -ne "n" -and $openBrowser -ne "N") {
        Start-Process "http://localhost:5173"
        Write-Host "✅ Đã mở browser" -ForegroundColor Green
    }
} else {
    Write-Host "   ⚠️  MỘT SỐ SERVICES CHƯA SẴN SÀNG" -ForegroundColor Yellow
    Write-Host "================================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Kiểm tra các terminal windows để xem lỗi chi tiết" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "💡 Tips:" -ForegroundColor Cyan
Write-Host "   - Để dừng: Đóng terminal windows hoặc Ctrl+C" -ForegroundColor Gray
Write-Host "   - Để restart: Chạy lại script này" -ForegroundColor Gray
Write-Host "   - Để kiểm tra: .\check-signalr-setup.ps1" -ForegroundColor Gray
Write-Host ""
