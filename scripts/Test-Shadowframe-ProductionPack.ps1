param(
  [Parameter(Mandatory = $true)]
  [string]$PackDirectory
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$packRoot = if ([IO.Path]::IsPathRooted($PackDirectory)) { [IO.Path]::GetFullPath($PackDirectory) } else { [IO.Path]::GetFullPath((Join-Path $projectRoot $PackDirectory)) }
$manifest = Get-Content -LiteralPath (Join-Path $packRoot "Shadowframe-ModelPack.json") -Raw | ConvertFrom-Json
$setup = Get-ChildItem -LiteralPath $packRoot -Filter "Install Shadowframe * Models.exe" -File | Select-Object -First 1
if (!$setup) { throw "The model-pack Setup application is missing from $packRoot" }

$testParent = [IO.Path]::GetFullPath("D:\Shadowframe-Install-Tests").TrimEnd('\')
$testRoot = Join-Path $testParent "$($manifest.packId)-$([guid]::NewGuid().ToString('N'))"
$resolvedTest = [IO.Path]::GetFullPath($testRoot).TrimEnd('\')
if (!$resolvedTest.StartsWith($testParent + '\', [StringComparison]::OrdinalIgnoreCase)) { throw "Unsafe production test path." }
New-Item -ItemType Directory -Path $resolvedTest -Force | Out-Null

function Invoke-PackSetup([string[]]$Arguments) {
  $process = Start-Process -FilePath $setup.FullName -ArgumentList $Arguments -Wait -PassThru
  if ($process.ExitCode -ne 0) { throw "Model-pack Setup failed with exit code $($process.ExitCode)." }
}

try {
  Write-Host "Installing $($manifest.displayName) into an isolated data folder..."
  Invoke-PackSetup @("/SILENT", "/ALLOWUNSUPPORTED", "/DATAROOT=`"$resolvedTest`"")
  foreach ($file in $manifest.files) {
    $installed = Join-Path $resolvedTest ("models\" + $file.relativePath.Replace('/', '\'))
    if (!(Test-Path -LiteralPath $installed)) { throw "Missing installed model: $installed" }
    if ((Get-Item -LiteralPath $installed).Length -ne $file.bytes) { throw "Installed size mismatch: $installed" }
  }

  Write-Host "Uninstalling the isolated production pack..."
  Invoke-PackSetup @("/UNINSTALLPACK", "/SILENT", "/DATAROOT=`"$resolvedTest`"")
  foreach ($file in $manifest.files) {
    $installed = Join-Path $resolvedTest ("models\" + $file.relativePath.Replace('/', '\'))
    if (Test-Path -LiteralPath $installed) { throw "Uninstall left a model behind: $installed" }
  }
  Write-Host "$($manifest.displayName) production install/uninstall test passed." -ForegroundColor Green
}
finally {
  if (Test-Path -LiteralPath $resolvedTest) { Remove-Item -LiteralPath $resolvedTest -Recurse -Force }
}
