param(
  [ValidateSet("All", "Anima", "Wan", "PhotoReal")]
  [string]$Pack = "All",
  [string]$ComfyModelsRoot = "C:\Users\info\Documents\ComfyUI\models",
  [string]$WanDownloadRoot = "",
  [string]$WorkRoot = "",
  [switch]$SkipSetupBuild,
  [switch]$ReusePayload,
  [switch]$PublicRelease
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

$animaPublicFiles = @(
  New-PackFile (Join-Path $ComfyModelsRoot "diffusion_models\anima-aesthetic-v1.1.safetensors") "diffusion_models/anima-aesthetic-v1.1.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "text_encoders\qwen_3_06b_base.safetensors") "text_encoders/qwen_3_06b_base.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "vae\qwen_image_vae.safetensors") "vae/qwen_image_vae.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\Anima_Xipa_Style_v2.safetensors") "loras/Anima_Xipa_Style_v2.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\Anima_BuAnime_Soft_v3.safetensors") "loras/Anima_BuAnime_Soft_v3.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\Anima_Suuru_Style_v1.safetensors") "loras/Anima_Suuru_Style_v1.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\Anima_LineLore_v1.safetensors") "loras/Anima_LineLore_v1.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\Anima_Micro_Details_v1.safetensors") "loras/Anima_Micro_Details_v1.safetensors"
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

$wanPublicFiles = @(
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

$photoRealFiles = @(
  New-PackFile (Join-Path $ComfyModelsRoot "diffusion_models\redcraft23INT8INT4FP8_30Krea2.safetensors") "diffusion_models/redcraft23INT8INT4FP8_30Krea2.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "diffusion_models\moodyRealMix_xhsEdition.safetensors") "diffusion_models/moodyRealMix_xhsEdition.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "diffusion_models\ltx23Gtanimation25Frames_ltxv23INT4Convrot.safetensors") "checkpoints/ltx23Gtanimation25Frames_ltxv23INT4Convrot.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "diffusion_models\qwen_image_2512_fp8_e4m3fn.safetensors") "diffusion_models/qwen_image_2512_fp8_e4m3fn.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "text_encoders\qwen_2.5_vl_7b_fp8_scaled.safetensors") "text_encoders/qwen_2.5_vl_7b_fp8_scaled.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "text_encoders\qwen3vl_4b_fp8_scaled.safetensors") "text_encoders/qwen3vl_4b_fp8_scaled.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "vae\qwen_image_vae.safetensors") "vae/qwen_image_vae.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\RED CRAFT\skintone_v2_krea2_loraholic.safetensors") "loras/RED CRAFT/skintone_v2_krea2_loraholic.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\RED CRAFT\mons_pubis_krea2_loraholic.safetensors") "loras/RED CRAFT/mons_pubis_krea2_loraholic.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\RED CRAFT\Purple_Grainy_Kr2_AM.safetensors") "loras/RED CRAFT/Purple_Grainy_Kr2_AM.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\RED CRAFT\PornMaster_Krea2_Asian_slider_V1.safetensors") "loras/RED CRAFT/PornMaster_Krea2_Asian_slider_V1.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\RED CRAFT\Purple_Graphics_KR2.safetensors") "loras/RED CRAFT/Purple_Graphics_KR2.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\RED CRAFT\transparent_clothes_krea2_v1.safetensors") "loras/RED CRAFT/transparent_clothes_krea2_v1.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\RED CRAFT\Krea2_Cinematic_Artstyle.safetensors") "loras/RED CRAFT/Krea2_Cinematic_Artstyle.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\RED CRAFT\krea2_rt_v1_5_epoch_10.safetensors") "loras/RED CRAFT/krea2_rt_v1_5_epoch_10.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\RED CRAFT\breast_size_v2_krea2_loraholic.safetensors") "loras/RED CRAFT/breast_size_v2_krea2_loraholic.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\RED CRAFT\krea2_better_pussy_poses_v4.1.safetensors") "loras/RED CRAFT/krea2_better_pussy_poses_v4.1.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\RED CRAFT\hina_krea2Turbo_lora_tqd_v3.0.safetensors") "loras/RED CRAFT/hina_krea2Turbo_lora_tqd_v3.0.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\RED CRAFT\@motocross_saito_v0_0_0_cr_0010.safetensors") "loras/RED CRAFT/@motocross_saito_v0_0_0_cr_0010.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\Moody Pro Mix\m99_labiaplasty_pussy_6_zimage.safetensors") "loras/Moody Pro Mix/m99_labiaplasty_pussy_6_zimage.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\Moody Pro Mix\breast_size_v2_loraholic.safetensors") "loras/Moody Pro Mix/breast_size_v2_loraholic.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\Moody Pro Mix\MidJourneyNSFWZ.safetensors") "loras/Moody Pro Mix/MidJourneyNSFWZ.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\Moody Pro Mix\zib-uncensored_v1_ep15.safetensors") "loras/Moody Pro Mix/zib-uncensored_v1_ep15.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\Moody Pro Mix\60sPsyZBase.safetensors") "loras/Moody Pro Mix/60sPsyZBase.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\Moody Pro Mix\areolas_size_loraholic.safetensors") "loras/Moody Pro Mix/areolas_size_loraholic.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\Moody Pro Mix\skintone_v2_loraholic.safetensors") "loras/Moody Pro Mix/skintone_v2_loraholic.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\Moody Pro Mix\rope bondage V2.safetensors") "loras/Moody Pro Mix/rope bondage V2.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\Moody Pro Mix\egypt queen v2.safetensors") "loras/Moody Pro Mix/egypt queen v2.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\Moody Pro Mix\chain collar.safetensors") "loras/Moody Pro Mix/chain collar.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\Moody Pro Mix\Nostalgic_Cinema_zit_final.safetensors") "loras/Moody Pro Mix/Nostalgic_Cinema_zit_final.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\Moody Pro Mix\Fashion Generator.safetensors") "loras/Moody Pro Mix/Fashion Generator.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\Moody Pro Mix\crowd street.safetensors") "loras/Moody Pro Mix/crowd street.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\Moody Pro Mix\Chun Li V2.safetensors") "loras/Moody Pro Mix/Chun Li V2.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\LTX 2.3\ltx23-i2v-swing-up-down-os.safetensors") "loras/LTX 2.3/ltx23-i2v-swing-up-down-os.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\LTX 2.3\ltx23-i2v-swing-in-out-os.safetensors") "loras/LTX 2.3/ltx23-i2v-swing-in-out-os.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\LTX 2.3\ltx-face-prior-f1-profile-correction-step11019.safetensors") "loras/LTX 2.3/ltx-face-prior-f1-profile-correction-step11019.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\LTX 2.3\mila_ltx23_lora.safetensors") "loras/LTX 2.3/mila_ltx23_lora.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\LTX 2.3\Bonnie_Rabbit_LTX_v1.safetensors") "loras/LTX 2.3/Bonnie_Rabbit_LTX_v1.safetensors"
)

