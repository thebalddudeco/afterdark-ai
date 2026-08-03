param(
  [switch]$SkipShortcut
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$launcherProject = Join-Path $PSScriptRoot "Shadowframe.Launcher\Shadowframe.Launcher.csproj"
$publishDirectory = Join-Path $projectRoot "release\windows-x64"
$executablePath = Join-Path $publishDirectory "Shadowframe.exe"

dotnet publish $launcherProject -c Release -r win-x64 --self-contained true -o $publishDirectory
if ($LASTEXITCODE -ne 0) { throw "Shadowframe.exe could not be built." }
if (!(Test-Path -LiteralPath $executablePath)) { throw "The finished Shadowframe.exe was not created." }

Copy-Item -LiteralPath $executablePath -Destination (Join-Path $projectRoot "Shadowframe.exe") -Force

if (!$SkipShortcut) {
  $shell = New-Object -ComObject WScript.Shell
  $shortcutPath = Join-Path ([Environment]::GetFolderPath("Desktop")) "Shadowframe AI.lnk"
  $shortcut = $shell.CreateShortcut($shortcutPath)
  $shortcut.TargetPath = Join-Path $projectRoot "Shadowframe.exe"
  $shortcut.WorkingDirectory = $projectRoot
  $shortcut.IconLocation = "$(Join-Path $projectRoot 'Shadowframe.exe'),0"
  $shortcut.Description = "Launch Shadowframe AI"
  $shortcut.Save()
  Write-Host "Desktop shortcut created: $shortcutPath"
}

Write-Host "Shadowframe.exe created: $(Join-Path $projectRoot 'Shadowframe.exe')"
