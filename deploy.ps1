# PowerShell deployment script for Windows
# Deployment script for Deceptive Domain Checker

$ErrorActionPreference = "Stop"

Write-Host "Starting deployment of Deceptive Domain Checker..." -ForegroundColor Cyan

# Check if .env file exists
if (-not (Test-Path .env)) {
    Write-Host "WARNING: .env file not found. Creating from .env.example..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "ERROR: Please configure .env file with your credentials and run again." -ForegroundColor Red
    exit 1
}

# Load environment variables from .env
Get-Content .env | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

# Validate required environment variables
Write-Host "Validating environment variables..." -ForegroundColor Cyan
$requiredVars = @("KEITARO_API_URL", "KEITARO_API_KEY", "TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID")
$missingVars = @()

foreach ($var in $requiredVars) {
    if ([string]::IsNullOrEmpty([Environment]::GetEnvironmentVariable($var))) {
        $missingVars += $var
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host "ERROR: Missing required environment variables:" -ForegroundColor Red
    $missingVars | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    exit 1
}

Write-Host "SUCCESS: Environment validation passed" -ForegroundColor Green

# Stop existing containers
Write-Host "Stopping existing containers..." -ForegroundColor Cyan
docker-compose down

# Build and start containers
Write-Host "Building Docker images..." -ForegroundColor Cyan
docker-compose build --no-cache

Write-Host "Starting containers..." -ForegroundColor Cyan
docker-compose up -d

# Wait for service to be healthy
Write-Host "Waiting for service to be healthy..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

$maxRetries = 30
$retryCount = 0

while ($retryCount -lt $maxRetries) {
    $status = docker-compose ps | Select-String "healthy"
    if ($status) {
        Write-Host "SUCCESS: Service is healthy and running!" -ForegroundColor Green
        break
    }
    
    $retryCount++
    Write-Host "Checking health... ($retryCount/$maxRetries)"
    Start-Sleep -Seconds 2
}

if ($retryCount -eq $maxRetries) {
    Write-Host "ERROR: Service failed to become healthy" -ForegroundColor Red
    Write-Host "Showing logs:" -ForegroundColor Yellow
    docker-compose logs --tail=50
    exit 1
}

# Show service info
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment completed successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Service Status:" -ForegroundColor Cyan
docker-compose ps
Write-Host ""
$port = if ($env:PORT) { $env:PORT } else { "3000" }
Write-Host "Service URL: http://localhost:$port" -ForegroundColor Cyan
Write-Host "Health Check: http://localhost:$port/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Cyan
Write-Host "  View logs:        docker-compose logs -f"
Write-Host "  Stop service:     docker-compose stop"
Write-Host "  Restart service:  docker-compose restart"
Write-Host "  Remove service:   docker-compose down"
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
