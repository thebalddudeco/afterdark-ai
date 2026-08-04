# Shadowframe AI Release Notes

## Release Candidate: 0.3.0

Shadowframe AI is now packaged as a Windows-first local generation stack. The app can be distributed without requiring the recipient to already have ComfyUI, Python, Node.js, Git, or this development repository installed.

## Package Layout

Shadowframe is split into three packages:

- Shadowframe Core: desktop app, bundled ComfyUI runtime, private bridge, local web service, workflow code, scripts, and runtime manifest.
- Anima Image Models: WAI-ANIMA, Anima Aesthetic, Qwen encoder/VAE, and configured Anima LoRAs.
- Wan 2.2 Video Models: Wan 2.2 I2V/T2V high and low noise models, UMT5 encoder, Wan VAE, and Lightx2v LoRAs.

Core must be installed first. Model packs install independently into `%LOCALAPPDATA%\Shadowframe\models`.

## Current Build Outputs

- `release\Shadowframe-Installer\Shadowframe Setup.exe`
- `release\Shadowframe-Installer\Shadowframe-Core.tar`
- `release\Shadowframe-Anima-Models\Install Shadowframe Anima Models.exe`
- `release\Shadowframe-Anima-Models\Shadowframe-Anima-Models.tar`
- `release\Shadowframe-Wan-Models\Install Shadowframe Wan Models.exe`
- `release\Shadowframe-Wan-Models\Shadowframe-Wan-Models.tar`

The `release` folder is intentionally ignored by Git. These files are release artifacts, not repository source.

## Validation Completed

- Core staging and isolated startup tests passed.
- Core installer build completed.
- Installer lifecycle testing covered install, repair/update, uninstall, and data preservation.
- Reusable model-pack installer lifecycle testing passed.
- Anima production model-pack extraction and uninstall passed.
- Wan production model-pack extraction and uninstall passed from the full 64.33 GiB payload.
- Anima and Wan production payloads passed whole-archive SHA-256 and manifest verification.
- GitHub Pages app build passed.
- Desktop launcher and installer projects build successfully.
- Source lint completes with warnings only.

## Remaining Acceptance Tests

- Test Core, Anima, and Wan installers on a clean Windows system with a supported NVIDIA GPU.
- Run real generation tests for all supported modes.
- Confirm code-signing strategy for production EXEs.
- Confirm public redistribution rights for every non-Wan model binary before hosting Anima model payloads publicly.

## Distribution Notes

GitHub is appropriate for source code, documentation, and small installer metadata. Large model payloads should be hosted separately because the current model archives are approximately 10.00 GiB and 64.33 GiB.

The Wan pack uses sources identified as Apache-2.0. The Anima pack is marked private-use until explicit redistribution permission is confirmed.
