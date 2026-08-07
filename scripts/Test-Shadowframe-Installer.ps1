param(
  [string]$InstallerDirectory = "",
  [switch]$NoModelPacks
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
if (!$InstallerDirectory) { $InstallerDirectory = Join-Path $projectRoot "release\Shadowframe-Installer" }
$setup = Join-Path $InstallerDirectory "Shadowframe Setup.exe"
$payload = Join-Path $InstallerDirectory "Shadowframe-Core.tar"
$manifest = Join-Path $InstallerDirectory "Shadowframe-Package.json"
foreach ($path in @($setup, $payload, $manifest)) {
  if (!(Test-Path -LiteralPath $path -PathType Leaf)) { throw "Installer file is missing: $path" }
}

$uninstallKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\ShadowframeAI"
if (Test-Path -LiteralPath $uninstallKey) {
  throw "A real Shadowframe installation is registered. Uninstall it before running the automated installer test."
}

$target = Join-Path $env:TEMP "Shadowframe-Installer-Test-$([guid]::NewGuid().ToString('N'))"
$resolvedTarget = [IO.Path]::GetFullPath($target)
$resolvedTemp = [IO.Path]::GetFullPath($env:TEMP).TrimEnd('\') + '\'
if (!$resolvedTarget.StartsWith($resolvedTemp, [StringComparison]::OrdinalIgnoreCase)) {
  throw "The disposable installer test target is unsafe."
}

$dataRoot = Join-Path $env:LOCALAPPDATA "Shadowframe"
$dataFilesBefore = if (Test-Path -LiteralPath $dataRoot) { (Get-ChildItem -LiteralPath $dataRoot -File -Recurse -ErrorAction SilentlyContinue).Count } else { 0 }
$commonArguments = "/SILENT /NOSHORTCUTS /NODESKTOP /INSTALLDIR=`"$resolvedTarget`""
if ($NoModelPacks) { $commonArguments += " /NOMODELPACKS" }

function Invoke-Setup([string]$arguments, [string]$stage) {
  $process = Start-Process -FilePath $setup -ArgumentList $arguments -Wait -PassThru
  if ($process.ExitCode -ne 0) {
    $log = Join-Path $env:TEMP "Shadowframe-Setup.log"
    if (Test-Path -LiteralPath $log) { Get-Content -LiteralPath $log -Tail 80 | Write-Host }
    throw "$stage failed with exit code $($process.ExitCode)."
  }
}

try {
  Write-Host "Testing clean installation..."
  Invoke-Setup $commonArguments "Clean installation"
  foreach ($relative in @("Shadowframe.exe", "runtime-manifest.json", "install-receipt.json", "Shadowframe Uninstaller.exe")) {
    if (!(Test-Path -LiteralPath (Join-Path $resolvedTarget $relative) -PathType Leaf)) { throw "Installed file is missing: $relative" }
  }

  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "Test-Shadowframe-Core.ps1") -CoreRoot $resolvedTarget
  if ($LASTEXITCODE -ne 0) { throw "The installed Core runtime test failed." }

  $installedBefore = (Get-Content -Raw -LiteralPath (Join-Path $resolvedTarget "install-receipt.json") | ConvertFrom-Json).installedAt
  Write-Host "Testing repair and update replacement..."
  Invoke-Setup $commonArguments "Repair installation"
  $installedAfter = (Get-Content -Raw -LiteralPath (Join-Path $resolvedTarget "install-receipt.json") | ConvertFrom-Json).installedAt
  if ($installedBefore -eq $installedAfter) { throw "The repair receipt was not refreshed." }

  Write-Host "Testing uninstall with user data preservation..."
  Invoke-Setup "/UNINSTALL /SILENT /NOSHORTCUTS /INSTALLDIR=`"$resolvedTarget`"" "Uninstall"
  if (Test-Path -LiteralPath $resolvedTarget) { throw "The disposable installation directory remains after uninstall." }
  if (Test-Path -LiteralPath $uninstallKey) { throw "The uninstall registration remains after uninstall." }
  $dataFilesAfter = if (Test-Path -LiteralPath $dataRoot) { (Get-ChildItem -LiteralPath $dataRoot -File -Recurse -ErrorAction SilentlyContinue).Count } else { 0 }
  if ($dataFilesBefore -ne $dataFilesAfter) { throw "Application data changed during the preservation test." }

  Write-Host "Shadowframe Phase 2 installer test passed." -ForegroundColor Green
} finally {
  if (Test-Path -LiteralPath $resolvedTarget) {
    try { Invoke-Setup "/UNINSTALL /SILENT /NOSHORTCUTS /INSTALLDIR=`"$resolvedTarget`"" "Test cleanup" } catch { Write-Warning $_ }
  }
}
