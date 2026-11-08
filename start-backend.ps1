
# ============================================
# SCRIPT KHOI DONG BACKEND - TravelAI
# ============================================

Write-Host "================================================" -ForegroundColor Yellow
Write-Host "   KHOI DONG BACKEND - TravelAI" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Yellow
Write-Host ""

# Get project directory
$projectPath = $PSScriptRoot
$backendPath = Join-Path $projectPath "TravelAI.WebAPI"

# Check .NET SDK
Write-Host "[CHECK] Kiem tra .NET SDK..." -ForegroundColor Cyan

$dotnetVersion = dotnet --version 2>$null

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] .NET SDK chua duoc cai dat!" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] .NET SDK: $dotnetVersion" -ForegroundColor Green

# Check if Backend is already running
Write-Host ""
Write-Host "[CHECK] Kiem tra Backend co dang chay khong..." -ForegroundColor Cyan

$port7001 = netstat -ano | Select-String ":7001\s+.*LISTENING"
$port5134 = netstat -ano | Select-String ":5134\s+.*LISTENING"

if ($port7001 -or $port5134) {
    Write-Host "[WARNING] Backend da dang chay!" -ForegroundColor Yellow
    Write-Host ""

    if ($port7001) {
        Write-Host "   HTTPS: https://localhost:7001" -ForegroundColor Green
    }

    if ($port5134) {
        Write-Host "   HTTP: http://localhost:5134" -ForegroundColor Green
    }

    Write-Host ""

    $continue = Read-Host "Ban co muon stop va restart khong? (y/N)"

    if ($continue -ne "y" -and $continue -ne "Y") {
        Write-Host "[OK] Backend dang chay, khong can lam gi them." -ForegroundColor Green
        exit 0
    }

    Write-Host ""
    Write-Host "[STOP] Dang stop Backend..." -ForegroundColor Yellow

    # Stop processes on ports 7001 and 5134
    $processIds = @()

    foreach ($port in @(7001, 5134)) {
        $connections = netstat -ano | Select-String ":$port\s+.*LISTENING"

        foreach ($connection in $connections) {
            $pidMatch = [regex]::Match([string]$connection, '\s+(\d+)\s*$')

            if ($pidMatch.Success) {
                $processId = [int]$pidMatch.Groups[1].Value

                if ($processId -gt 0 -and $processIds -notcontains $processId) {
                    $processIds += $processId
                }
            }
        }
    }

    foreach ($processId in $processIds) {
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        Write-Host "   Da stop process PID: $processId" -ForegroundColor Gray
    }

    Start-Sleep -Seconds 2
}

# Check Backend directory
if (-not (Test-Path $backendPath -PathType Container)) {
    Write-Host "[ERROR] Khong tim thay thu muc: $backendPath" -ForegroundColor Red
    Write-Host "   Vui long kiem tra cau truc project!" -ForegroundColor Red
    exit 1
}

# Enter Backend directory
Write-Host ""
Write-Host "[BUILD] Dang build Backend..." -ForegroundColor Cyan

Push-Location $backendPath

try {
    # Check project file
    $projectFiles = Get-ChildItem -Filter "*.csproj" -File

    if ($projectFiles.Count -eq 0) {
        Write-Host "[ERROR] Khong tim thay file .csproj!" -ForegroundColor Red
        exit 1
    }

    if ($projectFiles.Count -gt 1) {
        Write-Host "[ERROR] Co nhieu file .csproj. Can xac dinh project can chay!" -ForegroundColor Red
        exit 1
    }

    $projectFile = $projectFiles[0].FullName

    Write-Host "[INFO] Project: $($projectFiles[0].Name)" -ForegroundColor Gray

    # Clean previous build
    Write-Host ""
    Write-Host "[CLEAN] Dang clean project..." -ForegroundColor Cyan

    dotnet clean $projectFile --nologo --verbosity quiet

    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Dotnet clean that bai!" -ForegroundColor Red
        exit 1
    }

    # Build project
    Write-Host ""
    Write-Host "[BUILD] Dang build project..." -ForegroundColor Cyan

    dotnet build $projectFile --nologo --verbosity minimal

    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "[ERROR] Build that bai!" -ForegroundColor Red
        Write-Host "   Kiem tra cac loi build phia tren." -ForegroundColor Yellow
        exit 1
    }

    Write-Host ""
    Write-Host "[OK] Build thanh cong!" -ForegroundColor Green

    # Check launchSettings.json
    $launchSettingsPath = Join-Path $backendPath "Properties\launchSettings.json"

    if (-not (Test-Path $launchSettingsPath)) {
        Write-Host "[WARNING] Khong tim thay launchSettings.json!" -ForegroundColor Yellow
    } else {
        try {
            $launchSettings = Get-Content $launchSettingsPath -Raw | ConvertFrom-Json
            $httpsProfile = $launchSettings.profiles.https

            if ($httpsProfile -and $httpsProfile.applicationUrl) {
                Write-Host "[INFO] HTTPS URL: $($httpsProfile.applicationUrl)" -ForegroundColor Gray

                if ($httpsProfile.applicationUrl -match "7001") {
                    Write-Host "[OK] Port HTTPS 7001 da duoc cau hinh!" -ForegroundColor Green
                } else {
                    Write-Host "[WARNING] HTTPS URL khong chua port 7001!" -ForegroundColor Yellow
                }
            } else {
                Write-Host "[WARNING] Khong tim thay HTTPS profile!" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "[WARNING] Khong doc duoc launchSettings.json!" -ForegroundColor Yellow
            Write-Host "   $($_.Exception.Message)" -ForegroundColor Gray
        }
    }

    # Start Backend
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Yellow
    Write-Host "   [START] DANG KHOI DONG BACKEND..." -ForegroundColor Yellow
    Write-Host "================================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Cho doi Backend khoi dong..." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Ban se thay:" -ForegroundColor Gray
    Write-Host "   Now listening on: https://localhost:7001" -ForegroundColor Gray
    Write-Host "   Now listening on: http://localhost:5134" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Nhan Ctrl+C de dung Backend" -ForegroundColor Yellow
    Write-Host "================================================" -ForegroundColor Yellow
    Write-Host ""

    # Run application
    dotnet run --no-build --project $projectFile

    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "[ERROR] Backend gap loi khi chay!" -ForegroundColor Red
    }

} finally {
    # Restore original working directory
    Pop-Location
}
