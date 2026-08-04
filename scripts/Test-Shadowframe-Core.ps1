param(
  [string]$CoreRoot = "",
  [int]$ComfyPort = 8288,
  [int]$BridgePort = 3101
)

$ErrorActionPreference = "Stop"
if (!$CoreRoot) {
  $CoreRoot = Join-Path (Split-Path -Parent $PSScriptRoot) "release\Shadowframe-Core"
}
$CoreRoot = [IO.Path]::GetFullPath($CoreRoot)
$manifestPath = Join-Path $CoreRoot "runtime-manifest.json"
$startScript = Join-Path $CoreRoot "scripts\Start-Shadowframe-Core.ps1"
$stopScript = Join-Path $CoreRoot "scripts\Stop-Shadowframe-Core.ps1"
$statePath = Join-Path $env:LOCALAPPDATA "Shadowframe\State\processes.json"

foreach ($path in @($manifestPath, $startScript, $stopScript)) {
  if (!(Test-Path -LiteralPath $path -PathType Leaf)) {
    throw "The staged Core package is incomplete: $path is missing."
  }
}
if (Test-Path -LiteralPath $statePath) {
  throw "Shadowframe Core is already running. Stop it before running the isolation test."
}
foreach ($port in @($ComfyPort, $BridgePort)) {
  if (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) {
    throw "Test port $port is already in use."
  }
}

$manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
foreach ($requiredFile in $manifest.requiredFiles) {
  $absolutePath = Join-Path $CoreRoot ($requiredFile.Replace('/', [IO.Path]::DirectorySeparatorChar))
  if (!(Test-Path -LiteralPath $absolutePath -PathType Leaf)) {
    throw "Required Core file is missing: $requiredFile"
  }
}

try {
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $startScript -ComfyPort $ComfyPort -BridgePort $BridgePort
  if ($LASTEXITCODE -ne 0) { throw "Shadowframe Core startup failed." }

  $systemStats = Invoke-RestMethod -Uri "http://127.0.0.1:$ComfyPort/system_stats" -TimeoutSec 10
  $bridge = Invoke-WebRequest -Uri "http://127.0.0.1:$BridgePort/" -UseBasicParsing -TimeoutSec 10
  if ($bridge.StatusCode -ne 200) { throw "The local Shadowframe service returned HTTP $($bridge.StatusCode)." }

  Write-Host "Shadowframe Core isolation test passed." -ForegroundColor Green
  Write-Host "ComfyUI $($systemStats.system.comfyui_version), Python $($systemStats.system.python_version.Split(' ')[0]), bridge HTTP $($bridge.StatusCode)."
} finally {
  if (Test-Path -LiteralPath $statePath) {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $stopScript
  }
}
