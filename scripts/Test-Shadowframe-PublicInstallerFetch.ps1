param(
  [string]$InstallerDirectory = "",
  [string]$PackFilter = "anima-public"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
if (!$InstallerDirectory) { $InstallerDirectory = Join-Path $projectRoot "release\Shadowframe-Installer-Public-0.3.6" }
$setup = Join-Path $InstallerDirectory "Shadowframe Setup.exe"
if (!(Test-Path -LiteralPath $setup -PathType Leaf)) {
  throw "Public installer is missing: $setup"
}

$target = Join-Path $env:TEMP ("Shadowframe-PublicE2E-" + [guid]::NewGuid().ToString("N"))
$dataRoot = Join-Path $env:TEMP ("Shadowframe-PublicData-" + [guid]::NewGuid().ToString("N"))
$outputRoot = Join-Path $env:TEMP ("Shadowframe-PublicOutput-" + [guid]::NewGuid().ToString("N"))

function Invoke-Installer([string]$Arguments, [string]$Stage) {
  $process = Start-Process -FilePath $setup -ArgumentList $Arguments -Wait -PassThru
  if ($process.ExitCode -ne 0) {
    $log = Join-Path $env:TEMP "Shadowframe-Setup.log"
    if (Test-Path -LiteralPath $log) { Get-Content -LiteralPath $log -Tail 120 | Write-Host }
    throw "$Stage failed with exit code $($process.ExitCode)."
  }
}

function Invoke-Executable([string]$Executable, [string]$Arguments, [string]$Stage) {
  $process = Start-Process -FilePath $Executable -ArgumentList $Arguments -Wait -PassThru
  if ($process.ExitCode -ne 0) {
    $log = Join-Path $env:TEMP "Shadowframe-ModelPack-Setup.log"
    if (Test-Path -LiteralPath $log) { Get-Content -LiteralPath $log -Tail 120 | Write-Host }
    throw "$Stage failed with exit code $($process.ExitCode)."
  }
}

$previousFilter = $env:SHADOWFRAME_PUBLIC_PACK_FILTER
$env:SHADOWFRAME_PUBLIC_PACK_FILTER = $PackFilter

try {
  Write-Host "Installing public core with Hugging Face pack filter '$PackFilter'..."
  Invoke-Installer "/SILENT /NOSHORTCUTS /NODESKTOP /INSTALLDIR=`"$target`" /DATAROOT=`"$dataRoot`" /OUTPUTROOT=`"$outputRoot`"" "Public install"

  $receipt = Join-Path $dataRoot "State\ModelPacks\anima-models-public.json"
  $model = Join-Path $dataRoot "models\diffusion_models\anima-aesthetic-v1.1.safetensors"
  if (!(Test-Path -LiteralPath $receipt)) { throw "Public Anima receipt missing: $receipt" }
  if (!(Test-Path -LiteralPath $model)) { throw "Public Anima model missing: $model" }

  $packUninstaller = Join-Path $dataRoot "PackInstallers\anima-models-public\Model Pack Uninstaller.exe"
  if (Test-Path -LiteralPath $packUninstaller) {
    Write-Host "Uninstalling fetched public model pack..."
    Invoke-Executable $packUninstaller "/UNINSTALLPACK /SILENT /DATAROOT=`"$dataRoot`"" "Public pack uninstall"
  }

  Write-Host "Uninstalling public core..."
  Invoke-Installer "/UNINSTALL /SILENT /NOSHORTCUTS /INSTALLDIR=`"$target`"" "Public core uninstall"
  Write-Host "Public installer Hugging Face fetch test passed." -ForegroundColor Green
}
finally {
  $env:SHADOWFRAME_PUBLIC_PACK_FILTER = $previousFilter
  foreach ($path in @($target, $dataRoot, $outputRoot)) {
    if (Test-Path -LiteralPath $path) {
      try { Remove-Item -LiteralPath $path -Recurse -Force } catch {}
    }
  }
}

