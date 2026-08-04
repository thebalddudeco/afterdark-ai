# Changelog

All notable Shadowframe AI packaging and application changes are tracked here.

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
