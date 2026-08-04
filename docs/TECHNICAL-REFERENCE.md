# Shadowframe AI Technical Reference

## Overview

Shadowframe AI is a local Windows application that wraps a private ComfyUI runtime behind a controlled desktop launcher and bridge. The public site provides the interface, while generation runs on the user's PC.

## Runtime Components

- Desktop launcher: `desktop\Shadowframe.Launcher`
- Installer engine: `desktop\Shadowframe.Installer`
- Web app: `app`
- GitHub Pages frontend: `github-pages`
- Bridge scripts: `scripts\Start-Shadowframe-Bridge.ps1` and `scripts\Start-Shadowframe-Core.ps1`
- Runtime manifest: `desktop\core-manifest.json`
- Workflows: `app\lib\*.json`
- Style registry: `app\lib\style-presets.ts`

## Installed Layout

Core installs application files to:

```text
%LOCALAPPDATA%\Programs\Shadowframe AI
```

Mutable data is stored separately at:

```text
%LOCALAPPDATA%\Shadowframe
```

The mutable data root contains models, input files, output files, temporary files, custom nodes, bridge state, and model-pack receipts.

## Private Bridge

The bridge connects the public interface to the local runtime. It:

- Listens on private local services.
- Requires a bearer-style private access key.
- Allows only approved Shadowframe origins.
- Proxies only the ComfyUI endpoints needed by the app.
- Keeps prompts, source images, outputs, model files, and bridge keys off GitHub.

Permanent friend access can use a Cloudflare tunnel at `bridge.shadowframe.tech`, but the private access key remains required.

## Generator Modes

- Text to Image: Anima image workflows.
- Image to Image: Anima image workflows with High, Balanced, and Creative reference fidelity.
- Image to Video: Wan 2.2 I2V workflow.
- Text to Video: Wan 2.2 T2V workflow.

## Model Compatibility

The UI filters base models and LoRAs by mode and compatibility. The app should not show incompatible LoRAs for the selected base model.

Current image bases:

- WAI-ANIMA v1.0
- Anima Aesthetic v1.1

Current video base:

- Wan 2.2 I2V/T2V A14B FP8

## Packaging Commands

```powershell
pnpm core:build
pnpm core:test
pnpm installer:build
pnpm installer:test
pnpm models:build
pnpm models:test
pnpm models:verify
pnpm build:pages
pnpm lint
```

## Installer Guarantees

The Core installer:

- Verifies Windows version, NVIDIA GPU presence, WebView2, disk space, and payload hash.
- Extracts to a staging folder before replacing the active install.
- Rolls back when installation fails.
- Registers per-user uninstall entries.
- Preserves user data by default.

The model-pack installers:

- Require a compatible Shadowframe Core installation unless explicitly overridden.
- Verify the full payload archive before extraction.
- Record installed file hashes.
- Repair/update independently.
- Uninstall only files that still match the recorded hashes.

## Repository Safety

The following must not be committed:

- `release`
- `.shadowframe`
- `.env.local`
- generated ComfyUI outputs
- private bridge keys
- Cloudflare tunnel tokens
- model binaries unless licensing and file-size policy explicitly allow it

The repository should contain source code, scripts, docs, manifests, workflows, and small brand assets only.
