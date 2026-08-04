$ErrorActionPreference = "Stop"

$dataRoot = Join-Path $env:LOCALAPPDATA "Shadowframe"
$statePath = Join-Path $dataRoot "State\processes.json"

if (!(Test-Path -LiteralPath $statePath)) {
  Write-Host "Shadowframe Core is not running."
  exit 0
}

$state = Get-Content -Raw -LiteralPath $statePath | ConvertFrom-Json
foreach ($processId in @($state.bridgeProcessId, $state.bridgeListenerProcessId, $state.comfyProcessId)) {
  if ($processId) {
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    $processPath = if ($process) { $process.Path } else { "" }
    if ($processPath -and $state.coreRoot -and $processPath.StartsWith($state.coreRoot, [StringComparison]::OrdinalIgnoreCase)) {
      Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    }
  }
}

Remove-Item -LiteralPath $statePath -Force -ErrorAction SilentlyContinue
Write-Host "Shadowframe Core stopped."
