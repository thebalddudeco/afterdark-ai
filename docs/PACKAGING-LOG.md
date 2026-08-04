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
