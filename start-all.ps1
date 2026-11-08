
# ============================================
# SCRIPT KHOI DONG BACKEND + FRONTEND
# ============================================

Write-Host "================================================" -ForegroundColor Yellow
Write-Host "   KHOI DONG TravelAI - FULL STACK" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Yellow
Write-Host ""

# Check prerequisites
Write-Host "[CHECK] Kiem tra yeu cau he thong..." -ForegroundColor Cyan

# Check .NET
$dotnetVersion = dotnet --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] .NET SDK: $dotnetVersion" -ForegroundColor Green
} else {
    Write-Host "[ERROR] .NET SDK chua cai dat!" -ForegroundColor Red
    exit 1
}

# Check Node.js
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Node.js: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Node.js chua cai dat!" -ForegroundColor Red
    exit 1
}

# Check npm
$npmVersion = npm --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] npm: v$npmVersion" -ForegroundColor Green
} else {
    Write-Host "[ERROR] npm chua cai dat!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Check if processes are already running
$backendRunning = (netstat -ano | Select-String ":7001" | Select-String "LISTENING") -ne $null
$frontendRunning = (netstat -ano | Select-String ":5173" | Select-String "LISTENING") -ne $null

if ($backendRunning -and $frontendRunning) {
    Write-Host "[OK] Backend va Frontend da dang chay!" -ForegroundColor Green
    Write-Host "   Backend: https://localhost:7001" -ForegroundColor Cyan
    Write-Host "   Frontend: http://localhost:5173" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Mo browser: http://localhost:5173" -ForegroundColor Yellow
    Write-Host ""
    exit 0
}

Write-Host "================================================" -ForegroundColor Yellow
Write-Host "   [PREPARE] CHUAN BI KHOI DONG" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Se mo 2 terminal windows:" -ForegroundColor Cyan
Write-Host "  1. Backend (TravelAI.WebAPI)" -ForegroundColor Gray
Write-Host "  2. Frontend (travel-ai-ui)" -ForegroundColor Gray
Write-Host ""
Write-Host "Doi ca 2 hien thi 'listening' truoc khi test!" -ForegroundColor Yellow
Write-Host ""

$continue = Read-Host "Tiep tuc? (Y/n)"
if ($continue -eq "n" -or $continue -eq "N") {
    Write-Host "Da huy." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "[START] Dang khoi dong..." -ForegroundColor Cyan
Write-Host ""

# Get current directory
$currentDir = Get-Location

# Start Backend in new window
Write-Host "1. Khoi dong Backend..." -ForegroundColor Cyan
$backendScript = Join-Path $currentDir "start-backend.ps1"

if (-not (Test-Path $backendScript)) {
    Write-Host "[ERROR] Khong tim thay start-backend.ps1!" -ForegroundColor Red
    exit 1
}

Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "`"$backendScript`""
Write-Host "   [OK] Backend terminal da mo" -ForegroundColor Green

# Wait a bit
Start-Sleep -Seconds 2

# Start Frontend in new window
Write-Host "2. Khoi dong Frontend..." -ForegroundColor Cyan
$frontendScript = Join-Path $currentDir "start-frontend.ps1"

if (-not (Test-Path $frontendScript)) {
    Write-Host "[ERROR] Khong tim thay start-frontend.ps1!" -ForegroundColor Red
    exit 1
}

Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "`"$frontendScript`""
Write-Host "   [OK] Frontend terminal da mo" -ForegroundColor Green

Write-Host ""
Write-Host "================================================" -ForegroundColor Yellow
Write-Host "   [WAIT] DOI KHOI DONG HOAN TAT" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Dang cho services khoi dong..." -ForegroundColor Cyan
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
        Write-Host "[OK] Backend ready: https://localhost:7001" -ForegroundColor Green
    } else {
        Write-Host "   Doi Backend... ($attempts/$maxAttempts)" -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
}

if (-not $backendReady) {
    Write-Host "[WARNING] Backend chua san sang sau 60 giay" -ForegroundColor Yellow
    Write-Host "   Kiem tra terminal Backend de xem loi" -ForegroundColor Yellow
}

# Wait for frontend (max 60 seconds)
$frontendReady = $false
$attempts = 0

while (-not $frontendReady -and $attempts -lt $maxAttempts) {
    $attempts++
    $port5173 = netstat -ano | Select-String ":5173" | Select-String "LISTENING"

    if ($port5173) {
        $frontendReady = $true
        Write-Host "[OK] Frontend ready: http://localhost:5173" -ForegroundColor Green
    } else {
        Write-Host "   Doi Frontend... ($attempts/$maxAttempts)" -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
}

if (-not $frontendReady) {
    Write-Host "[WARNING] Frontend chua san sang sau 60 giay" -ForegroundColor Yellow
    Write-Host "   Kiem tra terminal Frontend de xem loi" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Yellow

if ($backendReady -and $frontendReady) {
    Write-Host "   [SUCCESS] TAT CA DA SAN SANG!" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "[URLS]:" -ForegroundColor Cyan
    Write-Host "   Backend API: https://localhost:7001" -ForegroundColor White
    Write-Host "   Swagger: https://localhost:7001/" -ForegroundColor White
    Write-Host "   Frontend: http://localhost:5173" -ForegroundColor White
    Write-Host "   Test SignalR: http://localhost:5173/test-signalr" -ForegroundColor White
    Write-Host ""
    Write-Host "[NEXT STEPS]:" -ForegroundColor Cyan
    Write-Host "   1. Mo browser: http://localhost:5173" -ForegroundColor Gray
    Write-Host "   2. Dang nhap" -ForegroundColor Gray
    Write-Host "   3. Test SignalR: http://localhost:5173/test-signalr" -ForegroundColor Gray
    Write-Host "   4. Chay test script: .\test-notifications.ps1" -ForegroundColor Gray
    Write-Host ""

    # Auto open browser
    $openBrowser = Read-Host "Mo browser tu dong? (Y/n)"
    if ($openBrowser -ne "n" -and $openBrowser -ne "N") {
        Start-Process "http://localhost:5173"
        Write-Host "[OK] Da mo browser" -ForegroundColor Green
    }
} else {
    Write-Host "   [WARNING] MOT SO SERVICES CHUA SAN SANG" -ForegroundColor Yellow
    Write-Host "================================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Kiem tra cac terminal windows de xem loi chi tiet" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[TIPS]:" -ForegroundColor Cyan
Write-Host "   - De dung: Dong terminal windows hoac Ctrl+C" -ForegroundColor Gray
Write-Host "   - De restart: Chay lai script nay" -ForegroundColor Gray
Write-Host "   - De kiem tra: .\check-signalr-setup.ps1" -ForegroundColor Gray
Write-Host ""
