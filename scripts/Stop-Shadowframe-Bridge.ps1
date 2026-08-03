$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$statePath = Join-Path $projectRoot ".shadowframe\processes.json"

if (!(Test-Path -LiteralPath $statePath)) {
  Write-Host "Shadowframe Bridge is not running."
  exit 0
}

$state = Get-Content -Raw -LiteralPath $statePath | ConvertFrom-Json
foreach ($processId in @($state.serverProcessId, $state.serverListenerProcessId, $state.tunnelProcessId)) {
  if ($processId) {
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if ($process) { Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue }
  }
}
$listeners = Get-NetTCPConnection -State Listen -LocalPort 3001 -ErrorAction SilentlyContinue
foreach ($listener in $listeners) {
  $details = Get-CimInstance Win32_Process -Filter "ProcessId = $($listener.OwningProcess)" -ErrorAction SilentlyContinue
  if ($details -and $details.CommandLine -and $details.CommandLine.Contains($projectRoot)) {
    Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue
  }
}
Remove-Item -LiteralPath $statePath -Force -ErrorAction SilentlyContinue
Write-Host "Shadowframe Bridge stopped." -ForegroundColor Green
