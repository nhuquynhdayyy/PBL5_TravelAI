# ============================================
# SCRIPT KHỞI ĐỘNG FRONTEND - TravelAI
# ============================================

Write-Host "================================================" -ForegroundColor Yellow
Write-Host "   KHỞI ĐỘNG FRONTEND - TravelAI" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Yellow
Write-Host ""

# Check if already running
Write-Host "🔍 Kiểm tra Frontend có đang chạy không..." -ForegroundColor Cyan
$port5173 = netstat -ano | Select-String ":5173" | Select-String "LISTENING"

if ($port5173) {
    Write-Host "⚠️  Frontend đã đang chạy tại: http://localhost:5173" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Bạn có muốn stop và restart không? (y/N)"
    
    if ($continue -ne "y" -and $continue -ne "Y") {
        Write-Host "✅ Frontend đang chạy, không cần làm gì thêm." -ForegroundColor Green
        Write-Host "   Mở browser: http://localhost:5173" -ForegroundColor Cyan
        exit 0
    }
    
    Write-Host ""
    Write-Host "🛑 Đang stop Frontend..." -ForegroundColor Yellow
    
    $pid5173 = ($port5173 | Select-Object -First 1) -replace '.*LISTENING\s+(\d+).*', '$1'
    if ($pid5173) {
        Stop-Process -Id $pid5173 -Force -ErrorAction SilentlyContinue
        Write-Host "   Đã stop process PID: $pid5173" -ForegroundColor Gray
    }
    
    Start-Sleep -Seconds 2
}

# Check if travel-ai-ui exists
$frontendPath = "travel-ai-ui"
if (-not (Test-Path $frontendPath)) {
    Write-Host "❌ Không tìm thấy thư mục: $frontendPath" -ForegroundColor Red
    Write-Host "   Vui lòng chạy script này từ thư mục gốc của project!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📦 Đang kiểm tra dependencies..." -ForegroundColor Cyan
Push-Location $frontendPath

try {
    # Check if node_modules exists
    if (-not (Test-Path "node_modules")) {
        Write-Host "⚠️  node_modules không tồn tại. Đang cài đặt..." -ForegroundColor Yellow
        npm install
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ npm install thất bại!" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "✅ Dependencies đã có!" -ForegroundColor Green
    }
    
    # Check .env
    if (Test-Path ".env") {
        $envContent = Get-Content ".env" -Raw
        if ($envContent -match "VITE_API_URL=https://localhost:7001/api") {
            Write-Host "✅ .env cấu hình đúng" -ForegroundColor Green
        } else {
            Write-Host "⚠️  .env có thể chưa đúng!" -ForegroundColor Yellow
            Write-Host "   Nội dung hiện tại:" -ForegroundColor Gray
            Write-Host "   $(($envContent -split "`n")[0])" -ForegroundColor Gray
        }
    } else {
        Write-Host "⚠️  Không tìm thấy .env!" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Yellow
    Write-Host "   🚀 ĐANG KHỞI ĐỘNG FRONTEND..." -ForegroundColor Yellow
    Write-Host "================================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Chờ đợi Vite dev server khởi động..." -ForegroundColor Cyan
    Write-Host "Bạn sẽ thấy:" -ForegroundColor Gray
    Write-Host "  - Local: http://localhost:5173" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Nhấn Ctrl+C để dừng Frontend" -ForegroundColor Yellow
    Write-Host "================================================" -ForegroundColor Yellow
    Write-Host ""
    
    # Run the dev server
    npm run dev
    
} finally {
    Pop-Location
}