$photoRealPublicFiles = @(
  New-PackFile (Join-Path $ComfyModelsRoot "diffusion_models\redcraft23INT8INT4FP8_30Krea2.safetensors") "diffusion_models/redcraft23INT8INT4FP8_30Krea2.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "diffusion_models\moodyRealMix_xhsEdition.safetensors") "diffusion_models/moodyRealMix_xhsEdition.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "diffusion_models\ltx23Gtanimation25Frames_ltxv23INT4Convrot.safetensors") "checkpoints/ltx23Gtanimation25Frames_ltxv23INT4Convrot.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "diffusion_models\qwen_image_2512_fp8_e4m3fn.safetensors") "diffusion_models/qwen_image_2512_fp8_e4m3fn.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "text_encoders\qwen_2.5_vl_7b_fp8_scaled.safetensors") "text_encoders/qwen_2.5_vl_7b_fp8_scaled.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "text_encoders\qwen3vl_4b_fp8_scaled.safetensors") "text_encoders/qwen3vl_4b_fp8_scaled.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "vae\qwen_image_vae.safetensors") "vae/qwen_image_vae.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\RED CRAFT\skintone_v2_krea2_loraholic.safetensors") "loras/RED CRAFT/skintone_v2_krea2_loraholic.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\RED CRAFT\Purple_Grainy_Kr2_AM.safetensors") "loras/RED CRAFT/Purple_Grainy_Kr2_AM.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\RED CRAFT\Purple_Graphics_KR2.safetensors") "loras/RED CRAFT/Purple_Graphics_KR2.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\RED CRAFT\Krea2_Cinematic_Artstyle.safetensors") "loras/RED CRAFT/Krea2_Cinematic_Artstyle.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\RED CRAFT\krea2_rt_v1_5_epoch_10.safetensors") "loras/RED CRAFT/krea2_rt_v1_5_epoch_10.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\RED CRAFT\@motocross_saito_v0_0_0_cr_0010.safetensors") "loras/RED CRAFT/@motocross_saito_v0_0_0_cr_0010.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\Moody Pro Mix\60sPsyZBase.safetensors") "loras/Moody Pro Mix/60sPsyZBase.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\Moody Pro Mix\chain collar.safetensors") "loras/Moody Pro Mix/chain collar.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\Moody Pro Mix\Chun Li V2.safetensors") "loras/Moody Pro Mix/Chun Li V2.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\Moody Pro Mix\crowd street.safetensors") "loras/Moody Pro Mix/crowd street.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\Moody Pro Mix\egypt queen v2.safetensors") "loras/Moody Pro Mix/egypt queen v2.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\Moody Pro Mix\Fashion Generator.safetensors") "loras/Moody Pro Mix/Fashion Generator.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\Moody Pro Mix\Nostalgic_Cinema_zit_final.safetensors") "loras/Moody Pro Mix/Nostalgic_Cinema_zit_final.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\Moody Pro Mix\skintone_v2_loraholic.safetensors") "loras/Moody Pro Mix/skintone_v2_loraholic.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\LTX 2.3\ltx-face-prior-f1-profile-correction-step11019.safetensors") "loras/LTX 2.3/ltx-face-prior-f1-profile-correction-step11019.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\LTX 2.3\ltx23-i2v-swing-in-out-os.safetensors") "loras/LTX 2.3/ltx23-i2v-swing-in-out-os.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\LTX 2.3\ltx23-i2v-swing-up-down-os.safetensors") "loras/LTX 2.3/ltx23-i2v-swing-up-down-os.safetensors"
  New-PackFile (Join-Path $ComfyModelsRoot "loras\LTX 2.3\mila_ltx23_lora.safetensors") "loras/LTX 2.3/mila_ltx23_lora.safetensors"
)

