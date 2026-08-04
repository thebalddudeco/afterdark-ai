param([switch]$KeepFixture)

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
$fixtureRoot = Join-Path $env:TEMP "Shadowframe-ModelPack-Test-$([guid]::NewGuid().ToString('N'))"
$payloadRoot = Join-Path $fixtureRoot "payload"
$dataRoot = Join-Path $fixtureRoot "data"
$setupPublish = Join-Path $projectRoot "release\model-pack-installer-publish"
$registryPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\ShadowframeAI.ModelPack.test-models"

function Invoke-Setup([string[]]$Arguments) {
  $process = Start-Process -FilePath (Join-Path $fixtureRoot "Test Model Pack Setup.exe") -ArgumentList $Arguments -Wait -PassThru
  if ($process.ExitCode -ne 0) { throw "Setup failed with exit code $($process.ExitCode): $($Arguments -join ' ')" }
}

try {
  New-Item -ItemType Directory -Path (Join-Path $payloadRoot "diffusion_models") -Force | Out-Null
  $model = Join-Path $payloadRoot "diffusion_models\fixture.safetensors"
  [IO.File]::WriteAllBytes($model, [byte[]]((0..255) * 16))
  $modelHash = Get-Sha256 $model
  $payload = Join-Path $fixtureRoot "test-models.tar"
  & tar.exe -cf $payload -C $payloadRoot .
  if ($LASTEXITCODE -ne 0) { throw "Fixture archive creation failed." }
  $payloadHash = Get-Sha256 $payload

  if (!(Test-Path -LiteralPath (Join-Path $setupPublish "Shadowframe Setup.exe"))) {
    dotnet publish (Join-Path $projectRoot "desktop\Shadowframe.Installer\Shadowframe.Installer.csproj") -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o $setupPublish
    if ($LASTEXITCODE -ne 0) { throw "Setup publish failed." }
  }
  Copy-Item -LiteralPath (Join-Path $setupPublish "Shadowframe Setup.exe") -Destination (Join-Path $fixtureRoot "Test Model Pack Setup.exe")
  [ordered]@{
    schemaVersion = 1; packId = "test-models"; displayName = "Test Models"; version = "1.0.0"; minimumCoreVersion = "0.3.1"
    payloadFile = "test-models.tar"; sha256 = $payloadHash; installedBytes = (Get-Item $model).Length; fileCount = 1
    distributionPolicy = "redistributable"
    files = @([ordered]@{ relativePath = "diffusion_models/fixture.safetensors"; bytes = (Get-Item $model).Length; sha256 = $modelHash })
    sources = @([ordered]@{ name = "Fixture"; url = "https://shadowframe.tech"; license = "Test only" })
  } | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $fixtureRoot "Shadowframe-ModelPack.json") -Encoding UTF8

  Write-Host "Testing clean install..."
  Invoke-Setup @("/SILENT", "/ALLOWUNSUPPORTED", "/DATAROOT=`"$dataRoot`"")
  $installed = Join-Path $dataRoot "models\diffusion_models\fixture.safetensors"
  if (!(Test-Path -LiteralPath $installed)) { throw "The fixture model was not installed." }
  if (!(Test-Path -LiteralPath (Join-Path $dataRoot "State\ModelPacks\test-models.json"))) { throw "The pack receipt was not written." }
  if (!(Test-Path -LiteralPath $registryPath)) { throw "The Installed Apps registration is missing." }

  Write-Host "Testing repair..."
  [IO.File]::WriteAllText($installed, "damaged")
  Invoke-Setup @("/SILENT", "/ALLOWUNSUPPORTED", "/DATAROOT=`"$dataRoot`"")
  if ((Get-Sha256 $installed) -ne $modelHash) { throw "Repair did not restore the model." }

  Write-Host "Testing safe uninstall preservation..."
  [IO.File]::WriteAllText($installed, "user-modified")
  Invoke-Setup @("/UNINSTALLPACK", "/SILENT", "/DATAROOT=`"$dataRoot`"")
  if (!(Test-Path -LiteralPath $installed)) { throw "Uninstall removed a modified model file." }
  if (Test-Path -LiteralPath (Join-Path $dataRoot "State\ModelPacks\test-models.json")) { throw "Uninstall left the pack receipt behind." }
  if (Test-Path -LiteralPath $registryPath) { throw "Uninstall left the Installed Apps registration behind." }

  Write-Host "Shadowframe model-pack installer tests passed." -ForegroundColor Green
}
finally {
  Remove-Item -LiteralPath $registryPath -Recurse -Force -ErrorAction SilentlyContinue
  if (!$KeepFixture -and (Test-Path -LiteralPath $fixtureRoot)) { Remove-Item -LiteralPath $fixtureRoot -Recurse -Force }
  elseif ($KeepFixture) { Write-Host "Fixture retained at $fixtureRoot" }
}
