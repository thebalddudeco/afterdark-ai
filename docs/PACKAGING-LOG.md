# Shadowframe Packaging Log

## Phase 1 - Standalone Core

Goal: remove the dependency on the developer PC's existing ComfyUI installation.

Completed:

- Staged a self-contained Core folder under `release\Shadowframe-Core`.
- Included private Python, Node.js, ComfyUI, bridge, scripts, and launcher.
- Moved mutable state to `%LOCALAPPDATA%\Shadowframe`.
- Added runtime manifest checks.
- Added isolated startup testing on alternate ports.

Result: Core can be staged and smoke-tested without borrowing the developer ComfyUI process.

## Phase 2 - Windows Installer

Goal: turn Core into a normal Windows app installation.

Completed:

- Built a per-user installer in `release\Shadowframe-Installer`.
- Added prerequisite checks and full Core archive validation.
- Added repair/update behavior with rollback.
- Added Start Menu/Desktop shortcuts and Windows Installed Apps registration.
- Added uninstall behavior that preserves user data by default.
- Added silent install and uninstall options.

Result: Shadowframe Core can be installed, repaired, updated, and removed like a normal Windows app.

## Phase 3 - Model Packs

Goal: split large model files into independently installable packs.

Completed:

- Built reusable model-pack installer mode.
- Added Anima Image Models pack.
- Added Wan 2.2 Video Models pack.
- Added per-pack manifests, third-party notices, checksums, receipts, and safe uninstall.
- Added production verification for archive hash, installed byte count, file count, and manifest paths.
- Completed full Anima production extraction/uninstall test.
- Verified the complete Wan production archive and manifest.

Result: model packs are separate from Core and can be repaired, updated, and uninstalled independently.

## Phase 4A - Release Audit

Goal: confirm repository and release readiness before broader distribution.

Completed:

- Confirmed `release` payloads are ignored by Git.
- Confirmed current Core, Anima, and Wan artifacts exist.
- Confirmed GitHub Pages build succeeds.
- Confirmed desktop installer builds successfully.
- Confirmed desktop launcher builds successfully.
- Fixed lint scope so generated release files are excluded.
- Fixed one React lint error in bridge initialization.
- Confirmed lint exits with warnings only.

Remaining:

- Clean-machine installer test.
- Real generation acceptance tests.
- Code signing.
- External storage choice for large model payloads.
- Redistribution review for non-Wan model binaries.

## Phase 4B - Installer Acceptance

Goal: exercise the release-candidate installers and full model payloads through isolated install, repair, extraction, and uninstall paths.

Completed:

- Confirmed no registered Shadowframe Core install was present before automated installer testing.
- Confirmed no Shadowframe Core state file was running before automated installer testing.
- Confirmed available disk space for full production model-pack extraction.
- Ran `pnpm models:verify`; Anima and Wan production artifacts passed.
- Ran `pnpm core:test`; Core isolation passed with ComfyUI 0.18.5, Python 3.12.11, and bridge HTTP 200.
- Ran `pnpm installer:test`; clean install, installed runtime startup, repair/update, uninstall, and user-data preservation passed.
- Ran `pnpm models:test`; clean install, repair, modified-file preservation, and safe uninstall passed.
- Ran production Anima model-pack extraction/uninstall from the 10.00 GiB payload; passed.
- Ran production Wan model-pack extraction/uninstall from the 64.33 GiB payload; passed.

Notes:

- Windows Sandbox feature status could not be inspected from this session because the query requires elevation.
- The full Wan production extraction was validated in an isolated `D:\Shadowframe-Install-Tests` target, not on a separate physical or virtual clean machine.

Remaining:

- Clean-machine test on a separate Windows system with supported NVIDIA GPU.
- Real generation acceptance tests for txt-img, img-img, img-vid, and txt-vid.
- Code signing.
- External storage choice for large model payloads.
- Redistribution review for non-Wan model binaries.

## Phase 4C - Beta Handoff Package

Goal: create a trusted-tester package that can be handed to someone later without requiring them to understand the repository layout.

Completed:

