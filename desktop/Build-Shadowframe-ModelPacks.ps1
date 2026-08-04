param(
  [ValidateSet("All", "Anima", "Wan")]
  [string]$Pack = "All",
  [string]$ComfyModelsRoot = "C:\Users\info\Documents\ComfyUI\models",
  [string]$WanDownloadRoot = "",
  [string]$WorkRoot = "",
  [switch]$SkipSetupBuild,
  [switch]$ReusePayload
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
$releaseRoot = Join-Path $projectRoot "release"
$releaseRootFull = [IO.Path]::GetFullPath($releaseRoot).TrimEnd('\')
if (!$WanDownloadRoot) { $WanDownloadRoot = Join-Path $releaseRoot "model-cache\wan-official\split_files" }
if (!$WorkRoot) {
  $WorkRoot = if (Test-Path -LiteralPath "D:\") { "D:\Shadowframe-Pack-Work" } else { Join-Path $env:TEMP "Shadowframe-Pack-Work" }
}

function Assert-ReleaseChild([string]$Path) {
  $full = [IO.Path]::GetFullPath($Path).TrimEnd('\')
  if (!$full.StartsWith($releaseRootFull + '\', [StringComparison]::OrdinalIgnoreCase)) {
    throw "Model-pack output must stay inside $releaseRootFull"
  }
  return $full
}

function New-PackFile([string]$Source, [string]$Target) {
  [pscustomobject]@{ Source = [IO.Path]::GetFullPath($Source); Target = $Target.Replace('\', '/') }
}

$animaFiles = @(
  New-PackFile (Join-Path $ComfyModelsRoot "diffusion_models\waiANIMA_v10Base10.safetensors") "diffusion_models/waiANIMA_v10Base10.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "diffusion_models\anima-aesthetic-v1.1.safetensors") "diffusion_models/anima-aesthetic-v1.1.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "text_encoders\qwen_3_06b_base.safetensors") "text_encoders/qwen_3_06b_base.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "vae\qwen_image_vae.safetensors") "vae/qwen_image_vae.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\Anima_Xipa_Style_v2.safetensors") "loras/Anima_Xipa_Style_v2.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\Anima_Niji_Sweet_Spot_v4.safetensors") "loras/Anima_Niji_Sweet_Spot_v4.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\Anima_BuAnime_Soft_v3.safetensors") "loras/Anima_BuAnime_Soft_v3.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\Anima_Deepthroat_Slider.safetensors") "loras/Anima_Deepthroat_Slider.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\Anima_Suuru_Style_v1.safetensors") "loras/Anima_Suuru_Style_v1.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\Anima_LineLore_v1.safetensors") "loras/Anima_LineLore_v1.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\Anima_Micro_Details_v1.safetensors") "loras/Anima_Micro_Details_v1.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\Anima_Queue_Sex_v3.safetensors") "loras/Anima_Queue_Sex_v3.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\Anima_Puffy_Mons_Slider.safetensors") "loras/Anima_Puffy_Mons_Slider.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\Anima_Ripping_Clothes_v1.safetensors") "loras/Anima_Ripping_Clothes_v1.safetensors"
)

$wanFiles = @(
  New-PackFile (Join-Path $ComfyModelsRoot "unet\wan2.2_i2v_high_noise_14B_fp8_scaled.safetensors") "diffusion_models/wan2.2_i2v_high_noise_14B_fp8_scaled.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "unet\wan2.2_i2v_low_noise_14B_fp8_scaled.safetensors") "diffusion_models/wan2.2_i2v_low_noise_14B_fp8_scaled.safetensors"
  New-PackFile (Join-Path $WanDownloadRoot "diffusion_models\wan2.2_t2v_high_noise_14B_fp8_scaled.safetensors") "diffusion_models/wan2.2_t2v_high_noise_14B_fp8_scaled.safetensors"
  New-PackFile (Join-Path $WanDownloadRoot "diffusion_models\wan2.2_t2v_low_noise_14B_fp8_scaled.safetensors") "diffusion_models/wan2.2_t2v_low_noise_14B_fp8_scaled.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "text_encoders\umt5_xxl_fp8_e4m3fn_scaled.safetensors") "text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "vae\wan_2.1_vae.safetensors") "vae/wan_2.1_vae.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\wan2.2_i2v_lightx2v_4steps_lora_v1_high_noise.safetensors") "loras/wan2.2_i2v_lightx2v_4steps_lora_v1_high_noise.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\wan2.2_i2v_lightx2v_4steps_lora_v1_low_noise.safetensors") "loras/wan2.2_i2v_lightx2v_4steps_lora_v1_low_noise.safetensors"
  New-PackFile (Join-Path $WanDownloadRoot "loras\wan2.2_t2v_lightx2v_4steps_lora_v1.1_high_noise.safetensors") "loras/wan2.2_t2v_lightx2v_4steps_lora_v1.1_high_noise.safetensors"
  New-PackFile (Join-Path $WanDownloadRoot "loras\wan2.2_t2v_lightx2v_4steps_lora_v1.1_low_noise.safetensors") "loras/wan2.2_t2v_lightx2v_4steps_lora_v1.1_low_noise.safetensors"
)

$definitions = @(
  [pscustomobject]@{
    Name = "Anima"; PackId = "anima-models"; DisplayName = "Anima Image Models"; Version = "1.0.0"
    OutputName = "Shadowframe-Anima-Models"; Payload = "Shadowframe-Anima-Models.tar"; Files = $animaFiles
    DistributionPolicy = "private-use"
    Sources = @(
      [ordered]@{ name = "WAI-ANIMA"; url = "https://civitai.com/models/2544636?modelVersionId=2983680"; license = "Creator terms; redistribution permission not confirmed" }
      [ordered]@{ name = "Anima Aesthetic"; url = "https://civitai.com/models/2458426/anima"; license = "Creator terms; redistribution permission not confirmed" }
      [ordered]@{ name = "Xipa Style"; url = "https://civitai.com/models/2487573?modelVersionId=3179330"; license = "Creator terms; redistribution permission not confirmed" }
      [ordered]@{ name = "Niji Sweet Spot"; url = "https://civitai.com/models/2554999?modelVersionId=3040615"; license = "Creator terms; redistribution permission not confirmed" }
      [ordered]@{ name = "BuAnime Soft"; url = "https://civitai.com/models/2645819?modelVersionId=3178787"; license = "Creator terms; redistribution permission not confirmed" }
      [ordered]@{ name = "Deepthroat Slider"; url = "https://civitai.com/models/2535814?modelVersionId=3059807"; license = "Creator terms; redistribution permission not confirmed" }
      [ordered]@{ name = "Suuru Style"; url = "https://civitai.com/models/2420817?modelVersionId=3125420"; license = "Creator terms; redistribution permission not confirmed" }
      [ordered]@{ name = "LineLore"; url = "https://civitai.com/models/1175632?modelVersionId=3010462"; license = "Creator terms; redistribution permission not confirmed" }
      [ordered]@{ name = "Micro Details"; url = "https://civitai.com/models/1377820?modelVersionId=3128378"; license = "Creator terms; redistribution permission not confirmed" }
      [ordered]@{ name = "Sex Queue"; url = "https://civitai.com/models/2754154?modelVersionId=3098764"; license = "Creator terms; redistribution permission not confirmed" }
      [ordered]@{ name = "Puffy Pussy"; url = "https://civitai.com/models/2536481?modelVersionId=3056382"; license = "Creator terms; redistribution permission not confirmed" }
      [ordered]@{ name = "Ripped Clothes"; url = "https://civitai.com/models/2762116?modelVersionId=3108593"; license = "Creator terms; redistribution permission not confirmed" }
    )
  }
  [pscustomobject]@{
    Name = "Wan"; PackId = "wan-models"; DisplayName = "Wan 2.2 Video Models"; Version = "1.0.0"
    OutputName = "Shadowframe-Wan-Models"; Payload = "Shadowframe-Wan-Models.tar"; Files = $wanFiles
    DistributionPolicy = "redistributable"
    Sources = @(
      [ordered]@{ name = "Wan 2.2 ComfyUI Repackaged"; url = "https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged"; license = "Apache-2.0" }
      [ordered]@{ name = "Wan 2.2 Lightx2v LoRAs"; url = "https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged"; license = "Apache-2.0" }
    )
  }
)

if ($Pack -ne "All") { $definitions = @($definitions | Where-Object Name -eq $Pack) }

$setupPublish = Join-Path $releaseRoot "model-pack-installer-publish"
if (!$SkipSetupBuild) {
  if (Test-Path -LiteralPath $setupPublish) { Remove-Item -LiteralPath $setupPublish -Recurse -Force }
  Write-Host "Building the reusable model-pack Setup application..."
  dotnet publish (Join-Path $PSScriptRoot "Shadowframe.Installer\Shadowframe.Installer.csproj") -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o $setupPublish
  if ($LASTEXITCODE -ne 0) { throw "The model-pack Setup application could not be built." }
}
$setupSource = Join-Path $setupPublish "Shadowframe Setup.exe"
if (!(Test-Path -LiteralPath $setupSource)) { throw "The model-pack Setup application is missing: $setupSource" }

foreach ($definition in $definitions) {
  Write-Host "`nBuilding $($definition.DisplayName)..." -ForegroundColor Cyan
  foreach ($file in $definition.Files) {
    if (!(Test-Path -LiteralPath $file.Source -PathType Leaf)) { throw "Required model is missing: $($file.Source)" }
  }

  $output = Assert-ReleaseChild (Join-Path $releaseRoot $definition.OutputName)
  $existingPayload = Join-Path $output $definition.Payload
  if ((Test-Path -LiteralPath $output) -and !($ReusePayload -and (Test-Path -LiteralPath $existingPayload))) {
    Remove-Item -LiteralPath $output -Recurse -Force
  }
  New-Item -ItemType Directory -Path $output -Force | Out-Null
  $staging = Join-Path ([IO.Path]::GetFullPath($WorkRoot)) "$($definition.PackId)-$([guid]::NewGuid().ToString('N'))"
  New-Item -ItemType Directory -Path $staging -Force | Out-Null

  $temporaryPayload = $null
  try {
    $manifestFiles = @()
    $index = 0
    foreach ($file in $definition.Files) {
      $index++
      Write-Host "[$index/$($definition.Files.Count)] Hashing $($file.Target)..."
      $sourceInfo = Get-Item -LiteralPath $file.Source
      $sourceHash = Get-Sha256 $file.Source
      $manifestFiles += [pscustomobject][ordered]@{ relativePath = $file.Target; bytes = $sourceInfo.Length; sha256 = $sourceHash }
      if (!($ReusePayload -and (Test-Path -LiteralPath $existingPayload))) {
        $stagedFile = Join-Path $staging $file.Target.Replace('/', '\')
        New-Item -ItemType Directory -Path (Split-Path -Parent $stagedFile) -Force | Out-Null
        Copy-Item -LiteralPath $file.Source -Destination $stagedFile -Force
      }
    }

    $payload = Join-Path $output $definition.Payload
    if ($ReusePayload -and (Test-Path -LiteralPath $payload)) {
      Write-Host "Reusing the existing payload archive."
    } else {
      # Stream the archive to the release drive so the work drive only has to read.
      # The partial suffix keeps interrupted builds from looking complete.
      $temporaryPayload = Join-Path $output "$($definition.Payload).$([guid]::NewGuid().ToString('N')).partial"
      Write-Host "Packing $($definition.DisplayName)..."
      & tar.exe -cf $temporaryPayload -C $staging .
      if ($LASTEXITCODE -ne 0) { throw "The model payload archive could not be created." }
      Move-Item -LiteralPath $temporaryPayload -Destination $payload -Force
    }

    Write-Host "Verifying the completed payload..."
    $payloadHash = Get-Sha256 $payload
    $installedBytes = ($manifestFiles | Measure-Object bytes -Sum).Sum
    $manifest = [ordered]@{
      schemaVersion = 1
      packId = $definition.PackId
      displayName = $definition.DisplayName
      version = $definition.Version
      minimumCoreVersion = "0.3.0"
      payloadFile = $definition.Payload
      sha256 = $payloadHash
      installedBytes = $installedBytes
      fileCount = $manifestFiles.Count
      distributionPolicy = $definition.DistributionPolicy
      files = $manifestFiles
      sources = $definition.Sources
    }
    $manifestPath = Join-Path $output "Shadowframe-ModelPack.json"
    $manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
    $setupName = "Install Shadowframe $($definition.Name) Models.exe"
    Copy-Item -LiteralPath $setupSource -Destination (Join-Path $output $setupName) -Force

    $notice = @("Shadowframe AI - $($definition.DisplayName)", "", "Sources and licenses:")
    foreach ($source in $definition.Sources) { $notice += "- $($source.name): $($source.url) [$($source.license)]" }
    if ($definition.DistributionPolicy -ne "redistributable") {
      $notice += ""
      $notice += "PRIVATE BUILD: Do not publish or redistribute this model archive until each creator explicitly permits redistribution of the original model files."
    }
    $notice | Set-Content -LiteralPath (Join-Path $output "THIRD-PARTY-NOTICES.txt") -Encoding UTF8

    @"
Shadowframe AI - $($definition.DisplayName)

Install Shadowframe Core first, then keep these files together and run:
  $setupName

The installer adds models to:
  %LOCALAPPDATA%\Shadowframe\models

Silent install:
  "$setupName" /SILENT

SHA256SUMS.txt can be used to verify downloaded files.
See THIRD-PARTY-NOTICES.txt before sharing this package.
"@ | Set-Content -LiteralPath (Join-Path $output "README.txt") -Encoding UTF8

    $checksumFiles = @($setupName, $definition.Payload, "Shadowframe-ModelPack.json", "THIRD-PARTY-NOTICES.txt", "README.txt")
    $checksums = foreach ($name in $checksumFiles) {
      $fileHash = if ($name -eq $definition.Payload) { $payloadHash } else { Get-Sha256 (Join-Path $output $name) }
      "{0}  {1}" -f $fileHash, $name
    }
    $checksums | Set-Content -LiteralPath (Join-Path $output "SHA256SUMS.txt") -Encoding ASCII
    Write-Host "$($definition.DisplayName) created at $output" -ForegroundColor Green
  }
  finally {
    if (Test-Path -LiteralPath $staging) { Remove-Item -LiteralPath $staging -Recurse -Force }
    if ($temporaryPayload -and (Test-Path -LiteralPath $temporaryPayload)) { Remove-Item -LiteralPath $temporaryPayload -Force }
  }
}
