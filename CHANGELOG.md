# Changelog

All notable Shadowframe AI packaging and application changes are tracked here.

## 0.3.1 - Sample Prompt Distro Refresh

### Added

- Added starter positive prompt packs for RedCraft, LTX, and Moody Real Mix.
- Added English translations for Chinese, Japanese, and Russian sample prompt text.
- Added RedCraft Moto Saito LoRA registration and sample prompt.
- Added installer distro support for copying source prompt samples into `Sample Prompts`.
- Added Core installer controls for app location, Shadowframe library/model location, and generation output location.
- Added Core installer orchestration for adjacent Anima, Wan, and PhotoReal model-pack installers.
- Added final installer links for separated SFW and NSFW sample prompt folders.
- Added a PhotoReal model-pack build target and created the first local `Install Shadowframe PhotoReal Models.exe` release folder.

### Changed

- Bumped Shadowframe Core, installer, launcher, and repository package version metadata to `0.3.1`.
- Updated release notes, packaging logs, and model-pack notes for the sample prompt distro refresh.
- Normalized onboarding prompt samples so human subjects are clearly adult and risky scenarios are framed as consensual/editorial examples.
- Updated Core runtime launch so selected model/state and input/output storage locations are honored.
- Updated beta handoff notes so testers run Core Setup first and let it chain the available model packs.

### Validation

- Source lint completes with warnings only.
- GitHub Pages production build completes.
- RedCraft, LTX, and Moody sample folders are present in the local installer distro.
- Shadowframe installer project compiles successfully in Release configuration.
- PhotoReal model-pack build completed locally with 37 files and a 64.89 GiB payload.

## 0.3.0 - Standalone Packaging Release Candidate

### Added

- Added a standalone Shadowframe Core package that bundles the desktop launcher, private bridge, ComfyUI runtime, Python runtime, Node.js runtime, workflows, and scripts.
- Added a per-user Windows installer for Shadowframe Core with repair, update, rollback, shortcut creation, Installed Apps registration, silent install, and data-preserving uninstall support.
- Added independent Anima and Wan 2.2 model-pack installers.
- Added full archive SHA-256 validation and per-model hash receipts for model packs.
- Added safe model-pack uninstall behavior that removes only files whose hashes still match the installed receipt.
- Added production model-pack verification scripts for payload hash, byte count, archive path, and manifest consistency.
- Added a beta handoff package builder with numbered installer folders, start-here notes, troubleshooting, known issues, checksums, and installation verification commands.
- Added a beta installation verifier for Core registration, WebView2, NVIDIA GPU, model-pack receipts, model presence, file sizes, and optional full hashes.
- Added release documentation for Core, Windows installer, model packs, packaging logs, technical architecture, and release checklist.
- Added GitHub Pages production build checks to the release audit.
- Added starter positive prompt packs for RedCraft, LTX, and Moody Real Mix, including translated English samples for new users.
- Added RedCraft Moto Saito LoRA registration and a matching pixel-art sample prompt.

### Changed

- Renamed the product surface from Afterdark AI to Shadowframe AI.
- Updated the desktop launcher visual shell, including Shadowframe branding, custom icon assets, startup status, single-instance protection, and clearer Stop & Exit copy.
- Updated the public app to use a mandatory bridge connection dialog when a private bridge token is required.
- Updated image workflows to use Anima image models and Wan 2.2 for video workflows.
- Updated visual style filtering so only compatible LoRAs appear for the selected base model and mode.
- Updated lint configuration so generated release artifacts are excluded from source linting.
- Updated the Windows installer distro builder so `Sample Prompts` are copied beside the installer files.

### Fixed

- Fixed a launcher startup deadlock caused by background bridge output handles being inherited by the desktop app.
- Fixed a React lint error in bridge initialization by deferring browser-session pairing state updates.
- Fixed model-pack installer repair behavior and uninstaller file-handle cleanup.
- Fixed build scripts so large tar payloads can be reused and verified without unnecessary recopying.
- Fixed release verification so PowerShell hashing uses direct .NET SHA-256 helpers when command shims are unreliable.

### Known Release-Blocking Items

- Run a clean-machine install test for Core, Anima, and Wan on a Windows machine without the developer ComfyUI setup.
- Run real generation acceptance tests for txt-img, img-img, img-vid, and txt-vid.
- Decide external storage for large model payloads. Do not commit model archives to Git.
- Code-sign production EXEs before broad distribution.