- Added `desktop\Build-Shadowframe-BetaPackage.ps1`.
- Added `pnpm beta:build`.
- Added `scripts\Verify-Shadowframe-Installation.ps1`.
- Added `docs\BETA-HANDOFF.md`.
- Built `release\Shadowframe-Beta-Handoff`.
- Created numbered folders for Core, Anima, and Wan installation.
- Added start-here, system requirements, troubleshooting, known issues, install order, and beta test notes.
- Added normal and full-hash verification command wrappers.
- Added `BETA-SHA256SUMS.txt` for the complete handoff folder.
- Used hardlinks for large payloads when possible, avoiding another physical copy on the same drive.

Verification:

- The beta builder completed successfully.
- The handoff folder contains 27 files.
- The handoff folder references approximately 79.1 GiB of payload files.
- The verifier runs and reports expected missing-install failures on the development machine because no normal Shadowframe Core/model-pack installation is currently registered.

Remaining:

- Transfer or host the beta handoff folder for a trusted tester.
- Run `Verify Installation.cmd` after installing all three packages on the beta target.
- Run real generation acceptance tests for txt-img, img-img, img-vid, and txt-vid.
- Capture tester logs and screenshots for failures.

## Phase 5 Planning - Installer Hub and Storage Locations

Goal: replace the manual three-step install handoff with a single guided installer experience that can install Core and then chain selected model packs into user-selected storage locations.

Design decisions:

- The Core installer should ask for two different roots:
  - **Application location** — where Shadowframe Core, the launcher, bundled runtime, scripts, and bridge live.
  - **Generation storage location** — where user uploads, generated outputs, logs, and runtime state live.
- The installer should not ask for a separate input folder. When a user drags an image into the generator, Shadowframe should automatically save that source image under `input` beside the chosen output folder.
- Model storage can be chosen separately from the application and generation storage locations because model packs are large and may belong on a different drive.
- Storage should be split into explicit subfolders:
  - `input`
  - `output`
  - `State`
  - `Logs`
- Model-pack installers should no longer assume `%LOCALAPPDATA%\Shadowframe\models`.
- Core should write a shared storage configuration and registry values during install.
- Model packs should read the Core storage location by default, while still allowing `/DATAROOT=` for advanced or silent installs.
- The Core installer should be able to launch bundled or adjacent model-pack installers after Core is installed.
- The UI should expose the output folder location so users can save generations directly to a preferred drive instead of manually downloading each result.

Recommended installer flow:

1. Choose Shadowframe app location.
2. Choose generation storage location.
3. Choose model storage location.
4. Show required disk space for selected model packs.
5. Install Core.
6. Offer checkboxes for Anima, Wan, and future photo-real model packs.
7. Run each selected model pack with the chosen model storage root.
8. Launch Shadowframe and run the verifier.

Notes:

- Network shares are supported only as advanced storage targets. Model loading across a network can be slow and fragile compared with local SSD/NVMe storage.
- HDD storage is acceptable for large model libraries, but generation startup and model switching will be slower than SSD/NVMe.
- If a storage root is changed later, Shadowframe should either move existing folders or create safe junctions after confirming exact source and destination paths.

Remaining:

- Rebuild the large Core installer artifact after the source patch.
- Add app settings for default output folder and recent-generation indexing.
- Add a photo-real image model pack once the exact checkpoint and workflow are selected.

## Phase 5C - Core Installer Orchestration Update

Goal: keep the pack-based distro, but make the Core installer run model-pack installers for the user and surface prompt samples at the end of the same wizard.

Completed:

- Added Core installer fields for application install location, Shadowframe library location, and generation output location.
- Persisted selected `DataRoot` and `OutputRoot` values in the install receipt and Windows uninstall registry key.
- Updated the installed runtime launcher to use the selected library location for `models`/state and the selected generation location for `input`, `output`, and `temp`.
- Added automatic discovery and silent launch of adjacent `Install Shadowframe * Models.exe` pack installers, passing the selected Shadowframe library location with `/DATAROOT=`.
- Added final wizard text, “Check out our sample prompts here,” with direct folder buttons for SFW and NSFW prompt samples.
- Updated the installer distro builder to separate sample prompts into `Sample Prompts\SFW\<model set>` and `Sample Prompts\NSFW\<model set>`.
- Updated the beta handoff builder and installation verifier for selected storage roots and one-installer model-pack chaining.

