param(
  [switch]$SkipCoreBuild,
  [switch]$ReuseExistingPayload,
  [string]$OutputDirectory = ""
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$releaseRoot = Join-Path $projectRoot "release"
$coreRoot = Join-Path $releaseRoot "Shadowframe-Core"
if (!$OutputDirectory) { $OutputDirectory = Join-Path $releaseRoot "Shadowframe-Installer" }
$output = [IO.Path]::GetFullPath($OutputDirectory).TrimEnd('\')
$allowedRoot = [IO.Path]::GetFullPath($releaseRoot).TrimEnd('\')
if (!$output.StartsWith($allowedRoot + '\', [StringComparison]::OrdinalIgnoreCase)) {
  throw "The installer output must stay inside $allowedRoot"
}

if (!$SkipCoreBuild) {
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "Build-Shadowframe-Core.ps1")
  if ($LASTEXITCODE -ne 0) { throw "The Core package could not be built." }
}
if (!(Test-Path -LiteralPath (Join-Path $coreRoot "Shadowframe.exe"))) {
  throw "The verified Core staging package is missing. Build Phase 1 first."
}

function New-TarPayload([string]$SourceDirectory, [string]$ArchivePath) {
  $tar = Get-Command tar.exe -ErrorAction SilentlyContinue
  if ($tar) {
    & $tar.Source -cf $ArchivePath -C $SourceDirectory .
    if ($LASTEXITCODE -ne 0) { throw "The Core payload archive could not be created." }
    return
  }

  $pwsh = Get-Command pwsh.exe -ErrorAction SilentlyContinue
  if ($pwsh) {
    $helper = Join-Path $env:TEMP "Shadowframe-NewTar-$([guid]::NewGuid().ToString('N')).ps1"
    try {
      @'
param(
  [string]$SourceDirectory,
  [string]$ArchivePath
)
$ErrorActionPreference = "Stop"
[System.Formats.Tar.TarFile]::CreateFromDirectory($SourceDirectory, $ArchivePath, $false)
'@ | Set-Content -LiteralPath $helper -Encoding UTF8
      & $pwsh.Source -NoProfile -File $helper -SourceDirectory $SourceDirectory -ArchivePath $ArchivePath
      if ($LASTEXITCODE -ne 0) { throw "The managed Core payload archive could not be created." }
      return
    } finally {
      Remove-Item -LiteralPath $helper -Force -ErrorAction SilentlyContinue
    }
  }

  throw "tar.exe was not found, and the managed Core payload archive could not be created."
}

function Get-Sha256([string]$Path) {
  try {
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256 -ErrorAction Stop).Hash
  } catch {
    # Windows PowerShell environments launched from shells with customized
    # module paths can occasionally fail to expose Get-FileHash. The .NET
    # fallback keeps release builds deterministic.
  }

  $stream = [IO.File]::OpenRead($Path)
  try {
    $sha = [Security.Cryptography.SHA256]::Create()
    try {
      return ([BitConverter]::ToString($sha.ComputeHash($stream)) -replace "-", "")
    } finally {
      $sha.Dispose()
    }
  } finally {
    $stream.Dispose()
  }
}

$payload = Join-Path $output "Shadowframe-Core.tar"
if (Test-Path -LiteralPath $output) {
  if ($ReuseExistingPayload -and (Test-Path -LiteralPath $payload)) {
    Get-ChildItem -LiteralPath $output -Force |
      Where-Object { !$_.Name.Equals("Shadowframe-Core.tar", [StringComparison]::OrdinalIgnoreCase) } |
      Remove-Item -Recurse -Force
  } else {
    Remove-Item -LiteralPath $output -Recurse -Force
  }
}
New-Item -ItemType Directory -Path $output -Force | Out-Null

Write-Host "Building the Shadowframe Setup application..."
$project = Join-Path $PSScriptRoot "Shadowframe.Installer\Shadowframe.Installer.csproj"
$publish = Join-Path $releaseRoot "installer-publish"
if (Test-Path -LiteralPath $publish) { Remove-Item -LiteralPath $publish -Recurse -Force }
dotnet publish $project -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o $publish
if ($LASTEXITCODE -ne 0) { throw "Shadowframe Setup could not be built." }
Copy-Item -LiteralPath (Join-Path $publish "Shadowframe Setup.exe") -Destination (Join-Path $output "Shadowframe Setup.exe") -Force

Write-Host "Packing the verified Shadowframe Core payload..."
if (!($ReuseExistingPayload -and (Test-Path -LiteralPath $payload))) {
  $temporaryPayload = Join-Path $output "Shadowframe-Core.tar.$([guid]::NewGuid().ToString('N')).partial"
  try {
    New-TarPayload $coreRoot $temporaryPayload
    Move-Item -LiteralPath $temporaryPayload -Destination $payload -Force
  } finally {
    Remove-Item -LiteralPath $temporaryPayload -Force -ErrorAction SilentlyContinue
  }
} else {
  Write-Host "Reusing the existing Shadowframe Core payload..."
}

$files = Get-ChildItem -LiteralPath $coreRoot -File -Recurse
$bytes = ($files | Measure-Object Length -Sum).Sum
$hash = Get-Sha256 $payload
$manifest = [ordered]@{
  version = "0.3.2"
  payloadFile = "Shadowframe-Core.tar"
  sha256 = $hash
  uncompressedBytes = $bytes
  fileCount = $files.Count
}
$manifest | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $output "Shadowframe-Package.json") -Encoding UTF8

function Copy-SamplePrompts([string]$SourceRoot, [string]$DestinationRoot) {
  if (!(Test-Path -LiteralPath $SourceRoot)) { return }
  if (Test-Path -LiteralPath $DestinationRoot) { Remove-Item -LiteralPath $DestinationRoot -Recurse -Force }
  New-Item -ItemType Directory -Path $DestinationRoot -Force | Out-Null

  $modelSets = @(
    @{ Source = "redcraft-prompts"; Name = "RedCraft" },
    @{ Source = "moody-prompts"; Name = "Moody Real" },
    @{ Source = "ltx-prompts"; Name = "LTX Video" }
  )
  $nsfwPattern = "(?i)\b(nude|topless|breast|nipple|pussy|labia|areola|sex|bondage|slave|see-through|transparent clothes|deepthroat|porn|erotic|explicit|genital|mons pubis)\b"
  foreach ($set in $modelSets) {
    $source = Join-Path $SourceRoot $set.Source
    if (!(Test-Path -LiteralPath $source)) { continue }
    foreach ($file in Get-ChildItem -LiteralPath $source -File -Filter "*.txt") {
      if ($file.Name.Equals("README.txt", [StringComparison]::OrdinalIgnoreCase)) { continue }
      $text = Get-Content -Raw -LiteralPath $file.FullName
      $category = if ($text -match $nsfwPattern -or $file.Name -match $nsfwPattern) { "NSFW" } else { "SFW" }
      $targetFolder = Join-Path (Join-Path $DestinationRoot $category) $set.Name
      New-Item -ItemType Directory -Path $targetFolder -Force | Out-Null
      Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $targetFolder $file.Name) -Force
    }
  }

  foreach ($category in @("SFW", "NSFW")) {
    $readme = Join-Path (Join-Path $DestinationRoot $category) "README.txt"
    New-Item -ItemType Directory -Path (Split-Path -Parent $readme) -Force | Out-Null
    @"
Shadowframe $category Sample Prompts

Open a model-set folder, copy a prompt, and paste it into Shadowframe.

Folders are separated so new users can quickly choose safer showcase prompts or adult-oriented examples.
"@ | Set-Content -LiteralPath $readme -Encoding UTF8
  }
}

