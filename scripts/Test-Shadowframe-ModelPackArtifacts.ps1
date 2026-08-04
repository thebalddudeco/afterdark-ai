param(
  [string[]]$PackDirectories = @(
    "release\Shadowframe-Anima-Models",
    "release\Shadowframe-Wan-Models",
    "release\Shadowframe-PhotoReal-Models"
  )
)

$ErrorActionPreference = "Stop"

function Get-Sha256([string]$Path) {
  $stream = [IO.File]::OpenRead($Path)
  try {
    $sha = [Security.Cryptography.SHA256]::Create()
    try { return [BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-', '') }
    finally { $sha.Dispose() }
  } finally { $stream.Dispose() }
}

$projectRoot = Split-Path -Parent $PSScriptRoot
foreach ($directory in $PackDirectories) {
  $root = if ([IO.Path]::IsPathRooted($directory)) { [IO.Path]::GetFullPath($directory) } else { [IO.Path]::GetFullPath((Join-Path $projectRoot $directory)) }
  $manifestPath = Join-Path $root "Shadowframe-ModelPack.json"
  if (!(Test-Path -LiteralPath $manifestPath)) { throw "Missing model-pack manifest: $manifestPath" }
  $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
  $payload = Join-Path $root $manifest.payloadFile
  if (!(Test-Path -LiteralPath $payload)) { throw "Missing model-pack payload: $payload" }

  Write-Host "Verifying $($manifest.displayName)..."
  $payloadHash = Get-Sha256 $payload
  if ($payloadHash -ne $manifest.sha256) { throw "Payload hash mismatch: $payload" }
  if ($manifest.files.Count -ne $manifest.fileCount) { throw "Manifest file-count mismatch: $manifestPath" }
  if (($manifest.files | Measure-Object bytes -Sum).Sum -ne $manifest.installedBytes) { throw "Manifest byte-count mismatch: $manifestPath" }

  $archivePaths = @(& tar.exe -tf $payload | ForEach-Object { $_.Replace('\', '/').TrimStart('.', '/') } | Where-Object { $_ -and !($_.EndsWith('/')) })
  if ($LASTEXITCODE -ne 0) { throw "The payload archive could not be listed: $payload" }
  $expectedPaths = @($manifest.files.relativePath | Sort-Object)
  $actualPaths = @($archivePaths | Sort-Object)
  if ($expectedPaths.Count -ne $actualPaths.Count -or (Compare-Object $expectedPaths $actualPaths)) {
    throw "Archive contents do not match the manifest: $payload"
  }
  Write-Host "$($manifest.displayName) artifact passed." -ForegroundColor Green
}