Validation:

- `desktop\Shadowframe.Installer\Shadowframe.Installer.csproj` builds successfully in Release configuration.
- A full `release\Shadowframe-Installer` rebuild was started with the existing Core package, but the large Core tar packaging pass exceeded the interactive tool window and left only the newly built Setup EXE plus a zero-byte partial tar. Re-run `pnpm installer:build` or `desktop\Build-Shadowframe-Installer.ps1 -SkipCoreBuild` before distributing.

Notes:

- The model-pack installers still remain independently runnable as a manual fallback.
- Core Setup discovers Anima, Wan, and PhotoReal packs by filename, so the PhotoReal pack will be included automatically once its release folder exists.

## Phase 5D - PhotoReal Model Pack Build

Goal: create the missing PhotoReal model-pack installer so Core Setup can install it automatically with Anima and Wan.

Completed:

- Added `PhotoReal` to `desktop\Build-Shadowframe-ModelPacks.ps1`.
- Built `release\Shadowframe-PhotoReal-Models`.
- Created `Install Shadowframe PhotoReal Models.exe`.
- Packaged RedCraft, Moody Real Mix, LTX 2.3 GTAnimation, shared Qwen support files, and configured PhotoReal LoRAs.
- Rebuilt `release\Shadowframe-Beta-Handoff` so it includes `04 Install PhotoReal Models`.
- Updated the installation verifier and model-pack artifact verifier to include `photoreal-models`.

Validation:

- PhotoReal model-pack artifact verification passed.
- PhotoReal payload contains 37 files and is 64.89 GiB.

Notes:

- The PhotoReal pack is currently marked `private-use` in its manifest because third-party redistribution permissions are not fully confirmed.

## Phase 5A - Sample Prompt Distro Update

Goal: give new users ready-to-copy positive prompt examples for the photo and video model families.

Completed:

- Added source-controlled prompt sample folders under `samples`.
- Added RedCraft, LTX, and Moody Real Mix positive prompt packs.
- Translated Chinese, Japanese, and Russian source text into English.
- Normalized onboarding examples so human subjects are clearly adult and risky scenes are framed as consensual/editorial where needed.
- Added RedCraft Moto Saito LoRA registration using `@motocross_saito_v0_0_0_cr_0010.safetensors`.
- Added a Moto Saito pixel-art starter prompt.
- Updated the Core installer distro builder to copy `samples` into `Sample Prompts`.
- Refreshed the local `release\Shadowframe-Installer\Sample Prompts` folder.
- Refreshed the local `release\Shadowframe-Beta-Handoff\01 Install Shadowframe Core\Sample Prompts` folder.

Notes:

- The `release` folder remains intentionally ignored by Git because it contains large installer payloads.
- The pushed repository contains the source prompt folders and build-script hook needed to regenerate the distro samples.

## Phase 5B - Versioned 0.3.1 Distro Refresh

Goal: turn the sample prompt update into a versioned distro refresh instead of a source-only checkpoint.

Completed:

- Bumped package metadata, Core manifest, launcher project, installer project, installer product version, and installer manifest version to `0.3.1`.
- Updated model-pack minimum Core version metadata to `0.3.1` for newly rebuilt packs.
- Renamed the RedCraft sample file to `017-moto-saito-pixel-art.txt`.
- Updated changelog, release notes, packaging log, and model-pack notes for Moto Saito and prompt sample distro contents.

Validation plan:

- Run source lint. Completed with warnings only.
- Run GitHub Pages production build. Completed.
- Rebuild Shadowframe Core staging. Completed.
- Rebuild Shadowframe Installer distro. Completed.
- Rebuild model-pack manifests/installers with reused Anima and Wan payload archives. Completed.
- Refresh beta handoff package checksums. Completed.

