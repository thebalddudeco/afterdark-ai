# Shadowframe model packs

Shadowframe is distributed as three Windows packages:

1. **Shadowframe Core** — the desktop app, private bridge, bundled ComfyUI runtime, and workflow code.
2. **Anima Image Models** — WAI-ANIMA, Anima Aesthetic, the shared Qwen text encoder/VAE, and the configured Anima LoRAs.
3. **Wan 2.2 Video Models** — Wan 2.2 image-to-video and text-to-video high/low-noise models, the shared UMT5 encoder/VAE, and Lightx2v acceleration LoRAs.

Planned photo/video expansion packs:

4. **RedCraft Photo Models** — RedCraft 2/3 image generation plus Krea/ZIT-compatible photo LoRAs.
5. **Moody Real Photo Models** — Moody Real Mix image generation plus SDXL/Krea/Z-Image compatible photo/style LoRAs.
6. **LTX 2.3 Video Models** — LTX 2.3 GTAnimation video generation plus motion and identity LoRAs.

Install Core first. Current model packs install into `%LOCALAPPDATA%\Shadowframe\models`, are independently repairable, and appear separately in Windows Installed Apps.

Planned installer-hub behavior: Core will ask for a model storage location and a generation storage location, record both, and then model packs will install into the selected model storage root instead of hard-coding `%LOCALAPPDATA%`. This allows a user to install the application on one drive, keep large model files on another, and keep generated files somewhere convenient.

Recommended model storage layout:

```text
<Shadowframe model storage root>/
  models/
```

Recommended generation storage layout:

```text
<Shadowframe generation storage root>/
  input/
  output/
  State/
  Logs/
```

The user should not need to choose an input folder separately. Dragged-in source images are automatically stored under `input` beside the configured `output` folder.

The model storage root should usually be local to the GPU machine. A network share can be supported for advanced users, but large checkpoint loading over a network is expected to be slower and less reliable than local SSD/NVMe storage.

## Current production outputs

- `release\Shadowframe-Anima-Models` — 14 model files, 10.00 GiB payload.
- `release\Shadowframe-Wan-Models` — 10 model files, 64.33 GiB payload.

Each folder contains its branded Setup executable, tar payload, model-pack manifest, README, third-party notices, and `SHA256SUMS.txt`. Keep all six files together when installing or transferring a pack.

## Build

From the repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File desktop\Build-Shadowframe-ModelPacks.ps1
```

Build one pack with `-Pack Anima` or `-Pack Wan`. Override `-ComfyModelsRoot`, `-WanDownloadRoot`, or `-WorkRoot` when source files live elsewhere.

The builder verifies every source file, hashes every installed model, creates an uncompressed tar payload, hashes the completed archive, and writes `SHA256SUMS.txt`.

Run `pnpm models:test` for the small clean-install/repair/uninstall lifecycle test. Run `pnpm models:verify` after building both production packs to recheck each full payload hash and confirm that every archive path exactly matches its manifest.

For a full extraction test of a production pack, run `scripts\Test-Shadowframe-ProductionPack.ps1 -PackDirectory release\Shadowframe-Anima-Models`. The test uses an isolated folder beneath `D:\Shadowframe-Install-Tests`, verifies all installed sizes, exercises the production uninstaller, and removes only that unique test folder.

## Distribution status

- **Wan pack:** the selected Comfy-Org Wan 2.2 repackaged files identify Apache-2.0 as their license. Retain the included third-party notices when redistributing.
- **Anima pack:** private/personal distribution only until explicit permission to redistribute the original checkpoint and LoRA binaries has been confirmed with every creator. Civitai's API-level usage permissions do not by themselves establish permission to republish the original files.

Neither large binary payload belongs in the Git repository. Publish installers through release storage after licensing review, malware scanning, and code signing.

## Planned photo-real model sets

These model families are registered in the Shadowframe UI as setup-required. They are not runnable until matching workflow JSON, checkpoint filenames, and model-pack payloads are verified.

### RedCraft Photo

Base model:

- RedCraft 2/3 — `https://civitai.red/models/958009/redcraft-or-2-or-3-int8int4fp8-scaled`
- Installed filename: `redcraft23INT8INT4FP8_30Krea2.safetensors`

Folder placement:

- Base checkpoint/diffusion model: `models/diffusion_models`
- LoRAs: `models/loras` or individual subfolders under `models/loras`

Downloaded LoRA filenames:

- `skintone_v2_krea2_loraholic.safetensors`
- `mons_pubis_krea2_loraholic.safetensors`
- `Purple_Grainy_Kr2_AM.safetensors`
- `PornMaster_Krea2_Asian_slider_V1.safetensors`
- `Purple_Graphics_KR2.safetensors`
- `transparent_clothes_krea2_v1.safetensors`
- `Krea2_Cinematic_Artstyle.safetensors`
- `krea2_rt_v1_5_epoch_10.safetensors`
- `breast_size_v2_krea2_loraholic.safetensors`
- `krea2_better_pussy_poses_v4.1.safetensors`
- `hina_krea2Turbo_lora_tqd_v3.0.safetensors`
- `@motocross_saito_v0_0_0_cr_0010.safetensors` — Moto Saito

### Moody Real Photo

Base model:

- Moody Real Mix — `https://civitai.com/models/621441/moody-real-mix`
- Installed filename: `moodyRealMix_xhsEdition.safetensors`

Folder placement:

- Base checkpoint/diffusion model: `models/diffusion_models`
- LoRAs: `models/loras` or individual subfolders under `models/loras`

Downloaded LoRA filenames:

- `m99_labiaplasty_pussy_6_zimage.safetensors`
- `breast_size_v2_loraholic.safetensors`
- `MidJourneyNSFWZ.safetensors`
- `zib-uncensored_v1_ep15.safetensors`
- `60sPsyZBase.safetensors`
- `areolas_size_loraholic.safetensors`
- `skintone_v2_loraholic.safetensors`
- `rope bondage V2.safetensors`
- `egypt queen v2.safetensors`
- `chain collar.safetensors`
- `Nostalgic_Cinema_zit_final.safetensors`
- `Fashion Generator.safetensors`
- `crowd street.safetensors`
- `Chun Li V2.safetensors`

### LTX 2.3 Video

Base model:

- LTX 2.3 GTAnimation — `https://civitai.red/models/1295569/ltx-23-gtanimation-or-25-frames-in-5s-12g-vram`
- Installed filename: `ltx23Gtanimation25Frames_ltxv23INT4Convrot.safetensors`

Folder placement:

- Base checkpoint/diffusion model: `models/diffusion_models`
- LoRAs: `models/loras` or individual subfolders under `models/loras`

Downloaded LoRA filenames:

- `ltx23-i2v-swing-up-down-os.safetensors`
- `ltx23-i2v-swing-in-out-os.safetensors`
- `ltx-face-prior-f1-profile-correction-step11019.safetensors`
- `mila_ltx23_lora.safetensors`
- `Bonnie_Rabbit_LTX_v1.safetensors`

## Phase 3 verification

- Reusable installer: clean install, repair, modified-file preservation, and uninstall passed with an isolated fixture pack.
- Anima production pack: full 10 GiB extraction, installed-file size checks, and production uninstall passed.
- Wan production pack: full 64.33 GiB extraction, installed-file size checks, and production uninstall passed.
- Both production packs: full payload SHA-256, installed byte totals, archive file counts, and exact archive-to-manifest path comparisons passed.
- Installer project: Release build completed with zero warnings and zero errors.