$definitions = @(
  [pscustomobject]@{
    Selector = "Anima"
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
    Selector = "Wan"
    Name = "Wan"; PackId = "wan-models"; DisplayName = "Wan 2.2 Video Models"; Version = "1.0.0"
    OutputName = "Shadowframe-Wan-Models"; Payload = "Shadowframe-Wan-Models.tar"; Files = $wanFiles
    DistributionPolicy = "redistributable"
    Sources = @(
      [ordered]@{ name = "Wan 2.2 ComfyUI Repackaged"; url = "https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged"; license = "Apache-2.0" }
      [ordered]@{ name = "Wan 2.2 Lightx2v LoRAs"; url = "https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged"; license = "Apache-2.0" }
    )
  }
  [pscustomobject]@{
    Selector = "PhotoReal"
    Name = "PhotoReal"; PackId = "photoreal-models"; DisplayName = "PhotoReal Image and Video Models"; Version = "1.0.0"
    OutputName = "Shadowframe-PhotoReal-Models"; Payload = "Shadowframe-PhotoReal-Models.tar"; Files = $photoRealFiles
    DistributionPolicy = "private-use"
    CompatibilityChecks = @(
      [ordered]@{
        id = "redcraft-krea2-runtime-pair"
        displayName = "RedCraft/Krea2 runtime pair"
        repairMessage = "Repair or reinstall the current PhotoReal model pack from this release, then restart Shadowframe."
        requiredFiles = @(
          "diffusion_models/redcraft23INT8INT4FP8_30Krea2.safetensors"
          "text_encoders/qwen3vl_4b_fp8_scaled.safetensors"
        )
      }
    )
    Sources = @(
      [ordered]@{ name = "RedCraft 2/3"; url = "https://civitai.red/models/958009/redcraft-or-2-or-3-int8int4fp8-scaled"; license = "Creator terms; redistribution permission not confirmed" }
      [ordered]@{ name = "Moody Real Mix"; url = "https://civitai.com/models/621441/moody-real-mix"; license = "Creator terms; redistribution permission not confirmed" }
      [ordered]@{ name = "LTX 2.3 GTAnimation"; url = "https://civitai.red/models/1295569/ltx-23-gtanimation-or-25-frames-in-5s-12g-vram"; license = "Creator terms; redistribution permission not confirmed" }
      [ordered]@{ name = "RedCraft LoRAs"; url = "https://civitai.red/"; license = "Creator terms; redistribution permission not confirmed" }
      [ordered]@{ name = "Moody Real LoRAs"; url = "https://civitai.com/"; license = "Creator terms; redistribution permission not confirmed" }
      [ordered]@{ name = "LTX 2.3 LoRAs"; url = "https://civitai.red/"; license = "Creator terms; redistribution permission not confirmed" }
    )
  }
)