Build results:

- Core installer manifest version: `0.3.1`.
- Core installer payload hash: `B7DB450643A6D6F65424BBBBF10D8308BDF89E6E4F94232415F5007E7FC42981`.
- Core installer payload size: 4.54 GiB tar, 4.40 GiB uncompressed file bytes.
- Core installer file count: 73,954.
- Anima model-pack minimum Core version: `0.3.1`.
- Wan model-pack minimum Core version: `0.3.1`.
- Beta handoff checksum entries: 100.
- Beta handoff Core folder includes:
  - `redcraft-prompts`: 18 files.
  - `ltx-prompts`: 11 files.
  - `moody-prompts`: 45 files.
- `BETA-SHA256SUMS.txt` includes `01 Install Shadowframe Core/Sample Prompts/redcraft-prompts/017-moto-saito-pixel-art.txt`.

Packaging fix:

- Replaced the Core installer builder's direct `tar.exe` path with a PowerShell 7 managed TAR helper when available.
- The managed archive path fixed the interrupted zero-byte `.partial` Core archive issue observed during the first `0.3.1` rebuild attempt.

Distribution note:

- Large `release` artifacts remain local and ignored by Git. GitHub receives the versioned source, scripts, prompt samples, and documentation needed to reproduce the distro.

## Phase 5E - LTX Workflow Activation

Goal: make the PhotoReal video model usable inside Shadowframe instead of leaving LTX 2.3 GTAnimation as a setup-only placeholder.

Completed:

- Added `app\lib\ltx-img-video-workflow.json`.
- Enabled `LTX 2.3 GTAnimation` for Image → Video.
- Added backend routing for the LTX workflow.
- Added automatic LTX LoRA trigger prompt injection using the existing style preset system.
- Normalized nested LoRA paths before sending workflows to ComfyUI.
- Updated LTX UI defaults to 768 × 512 and 25 frames.
- Updated the PhotoReal model-pack script so the LTX GTAnimation file installs under `models\checkpoints`.
- Added a local hardlink from the existing ComfyUI diffusion model copy into `models\checkpoints` so the current beta machine can test without duplicating the 16 GiB file.
- Bumped app, launcher, installer, Core manifest, and model-pack minimum Core metadata to `0.3.2`.

Validation:

- Vinext production build completed.
- GitHub Pages production build completed.
- ComfyUI accepted the LTX Image → Video workflow.
- ComfyUI accepted the LTX Image → Video workflow with an LTX LoRA selected.
- Rebuilt `release\Shadowframe-PhotoReal-Models`.
- Rebuilt PhotoReal payload file count: 37.
- Rebuilt PhotoReal payload size: 64.89 GiB.
- Rebuilt PhotoReal payload SHA-256: `4103D035D104F54478B295592AE0482FA7B78AAF8697279184FC91167484D568`.
- Rebuilt PhotoReal manifest minimum Core version: `0.3.2`.
- Rebuilt PhotoReal manifest installs LTX GTAnimation to `checkpoints/ltx23Gtanimation25Frames_ltxv23INT4Convrot.safetensors`.
- Rebuilt `release\Shadowframe-Core`.
- Rebuilt `release\Shadowframe-Installer`.
- Rebuilt Core installer manifest version: `0.3.2`.
- Rebuilt Core installer payload file count: 73,954.
- Rebuilt Core installer payload SHA-256: `5D383D066862287FB8B488656CBDFC544EDCA26A23E5A746B2B589CA9E318A7B`.
- Rebuilt `release\Shadowframe-Beta-Handoff`.
- Refreshed beta handoff checksum entries: 105.
- Beta handoff Core tar checksum matches `5D383D066862287FB8B488656CBDFC544EDCA26A23E5A746B2B589CA9E318A7B`.
- Beta handoff PhotoReal tar checksum matches `4103D035D104F54478B295592AE0482FA7B78AAF8697279184FC91167484D568`.

Notes:

- The current LTX workflow is intentionally one-pass. A later quality pass can add the heavier two-stage upscale chain once the base LTX path is proven in normal use.
