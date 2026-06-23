$ErrorActionPreference = "Stop"

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $rootDir "backend"
$aiDir = Join-Path $rootDir "ai-server"
$frontendDir = Join-Path $rootDir "frontend"

$nodePath = (Get-Command node).Source
$pythonPath = (Get-Command python).Source

foreach ($port in 4000, 8000, 5173) {
  $listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  foreach ($listener in $listeners) {
    Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue
  }
}

Start-Process -WindowStyle Hidden -FilePath $nodePath -ArgumentList @("src/server.js") -WorkingDirectory $backendDir | Out-Null
Start-Process -WindowStyle Hidden -FilePath $pythonPath -ArgumentList @("-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000") -WorkingDirectory $aiDir | Out-Null

Push-Location $frontendDir
try {
  Start-Process -WindowStyle Hidden -FilePath $nodePath -ArgumentList @(
    "node_modules/vite/bin/vite.js",
    "--host",
    "localhost",
    "--port",
    "5173",
    "--force"
  ) -WorkingDirectory $frontendDir | Out-Null
}
finally {
  Pop-Location
}

Start-Sleep -Seconds 5

$checks = @(
  @{ Name = "backend"; Url = "http://127.0.0.1:4000/health" },
  @{ Name = "ai"; Url = "http://127.0.0.1:8000/health" },
  @{ Name = "frontend"; Url = "http://localhost:5173" }
)

foreach ($check in $checks) {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $check.Url -TimeoutSec 5
    Write-Host "$($check.Name): $($response.StatusCode)"
  } catch {
    Write-Host "$($check.Name): FAILED"
  }
}

Write-Host ""
Write-Host "Backend:  http://localhost:4000"
Write-Host "AI server: http://localhost:8000"
Write-Host "Frontend:  http://localhost:5173"