if ($PublicRelease) {
  $definitions = @(
    [pscustomobject]@{
      Selector = "Anima"
      Name = "Anima Public"; PackId = "anima-models-public"; DisplayName = "Anima Public Image Models"; Version = "1.0.0"
      OutputName = "Shadowframe-Anima-Models-Public-0.3.6"; Payload = "Shadowframe-Anima-Models-Public.tar"; Files = $animaPublicFiles
      DistributionPolicy = "public-release-candidate"
      Sources = @(
        [ordered]@{ name = "Anima Aesthetic"; url = "https://civitai.com/models/2458426/anima"; license = "Pending creator redistribution confirmation for public hosting" }
        [ordered]@{ name = "Xipa Style"; url = "https://civitai.com/models/2487573?modelVersionId=3179330"; license = "Pending creator redistribution confirmation for public hosting" }
        [ordered]@{ name = "BuAnime Soft"; url = "https://civitai.com/models/2645819?modelVersionId=3178787"; license = "Pending creator redistribution confirmation for public hosting" }
        [ordered]@{ name = "Suuru Style"; url = "https://civitai.com/models/2420817?modelVersionId=3125420"; license = "Pending creator redistribution confirmation for public hosting" }
        [ordered]@{ name = "LineLore"; url = "https://civitai.com/models/1175632?modelVersionId=3010462"; license = "Pending creator redistribution confirmation for public hosting" }
        [ordered]@{ name = "Micro Details"; url = "https://civitai.com/models/1377820?modelVersionId=3128378"; license = "Pending creator redistribution confirmation for public hosting" }
      )
    }
    [pscustomobject]@{
      Selector = "Wan"
      Name = "Wan Public"; PackId = "wan-models-public"; DisplayName = "Wan 2.2 Public Video Models"; Version = "1.0.0"
      OutputName = "Shadowframe-Wan-Models-Public-0.3.6"; Payload = "Shadowframe-Wan-Models-Public.tar"; Files = $wanPublicFiles
      DistributionPolicy = "redistributable"
      Sources = @(
        [ordered]@{ name = "Wan 2.2 ComfyUI Repackaged"; url = "https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged"; license = "Apache-2.0" }
        [ordered]@{ name = "Wan 2.2 Lightx2v LoRAs"; url = "https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged"; license = "Apache-2.0" }
      )
    }
    [pscustomobject]@{
      Selector = "PhotoReal"
      Name = "PhotoReal Public"; PackId = "photoreal-models-public"; DisplayName = "PhotoReal Public Image and Video Models"; Version = "1.0.0"
      OutputName = "Shadowframe-PhotoReal-Models-Public-0.3.6"; Payload = "Shadowframe-PhotoReal-Models-Public.tar"; Files = $photoRealPublicFiles
      DistributionPolicy = "public-release-candidate"
      Sources = @(
        [ordered]@{ name = "RedCraft 2/3"; url = "https://civitai.red/models/958009/redcraft-or-2-or-3-int8int4fp8-scaled"; license = "Pending creator redistribution confirmation for public hosting" }
        [ordered]@{ name = "Moody Real Mix"; url = "https://civitai.com/models/621441/moody-real-mix"; license = "Pending creator redistribution confirmation for public hosting" }
        [ordered]@{ name = "LTX 2.3 GTAnimation"; url = "https://civitai.red/models/1295569/ltx-23-gtanimation-or-25-frames-in-5s-12g-vram"; license = "Pending creator redistribution confirmation for public hosting" }
        [ordered]@{ name = "Public-safe RedCraft LoRAs"; url = "https://civitai.red/"; license = "Pending creator redistribution confirmation for public hosting" }
        [ordered]@{ name = "Public-safe Moody Real LoRAs"; url = "https://civitai.com/"; license = "Pending creator redistribution confirmation for public hosting" }
        [ordered]@{ name = "Public-safe LTX 2.3 LoRAs"; url = "https://civitai.red/"; license = "Pending creator redistribution confirmation for public hosting" }
      )
    }
  )
}

