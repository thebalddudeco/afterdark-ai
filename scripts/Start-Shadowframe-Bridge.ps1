$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$stateDirectory = Join-Path $projectRoot ".shadowframe"
$statePath = Join-Path $stateDirectory "processes.json"
$serverLog = Join-Path $stateDirectory "server.log"
$serverErrorLog = Join-Path $stateDirectory "server-error.log"
$tunnelLog = Join-Path $stateDirectory "tunnel.log"
$tunnelErrorLog = Join-Path $stateDirectory "tunnel-error.log"
$bridgePort = 3001

New-Item -ItemType Directory -Path $stateDirectory -Force | Out-Null

function Find-Executable([string]$commandName, [string[]]$fallbacks) {
  $command = Get-Command $commandName -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }
  foreach ($candidate in $fallbacks) {
    if ($candidate -and (Test-Path -LiteralPath $candidate)) { return $candidate }
  }
  return $null
}

function Stop-RecordedProcesses {
  if (!(Test-Path -LiteralPath $statePath)) { return }
  try {
    $state = Get-Content -Raw -LiteralPath $statePath | ConvertFrom-Json
    foreach ($processId in @($state.serverProcessId, $state.serverListenerProcessId, $state.tunnelProcessId)) {
      if ($processId) {
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
        if ($process) { Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue }
      }
    }
  } catch {
    Write-Warning "The previous bridge state could not be read."
  }
  Remove-Item -LiteralPath $statePath -Force -ErrorAction SilentlyContinue
}

function Stop-ProjectBridgeListener {
  $listeners = Get-NetTCPConnection -State Listen -LocalPort $bridgePort -ErrorAction SilentlyContinue
  foreach ($listener in $listeners) {
    $details = Get-CimInstance Win32_Process -Filter "ProcessId = $($listener.OwningProcess)" -ErrorAction SilentlyContinue
    if ($details -and $details.CommandLine -and $details.CommandLine.Contains($projectRoot)) {
      Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue
    }
  }
}

$runtimeRoot = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies"
$nodePath = Find-Executable "node.exe" @((Join-Path $runtimeRoot "node\bin\node.exe"))
$pnpmPath = Find-Executable "pnpm.cmd" @((Join-Path $runtimeRoot "bin\fallback\pnpm.cmd"))
$cloudflaredPath = Find-Executable "cloudflared.exe" @(
  (Join-Path $env:ProgramFiles "cloudflared\cloudflared.exe"),
  (Join-Path ${env:ProgramFiles(x86)} "cloudflared\cloudflared.exe"),
  (Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Links\cloudflared.exe")
)

if (!$nodePath -or !$pnpmPath) {
  throw "Node.js and pnpm are required. Install Node.js 22, then run: corepack enable"
}
if (!$cloudflaredPath) {
  throw "Cloudflare Tunnel is required. Install it with: winget install --id Cloudflare.cloudflared"
}

Stop-RecordedProcesses
Stop-ProjectBridgeListener

$nodeDirectory = Split-Path -Parent $nodePath
$pnpmDirectory = Split-Path -Parent $pnpmPath
$runtimePath = "$nodeDirectory;$pnpmDirectory;$env:PATH"
$previousPath = $env:PATH
$env:PATH = $runtimePath

Push-Location $projectRoot
try {
  if (!(Test-Path -LiteralPath (Join-Path $projectRoot "node_modules"))) {
    & $pnpmPath install --frozen-lockfile
    if ($LASTEXITCODE -ne 0) { throw "Dependency installation failed." }
  }
  & $pnpmPath build
  if ($LASTEXITCODE -ne 0) { throw "Shadowframe Bridge build failed." }
} finally {
  Pop-Location
  $env:PATH = $previousPath
}

$tokenBytes = New-Object byte[] 32
$random = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$random.GetBytes($tokenBytes)
$random.Dispose()
$accessKey = [Convert]::ToBase64String($tokenBytes).TrimEnd("=").Replace("+", "-").Replace("/", "_")

foreach ($log in @($serverLog, $serverErrorLog, $tunnelLog, $tunnelErrorLog)) {
  Remove-Item -LiteralPath $log -Force -ErrorAction SilentlyContinue
}

$previousToken = $env:SHADOWFRAME_BRIDGE_TOKEN
$previousOrigins = $env:SHADOWFRAME_ALLOWED_ORIGINS
$previousComfy = $env:COMFYUI_URL
$previousPort = $env:PORT
$previousRuntimePath = $env:PATH
$env:SHADOWFRAME_BRIDGE_TOKEN = $accessKey
$env:SHADOWFRAME_ALLOWED_ORIGINS = "https://shadowframe.tech,https://www.shadowframe.tech,http://shadowframe.tech,http://www.shadowframe.tech"
$env:COMFYUI_URL = "http://127.0.0.1:8188"
$env:PORT = "$bridgePort"
$env:PATH = $runtimePath

try {
  $serverProcess = Start-Process -FilePath $pnpmPath -ArgumentList @("start") -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput $serverLog -RedirectStandardError $serverErrorLog -PassThru
} finally {
  $env:SHADOWFRAME_BRIDGE_TOKEN = $previousToken
  $env:SHADOWFRAME_ALLOWED_ORIGINS = $previousOrigins
  $env:COMFYUI_URL = $previousComfy
  $env:PORT = $previousPort
  $env:PATH = $previousRuntimePath
}

$serverReady = $false
for ($attempt = 0; $attempt -lt 40; $attempt += 1) {
  Start-Sleep -Milliseconds 500
  try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:$bridgePort/" -UseBasicParsing -TimeoutSec 2
    if ($response.StatusCode -eq 200) { $serverReady = $true; break }
  } catch {}
}
if (!$serverReady) {
  Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
  throw "The local bridge did not start. Review $serverErrorLog"
}

