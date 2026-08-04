param(
  [string]$StatusFile = "",
  [int]$BridgePort = 3001,
  [int]$ComfyPort = 8188
)

$ErrorActionPreference = "Stop"

$coreRoot = Split-Path -Parent $PSScriptRoot
$manifestPath = Join-Path $coreRoot "runtime-manifest.json"
if (!(Test-Path -LiteralPath $manifestPath)) {
  throw "Shadowframe Core is incomplete: runtime-manifest.json is missing."
}
$manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json

function Get-ShadowframeInstallValue([string]$Name, [string]$Fallback) {
  try {
    $key = Get-Item -LiteralPath "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\ShadowframeAI" -ErrorAction SilentlyContinue
    if ($key) {
      $value = $key.GetValue($Name)
      if ($value -and ![string]::IsNullOrWhiteSpace([string]$value)) {
        return [IO.Path]::GetFullPath([string]$value).TrimEnd('\')
      }
    }
  } catch {}
  return [IO.Path]::GetFullPath($Fallback).TrimEnd('\')
}

$dataRoot = Get-ShadowframeInstallValue "DataRoot" (Join-Path $env:LOCALAPPDATA "Shadowframe")
$outputRoot = Get-ShadowframeInstallValue "OutputRoot" (Join-Path ([Environment]::GetFolderPath([Environment+SpecialFolder]::MyDocuments)) "Shadowframe Output")
$stateDirectory = Join-Path $dataRoot "State"
$statePath = Join-Path $stateDirectory "processes.json"
$serverLog = Join-Path $stateDirectory "bridge.log"
$serverErrorLog = Join-Path $stateDirectory "bridge-error.log"
$comfyLog = Join-Path $stateDirectory "comfyui.log"
$comfyErrorLog = Join-Path $stateDirectory "comfyui-error.log"
$accessKeyPath = Join-Path $stateDirectory "access-key.txt"
$friendAccessPath = Join-Path $stateDirectory "Friend Access.txt"
function Write-CoreStatus([string]$message) {
  Write-Host $message
  if ($StatusFile) {
    Set-Content -LiteralPath $StatusFile -Value $message -Encoding UTF8 -NoNewline
  }
}

function Resolve-CorePath([string]$relativePath) {
  return Join-Path $coreRoot ($relativePath.Replace('/', [IO.Path]::DirectorySeparatorChar))
}

function Stop-RecordedProcesses {
  if (!(Test-Path -LiteralPath $statePath)) { return }
  try {
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
  } catch {
    Write-Warning "Previous Shadowframe Core state could not be read."
  }
  Remove-Item -LiteralPath $statePath -Force -ErrorAction SilentlyContinue
}

New-Item -ItemType Directory -Path $stateDirectory -Force | Out-Null
foreach ($directory in @("models", "custom_nodes", "user")) {
  New-Item -ItemType Directory -Path (Join-Path $dataRoot $directory) -Force | Out-Null
}
foreach ($directory in @("input", "output", "temp")) {
  New-Item -ItemType Directory -Path (Join-Path $outputRoot $directory) -Force | Out-Null
}

Write-CoreStatus "Validating the private Shadowframe runtime..."
foreach ($requiredFile in $manifest.requiredFiles) {
  $absolutePath = Resolve-CorePath $requiredFile
  if (!(Test-Path -LiteralPath $absolutePath -PathType Leaf)) {
    throw "Shadowframe Core is incomplete: $requiredFile is missing."
  }
}

Stop-RecordedProcesses

foreach ($port in @($bridgePort, $comfyPort)) {
  $listener = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($listener) {
    throw "Port $port is already in use. Close the program using it, then start Shadowframe again."
  }
}

$pythonPath = Resolve-CorePath $manifest.runtime.pythonExecutable
$comfyMain = Resolve-CorePath $manifest.runtime.comfyUiEntryPoint
$comfyFrontEndRoot = Resolve-CorePath $manifest.runtime.comfyUiFrontEndRoot
$comfyRoot = Split-Path -Parent $comfyMain
$nodePath = Resolve-CorePath $manifest.runtime.nodeExecutable
$bridgeEntry = Resolve-CorePath $manifest.runtime.bridgeEntryPoint
$bridgeRoot = Join-Path $coreRoot "Bridge"

foreach ($log in @($serverLog, $serverErrorLog, $comfyLog, $comfyErrorLog)) {
  Remove-Item -LiteralPath $log -Force -ErrorAction SilentlyContinue
}

Write-CoreStatus "Starting the private ComfyUI engine..."
$comfyArguments = @(
  $comfyMain,
  "--base-directory", $dataRoot,
  "--input-directory", (Join-Path $outputRoot "input"),
  "--output-directory", (Join-Path $outputRoot "output"),
  "--temp-directory", (Join-Path $outputRoot "temp"),
  "--front-end-root", $comfyFrontEndRoot,
  "--disable-auto-launch",
  "--lowvram",
  "--listen", "127.0.0.1",
  "--port", "$comfyPort"
)
$comfyProcess = Start-Process -FilePath $pythonPath -ArgumentList $comfyArguments -WorkingDirectory $comfyRoot -WindowStyle Hidden -RedirectStandardOutput $comfyLog -RedirectStandardError $comfyErrorLog -PassThru

$comfyReady = $false
for ($attempt = 0; $attempt -lt 180; $attempt += 1) {
  Start-Sleep -Seconds 1
  if ($comfyProcess.HasExited) { break }
  try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:$comfyPort/system_stats" -UseBasicParsing -TimeoutSec 3
    if ($response.StatusCode -eq 200) { $comfyReady = $true; break }
  } catch {}
}
if (!$comfyReady) {
  Stop-Process -Id $comfyProcess.Id -Force -ErrorAction SilentlyContinue
  throw "The private ComfyUI engine did not start. Diagnostics: $comfyErrorLog"
}

Write-CoreStatus "Starting the local Shadowframe service..."
if (Test-Path -LiteralPath $accessKeyPath) {
  $accessKey = (Get-Content -Raw -LiteralPath $accessKeyPath).Trim()
} else {
  $tokenBytes = New-Object byte[] 32
  $random = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $random.GetBytes($tokenBytes)
  $random.Dispose()
  $accessKey = [Convert]::ToBase64String($tokenBytes).TrimEnd("=").Replace("+", "-").Replace("/", "_")
  Set-Content -LiteralPath $accessKeyPath -Value $accessKey -Encoding ASCII -NoNewline
}

$previousToken = $env:SHADOWFRAME_BRIDGE_TOKEN
$previousOrigins = $env:SHADOWFRAME_ALLOWED_ORIGINS
$previousComfy = $env:COMFYUI_URL
$previousPort = $env:PORT
$env:SHADOWFRAME_BRIDGE_TOKEN = $accessKey
$env:SHADOWFRAME_ALLOWED_ORIGINS = "https://shadowframe.tech,https://www.shadowframe.tech,http://shadowframe.tech,http://www.shadowframe.tech,http://127.0.0.1:$bridgePort"
$env:COMFYUI_URL = "http://127.0.0.1:$comfyPort"
$env:PORT = "$bridgePort"
try {
  $bridgeProcess = Start-Process -FilePath $nodePath -ArgumentList @($bridgeEntry, "start") -WorkingDirectory $bridgeRoot -WindowStyle Hidden -RedirectStandardOutput $serverLog -RedirectStandardError $serverErrorLog -PassThru
} finally {
  $env:SHADOWFRAME_BRIDGE_TOKEN = $previousToken
  $env:SHADOWFRAME_ALLOWED_ORIGINS = $previousOrigins
  $env:COMFYUI_URL = $previousComfy
  $env:PORT = $previousPort
}

$bridgeReady = $false
for ($attempt = 0; $attempt -lt 80; $attempt += 1) {
  Start-Sleep -Milliseconds 500
  if ($bridgeProcess.HasExited) { break }
  try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:$bridgePort/" -UseBasicParsing -TimeoutSec 2
    if ($response.StatusCode -eq 200) { $bridgeReady = $true; break }
  } catch {}
}
if (!$bridgeReady) {
  Stop-Process -Id $bridgeProcess.Id -Force -ErrorAction SilentlyContinue
  Stop-Process -Id $comfyProcess.Id -Force -ErrorAction SilentlyContinue
  throw "The local Shadowframe service did not start. Diagnostics: $serverErrorLog"
}

$bridgeListener = Get-NetTCPConnection -State Listen -LocalPort $bridgePort -ErrorAction SilentlyContinue | Select-Object -First 1
$bridgeListenerProcessId = if ($bridgeListener) { $bridgeListener.OwningProcess } else { $bridgeProcess.Id }
$bridgeAddress = "http://127.0.0.1:$bridgePort"

[pscustomobject]@{
  mode = "core-local"
  coreRoot = $coreRoot
  dataRoot = $dataRoot
  outputRoot = $outputRoot
  comfyProcessId = $comfyProcess.Id
  bridgeProcessId = $bridgeProcess.Id
  bridgeListenerProcessId = $bridgeListenerProcessId
  bridgeAddress = $bridgeAddress
  startedAt = (Get-Date).ToString("o")
} | ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding UTF8

@"
Shadowframe Core Local Access

Bridge address: $bridgeAddress
Private access key: $accessKey

This address is available only on this PC. Friend access is added separately.
"@ | Set-Content -LiteralPath $friendAccessPath -Encoding UTF8

Write-CoreStatus "Private runtime ready. Opening Shadowframe..."