if ($Pack -ne "All") { $definitions = @($definitions | Where-Object Selector -eq $Pack) }

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
    $compatibilityChecks = @()
    if ($definition.PSObject.Properties.Name -contains "CompatibilityChecks") {
      foreach ($check in $definition.CompatibilityChecks) {
        $requiredFiles = @()
        foreach ($requiredPath in $check.requiredFiles) {
          $match = $manifestFiles | Where-Object { $_.relativePath -eq $requiredPath } | Select-Object -First 1
          if (!$match) { throw "Compatibility check '$($check.id)' references a file that is not in the pack: $requiredPath" }
          $requiredFiles += $match
        }
        $compatibilityChecks += [ordered]@{
          id = $check.id
          displayName = $check.displayName
          repairMessage = $check.repairMessage
          requiredFiles = $requiredFiles
        }
      }
    }
    $manifest = [ordered]@{
      schemaVersion = 1
      packId = $definition.PackId
      displayName = $definition.DisplayName
      version = $definition.Version
      minimumCoreVersion = "0.3.6"
      payloadFile = $definition.Payload
      sha256 = $payloadHash
      installedBytes = $installedBytes
      fileCount = $manifestFiles.Count
      distributionPolicy = $definition.DistributionPolicy
      files = $manifestFiles
      sources = $definition.Sources
    }
    if ($compatibilityChecks.Count -gt 0) { $manifest.compatibilityChecks = $compatibilityChecks }
    $manifestPath = Join-Path $output "Shadowframe-ModelPack.json"
    $manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
    $setupName = "Install Shadowframe $($definition.Name) Models.exe"
    Copy-Item -LiteralPath $setupSource -Destination (Join-Path $output $setupName) -Force

    $notice = @("Shadowframe AI - $($definition.DisplayName)", "", "Sources and licenses:")
    foreach ($source in $definition.Sources) { $notice += "- $($source.name): $($source.url) [$($source.license)]" }
    if ($definition.DistributionPolicy -eq "public-release-candidate") {
      $notice += ""
      $notice += "PUBLIC RELEASE CANDIDATE: This pack is sanitized for the public SFW Shadowframe release and intentionally excludes adult-oriented Anima LoRAs and creator-only workflow add-ons."
    }
    elseif ($definition.DistributionPolicy -ne "redistributable") {
      $notice += ""
      $notice += "PRIVATE BUILD: Do not publish or redistribute this model archive until each creator explicitly permits redistribution of the original model files."
    }
    $notice | Set-Content -LiteralPath (Join-Path $output "THIRD-PARTY-NOTICES.txt") -Encoding UTF8

    $compatibilityReadme = ""
    if ($compatibilityChecks.Count -gt 0) {
      $compatibilityReadme = @"

Compatibility checks:
$(
  ($compatibilityChecks | ForEach-Object {
    "  - $($_.displayName): $($_.repairMessage)"
  }) -join "`r`n"
)
"@
    }

    @"
Shadowframe AI - $($definition.DisplayName)

Install Shadowframe Core first, then keep these files together and run:
  $setupName

The installer adds models to:
  <Shadowframe library location>\models

When launched by Shadowframe Core Setup, this location is passed in automatically.

Silent install:
  "$setupName" /SILENT /DATAROOT="X:\Shadowframe"

SHA256SUMS.txt can be used to verify downloaded files.
See THIRD-PARTY-NOTICES.txt before sharing this package.
$compatibilityReadme
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

