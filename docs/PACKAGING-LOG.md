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

- Add Core installer controls for generation storage root and model storage root.
- Persist storage choices in the install receipt, registry, and runtime environment.
- Update model-pack defaults to read the Core model storage root from registry.
- Add optional post-Core model-pack chaining.
- Add app settings for default output folder and recent-generation indexing.
- Add a photo-real image model pack once the exact checkpoint and workflow are selected.