Copy-SamplePrompts (Join-Path $projectRoot "samples") (Join-Path $output "Sample Prompts")

$setupHash = Get-Sha256 (Join-Path $output "Shadowframe Setup.exe")
$manifestHash = Get-Sha256 (Join-Path $output "Shadowframe-Package.json")
@(
  "$setupHash  Shadowframe Setup.exe",
  "$hash  Shadowframe-Core.tar",
  "$manifestHash  Shadowframe-Package.json"
) | Set-Content -LiteralPath (Join-Path $output "SHA256SUMS.txt") -Encoding ASCII

@"
Shadowframe AI — Windows installer

Keep these three files together:
  Shadowframe Setup.exe
  Shadowframe-Core.tar
  Shadowframe-Package.json

SHA256SUMS.txt contains optional download-integrity checksums.

Run Shadowframe Setup.exe. If Anima, Wan, or PhotoReal model-pack installers are next to this installer package, Core Setup can run them automatically.
Sample Prompts contains SFW and NSFW starter prompt folders that users can copy into Shadowframe.

Silent install:
  "Shadowframe Setup.exe" /SILENT

Custom folder:
  "Shadowframe Setup.exe" /SILENT /INSTALLDIR="D:\Apps\Shadowframe AI" /DATAROOT="X:\Shadowframe" /OUTPUTROOT="D:\Shadowframe Output"

Skip automatic model packs:
  "Shadowframe Setup.exe" /SILENT /NOMODELPACKS
"@ | Set-Content -LiteralPath (Join-Path $output "README.txt") -Encoding UTF8

Write-Host "Installer payload SHA-256: $hash"
Write-Host "Shadowframe Phase 2 installer created at: $output" -ForegroundColor Green
