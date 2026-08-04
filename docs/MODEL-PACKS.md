# Shadowframe model packs

Shadowframe is distributed as three Windows packages:

1. **Shadowframe Core** — the desktop app, private bridge, bundled ComfyUI runtime, and workflow code.
2. **Anima Image Models** — WAI-ANIMA, Anima Aesthetic, the shared Qwen text encoder/VAE, and the configured Anima LoRAs.
3. **Wan 2.2 Video Models** — Wan 2.2 image-to-video and text-to-video high/low-noise models, the shared UMT5 encoder/VAE, and Lightx2v acceleration LoRAs.

Install Core first. Model packs install into `%LOCALAPPDATA%\Shadowframe\models`, are independently repairable, and appear separately in Windows Installed Apps.

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

## Phase 3 verification

- Reusable installer: clean install, repair, modified-file preservation, and uninstall passed with an isolated fixture pack.
- Anima production pack: full 10 GiB extraction, installed-file size checks, and production uninstall passed.
- Wan production pack: full 64.33 GiB extraction, installed-file size checks, and production uninstall passed.
- Both production packs: full payload SHA-256, installed byte totals, archive file counts, and exact archive-to-manifest path comparisons passed.
- Installer project: Release build completed with zero warnings and zero errors.
