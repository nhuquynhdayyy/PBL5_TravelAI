
# ============================================
# SCRIPT KHOI DONG FRONTEND - TravelAI
# ============================================

Write-Host "================================================" -ForegroundColor Yellow
Write-Host "   KHOI DONG FRONTEND - TravelAI" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Yellow
Write-Host ""

# Get project directory
$projectPath = $PSScriptRoot
$frontendPath = Join-Path $projectPath "travel-ai-ui"

# Check if already running
Write-Host "[CHECK] Kiem tra Frontend co dang chay khong..." -ForegroundColor Cyan

$port5173 = netstat -ano | Select-String ":5173" | Select-String "LISTENING"

if ($port5173) {
    Write-Host "[WARNING] Frontend da dang chay tai: http://localhost:5173" -ForegroundColor Yellow
    Write-Host ""

    $continue = Read-Host "Ban co muon stop va restart khong? (y/N)"

    if ($continue -ne "y" -and $continue -ne "Y") {
        Write-Host "[OK] Frontend dang chay, khong can lam gi them." -ForegroundColor Green
        Write-Host "   Mo browser: http://localhost:5173" -ForegroundColor Cyan
        exit 0
    }

    Write-Host ""
    Write-Host "[STOP] Dang stop Frontend..." -ForegroundColor Yellow

    $portLine = $port5173 | Select-Object -First 1
    $pidMatch = [regex]::Match([string]$portLine, '\s+(\d+)\s*$')

    if ($pidMatch.Success) {
        $pid5173 = [int]$pidMatch.Groups[1].Value

        Stop-Process -Id $pid5173 -Force -ErrorAction SilentlyContinue

        Write-Host "   Da stop process PID: $pid5173" -ForegroundColor Gray
    }

    Start-Sleep -Seconds 2
}

# Check if travel-ai-ui exists
if (-not (Test-Path $frontendPath -PathType Container)) {
    Write-Host "[ERROR] Khong tim thay thu muc: $frontendPath" -ForegroundColor Red
    Write-Host "   Vui long kiem tra lai cau truc project!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[CHECK] Dang kiem tra dependencies..." -ForegroundColor Cyan

Push-Location $frontendPath

try {
    # Check package.json
    if (-not (Test-Path "package.json")) {
        Write-Host "[ERROR] Khong tim thay package.json!" -ForegroundColor Red
        exit 1
    }

    # Check node_modules
    if (-not (Test-Path "node_modules")) {
        Write-Host "[WARNING] node_modules khong ton tai. Dang cai dat..." -ForegroundColor Yellow

        npm install

        if ($LASTEXITCODE -ne 0) {
            Write-Host "[ERROR] npm install that bai!" -ForegroundColor Red
            exit 1
        }

        Write-Host "[OK] Cai dat dependencies thanh cong!" -ForegroundColor Green
    } else {
        Write-Host "[OK] Dependencies da co!" -ForegroundColor Green
    }

    # Check .env
    if (Test-Path ".env") {
        $envContent = Get-Content ".env" -Raw

        if ($envContent -match '(?m)^\s*VITE_API_URL=https://localhost:7001/api\s*$') {
            Write-Host "[OK] .env cau hinh dung" -ForegroundColor Green
        } else {
            Write-Host "[WARNING] .env co the chua dung!" -ForegroundColor Yellow

            $firstLine = ($envContent -split '\r?\n')[0]

            Write-Host "   Dong dau tien: $firstLine" -ForegroundColor Gray
        }
    } else {
        Write-Host "[WARNING] Khong tim thay file .env!" -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "================================================" -ForegroundColor Yellow
    Write-Host "   [START] DANG KHOI DONG FRONTEND..." -ForegroundColor Yellow
    Write-Host "================================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Cho doi Vite dev server khoi dong..." -ForegroundColor Cyan
    Write-Host "Ban se thay:" -ForegroundColor Gray
    Write-Host "  - Local: http://localhost:5173" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Nhan Ctrl+C de dung Frontend" -ForegroundColor Yellow
    Write-Host "================================================" -ForegroundColor Yellow
    Write-Host ""

    # Run Vite dev server
    npm run dev

    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Frontend da dung hoac gap loi!" -ForegroundColor Red
    }

} finally {
    # Restore original working directory
    Pop-Location
}
