param(
  [switch]$SkipCoreBuild,
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

if (Test-Path -LiteralPath $output) { Remove-Item -LiteralPath $output -Recurse -Force }
New-Item -ItemType Directory -Path $output -Force | Out-Null

Write-Host "Building the Shadowframe Setup application..."
$project = Join-Path $PSScriptRoot "Shadowframe.Installer\Shadowframe.Installer.csproj"
$publish = Join-Path $releaseRoot "installer-publish"
if (Test-Path -LiteralPath $publish) { Remove-Item -LiteralPath $publish -Recurse -Force }
dotnet publish $project -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o $publish
if ($LASTEXITCODE -ne 0) { throw "Shadowframe Setup could not be built." }
Copy-Item -LiteralPath (Join-Path $publish "Shadowframe Setup.exe") -Destination (Join-Path $output "Shadowframe Setup.exe") -Force

Write-Host "Packing the verified Shadowframe Core payload..."
$payload = Join-Path $output "Shadowframe-Core.tar"
$temporaryPayload = Join-Path $env:TEMP "Shadowframe-Core-$([guid]::NewGuid().ToString('N')).tar"
try {
  & tar.exe -cf $temporaryPayload -C $coreRoot .
  if ($LASTEXITCODE -ne 0) { throw "The Core payload archive could not be created." }
  Move-Item -LiteralPath $temporaryPayload -Destination $payload -Force
} finally {
  Remove-Item -LiteralPath $temporaryPayload -Force -ErrorAction SilentlyContinue
}

$files = Get-ChildItem -LiteralPath $coreRoot -File -Recurse
$bytes = ($files | Measure-Object Length -Sum).Sum
$hash = (Get-FileHash -LiteralPath $payload -Algorithm SHA256).Hash
$manifest = [ordered]@{
  version = "0.3.0"
  payloadFile = "Shadowframe-Core.tar"
  sha256 = $hash
  uncompressedBytes = $bytes
  fileCount = $files.Count
}
$manifest | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $output "Shadowframe-Package.json") -Encoding UTF8
$setupHash = (Get-FileHash -LiteralPath (Join-Path $output "Shadowframe Setup.exe") -Algorithm SHA256).Hash
$manifestHash = (Get-FileHash -LiteralPath (Join-Path $output "Shadowframe-Package.json") -Algorithm SHA256).Hash
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

Run Shadowframe Setup.exe. Models and LoRAs are installed separately.

Silent install:
  "Shadowframe Setup.exe" /SILENT

Custom folder:
  "Shadowframe Setup.exe" /SILENT /INSTALLDIR="D:\Apps\Shadowframe AI"
"@ | Set-Content -LiteralPath (Join-Path $output "README.txt") -Encoding UTF8

Write-Host "Installer payload SHA-256: $hash"
Write-Host "Shadowframe Phase 2 installer created at: $output" -ForegroundColor Green