$serverListener = Get-NetTCPConnection -State Listen -LocalPort $bridgePort -ErrorAction SilentlyContinue | Select-Object -First 1
$serverListenerProcessId = if ($serverListener) { $serverListener.OwningProcess } else { $serverProcess.Id }

$tunnelProcess = Start-Process -FilePath $cloudflaredPath -ArgumentList @("tunnel", "--url", "http://127.0.0.1:$bridgePort", "--no-autoupdate") -WindowStyle Hidden -RedirectStandardOutput $tunnelLog -RedirectStandardError $tunnelErrorLog -PassThru

$tunnelUrl = ""
for ($attempt = 0; $attempt -lt 60; $attempt += 1) {
  Start-Sleep -Milliseconds 500
  $logText = ((Get-Content -Raw -LiteralPath $tunnelLog -ErrorAction SilentlyContinue) + "`n" + (Get-Content -Raw -LiteralPath $tunnelErrorLog -ErrorAction SilentlyContinue))
  $match = [regex]::Match($logText, "https://[a-z0-9-]+\.trycloudflare\.com")
  if ($match.Success) { $tunnelUrl = $match.Value; break }
  if ($tunnelProcess.HasExited) { break }
}

if (!$tunnelUrl) {
  Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
  Stop-Process -Id $tunnelProcess.Id -Force -ErrorAction SilentlyContinue
  throw "The secure tunnel did not start. Review $tunnelErrorLog"
}

[pscustomobject]@{
  serverProcessId = $serverProcess.Id
  serverListenerProcessId = $serverListenerProcessId
  tunnelProcessId = $tunnelProcess.Id
  tunnelUrl = $tunnelUrl
  startedAt = (Get-Date).ToString("o")
} | ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding UTF8

$siteBaseUrl = "https://shadowframe.tech/"
try {
  Invoke-WebRequest -Uri $siteBaseUrl -Method Head -UseBasicParsing -TimeoutSec 5 | Out-Null
} catch {
  $siteBaseUrl = "http://shadowframe.tech/"
}
$pairingUrl = "$siteBaseUrl#bridge=$([uri]::EscapeDataString($tunnelUrl))&token=$([uri]::EscapeDataString($accessKey))"
Start-Process $pairingUrl

Write-Host ""
Write-Host "Shadowframe Bridge is running." -ForegroundColor Green
Write-Host "Tunnel: $tunnelUrl"
Write-Host "Your browser has been paired automatically."
Write-Host "Keep ComfyUI running while you generate."
Write-Host ""
Write-Host "Use Stop Shadowframe Bridge.cmd when you are finished."
