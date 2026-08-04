param(
  [string]$OutputDirectory = "",
  [switch]$CopyFiles
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$releaseRoot = Join-Path $projectRoot "release"
if (!$OutputDirectory) { $OutputDirectory = Join-Path $releaseRoot "Shadowframe-Beta-Handoff" }

$coreSource = Join-Path $releaseRoot "Shadowframe-Installer"
$animaSource = Join-Path $releaseRoot "Shadowframe-Anima-Models"
$wanSource = Join-Path $releaseRoot "Shadowframe-Wan-Models"

foreach ($path in @($coreSource, $animaSource, $wanSource)) {
  if (!(Test-Path -LiteralPath $path -PathType Container)) {
    throw "Missing release source folder: $path"
  }
}

function New-CleanDirectory([string]$Path) {
  if (Test-Path -LiteralPath $Path) { Remove-Item -LiteralPath $Path -Recurse -Force }
  New-Item -ItemType Directory -Path $Path -Force | Out-Null
}

function Add-ReleaseFile([string]$Source, [string]$Destination) {
  if (!(Test-Path -LiteralPath $Source -PathType Leaf)) { throw "Missing release file: $Source" }
  New-Item -ItemType Directory -Path (Split-Path -Parent $Destination) -Force | Out-Null
  if (Test-Path -LiteralPath $Destination) { Remove-Item -LiteralPath $Destination -Force }
  if (!$CopyFiles -and ([IO.Path]::GetPathRoot($Source) -eq [IO.Path]::GetPathRoot($Destination))) {
    try {
      New-Item -ItemType HardLink -Path $Destination -Target $Source | Out-Null
      return
    } catch {
      Write-Warning "Hardlink failed for $Source. Falling back to copy."
    }
  }
  Copy-Item -LiteralPath $Source -Destination $Destination -Force
}

function Add-FolderFiles([string]$SourceFolder, [string]$DestinationFolder) {
  New-Item -ItemType Directory -Path $DestinationFolder -Force | Out-Null
  Get-ChildItem -LiteralPath $SourceFolder -File | ForEach-Object {
    Add-ReleaseFile $_.FullName (Join-Path $DestinationFolder $_.Name)
  }
}

function Write-TextFile([string]$Path, [string]$Text) {
  New-Item -ItemType Directory -Path (Split-Path -Parent $Path) -Force | Out-Null
  [IO.File]::WriteAllText($Path, ($Text.Trim() + "`r`n"), [Text.UTF8Encoding]::new($false))
}

function Write-CmdFile([string]$Path, [string]$Body) {
  Write-TextFile $Path $Body
}

function Get-RelativePathCompat([string]$BasePath, [string]$TargetPath) {
  $baseUri = [Uri](([IO.Path]::GetFullPath($BasePath).TrimEnd('\') + '\'))
  $targetUri = [Uri]([IO.Path]::GetFullPath($TargetPath))
  return [Uri]::UnescapeDataString($baseUri.MakeRelativeUri($targetUri).ToString()).Replace('/', '\')
}

function Get-Sha256([string]$Path) {
  $stream = [IO.File]::OpenRead($Path)
  try {
    $sha = [Security.Cryptography.SHA256]::Create()
    return [BitConverter]::ToString($sha.ComputeHash($stream)).Replace("-", "")
  } finally {
    if ($sha) { $sha.Dispose() }
    $stream.Dispose()
  }
}

$output = [IO.Path]::GetFullPath($OutputDirectory)
New-CleanDirectory $output

$coreTarget = Join-Path $output "01 Install Shadowframe Core"
$animaTarget = Join-Path $output "02 Install Anima Models"
$wanTarget = Join-Path $output "03 Install Wan Models"
$toolsTarget = Join-Path $output "Tools"

Add-FolderFiles $coreSource $coreTarget
Add-FolderFiles $animaSource $animaTarget
Add-FolderFiles $wanSource $wanTarget

New-Item -ItemType Directory -Path $toolsTarget -Force | Out-Null
Add-ReleaseFile (Join-Path $projectRoot "scripts\Verify-Shadowframe-Installation.ps1") (Join-Path $toolsTarget "Verify-Shadowframe-Installation.ps1")

Write-CmdFile (Join-Path $output "Verify Installation.cmd") @"
@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Tools\Verify-Shadowframe-Installation.ps1"
echo.
pause
"@

Write-CmdFile (Join-Path $output "Verify Installation - Full Hash Check.cmd") @"
@echo off
setlocal
echo This full hash check can take a long time because it reads every installed model file.
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Tools\Verify-Shadowframe-Installation.ps1" -FullHash
echo.
pause
"@

Write-TextFile (Join-Path $output "README - START HERE.txt") @"
Shadowframe AI Beta Install

Install in this exact order:

1. Open "01 Install Shadowframe Core" and run "Shadowframe Setup.exe".
2. Open "02 Install Anima Models" and run "Install Shadowframe Anima Models.exe".
3. Open "03 Install Wan Models" and run "Install Shadowframe Wan Models.exe".
4. Run "Verify Installation.cmd".
5. Launch Shadowframe AI from the Desktop or Start Menu.

Keep every file inside each numbered folder together. The EXE files need the TAR payload and manifest beside them.

Approximate package sizes:

- Core: 4.46 GiB payload plus setup EXE.
- Anima Models: 10.00 GiB payload plus setup EXE.
- Wan Models: 64.33 GiB payload plus setup EXE.

This beta package is for trusted testing. The model payloads are intentionally not stored in GitHub.
"@

Write-TextFile (Join-Path $output "SYSTEM REQUIREMENTS.txt") @"
Shadowframe AI System Requirements

Required:

- 64-bit Windows 10 version 2004 or newer, or Windows 11.
- NVIDIA GPU with current NVIDIA driver.
- Microsoft Edge WebView2 Runtime.
- Enough disk space for Core, selected model packs, and generation output.

Recommended:

- Install on a drive with at least 100 GiB free if using Wan video models.
- Close other ComfyUI instances before launching Shadowframe.
- Restart Windows after GPU driver changes.

Shadowframe stores mutable data in:

%LOCALAPPDATA%\Shadowframe

The application installs to:

%LOCALAPPDATA%\Programs\Shadowframe AI
"@

Write-TextFile (Join-Path $output "TROUBLESHOOTING.txt") @"
Shadowframe AI Troubleshooting

If Core setup fails:

- Confirm Windows is 64-bit and up to date.
- Install Microsoft Edge WebView2 Runtime.
- Confirm an NVIDIA GPU and driver are installed.
- Check free disk space.
- Review %TEMP%\Shadowframe-Setup.log.

If a model pack fails:

- Install Shadowframe Core first.
- Keep the model pack EXE, TAR file, manifest, README, notices, and checksums in the same folder.
- Check free disk space on the drive containing %LOCALAPPDATA%.
- Review %TEMP%\Shadowframe-ModelPack-Setup.log.

If Shadowframe opens but cannot generate:

- Run "Verify Installation.cmd".
- Make sure no other ComfyUI process is using the same private ports.
- Restart Shadowframe from the Desktop or Start Menu.
- Try a small txt-img generation first before video.

If the website asks for bridge access:

- Use the installed Shadowframe desktop launcher instead of opening shadowframe.tech manually.
- For friend access, the PC owner must provide the bridge address and private access key.
"@

Write-TextFile (Join-Path $output "KNOWN ISSUES.txt") @"
Shadowframe AI Beta Known Issues

- EXEs are not code-signed yet, so Windows SmartScreen may warn during installation.
- A true external clean-machine NVIDIA test is still pending.
- Real generation acceptance tests must still be run for txt-img, img-img, img-vid, and txt-vid on the beta target.
- The Anima model pack is private-use until public redistribution permission is confirmed for every included non-Wan model binary.
- Wan model installation is large and can take a long time because the payload is approximately 64.33 GiB.
- Lint currently warns about normal img tags in the web UI, but there are no lint errors.
"@

Write-TextFile (Join-Path $output "INSTALL ORDER.txt") @"
Install Order

1. 01 Install Shadowframe Core\Shadowframe Setup.exe
2. 02 Install Anima Models\Install Shadowframe Anima Models.exe
3. 03 Install Wan Models\Install Shadowframe Wan Models.exe
4. Verify Installation.cmd
5. Shadowframe AI Desktop or Start Menu shortcut
"@

Write-TextFile (Join-Path $output "BETA TEST NOTES.txt") @"
Shadowframe AI Beta Test Notes

Please record:

- Windows version.
- GPU model and driver version.
- Whether each installer completed.
- Result of Verify Installation.cmd.
- Whether Shadowframe launched.
- Result of a small txt-img generation.
- Result of an img-img generation with a reference image.
- Result of an img-vid generation.
- Result of a txt-vid generation.
- Any error screenshots or log files.

Useful logs:

- %TEMP%\Shadowframe-Setup.log
- %TEMP%\Shadowframe-ModelPack-Setup.log
- %LOCALAPPDATA%\Shadowframe\State
"@

$checksumLines = New-Object System.Collections.Generic.List[string]
Get-ChildItem -LiteralPath $output -File -Recurse | Where-Object { $_.Name -ne "BETA-SHA256SUMS.txt" } | ForEach-Object {
  $relative = (Get-RelativePathCompat $output $_.FullName).Replace('\', '/')
  $hash = Get-Sha256 $_.FullName
  $checksumLines.Add("$hash  $relative")
}
[IO.File]::WriteAllLines((Join-Path $output "BETA-SHA256SUMS.txt"), $checksumLines, [Text.UTF8Encoding]::new($false))

Write-Host "Shadowframe beta handoff package created:"
Write-Host $output -ForegroundColor Green
