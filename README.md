# Shadowframe AI

![Shadowframe AI](public/brand/github-banner.png)

A focused local interface for running creative generation workflows through ComfyUI.

Public interface: https://shadowframe.tech/

Brand assets and usage guidance are documented in [BRAND.md](BRAND.md).

## Documentation

- [Changelog](CHANGELOG.md)
- [Release notes](docs/RELEASE-NOTES.md)
- [Release checklist](docs/RELEASE-CHECKLIST.md)
- [Packaging log](docs/PACKAGING-LOG.md)
- [Beta handoff](docs/BETA-HANDOFF.md)
- [Technical reference](docs/TECHNICAL-REFERENCE.md)
- [GitHub repository notes](docs/GITHUB-REPOSITORY-NOTES.md)
- [Phase 1 Core](docs/PHASE-1-CORE.md)
- [Phase 2 Installer](docs/PHASE-2-INSTALLER.md)
- [Model packs](docs/MODEL-PACKS.md)

## Shadowframe for Windows

`Shadowframe.exe` is the recommended daily launcher on Windows. It starts legacy ComfyUI and the private bridge, pairs the connection automatically, and opens the public interface inside a dedicated desktop window. Its toolbar includes Friend Access, Restart Bridge, and Stop & Exit controls.

Build it from source by running `desktop/Build-Shadowframe.ps1`. The build creates a self-contained Windows x64 executable in the project root and a **Shadowframe AI** desktop shortcut. The generated executable and local release folder are intentionally ignored by Git.

The GitHub Pages interface connects to ComfyUI through the authenticated Shadowframe Bridge running on your PC. GitHub never receives model files, prompts, generated media, or the private bridge access key.

### Standalone Core (Phase 1)

The Phase 1 Core staging package no longer depends on the developer PC's existing ComfyUI, Python, or Node.js installations. It carries private copies of those runtimes and stores application data under `%LOCALAPPDATA%\Shadowframe`. Model checkpoints and LoRAs remain separate so the later installer can offer smaller, replaceable model packs.

Build it with `pnpm core:build` and verify the staged copy with `pnpm core:test`. The output is written to `release/Shadowframe-Core` and is intentionally ignored by Git. See [docs/PHASE-1-CORE.md](docs/PHASE-1-CORE.md) for scope, test behavior, and the clean-machine checks required before distribution.

### Windows Installer (Phase 2)

`pnpm installer:build` creates a per-user Windows installer in `release/Shadowframe-Installer`. Setup verifies Windows, NVIDIA GPU, WebView2, free space, and the complete Core payload before installing. It supports rollback-safe repair/update installs, Windows Installed Apps registration, shortcuts, silent deployment, and data-preserving uninstall. See [docs/PHASE-2-INSTALLER.md](docs/PHASE-2-INSTALLER.md) for distribution and release requirements.

### Model Packs (Phase 3)

`pnpm models:build` creates independent Anima and Wan model-pack installers. Each pack verifies its full archive and records per-model hashes, installs into `%LOCALAPPDATA%\Shadowframe\models`, supports repair/update, and registers its own safe uninstaller in Windows Installed Apps. Run `pnpm models:test` for the small automated installer lifecycle test. See [docs/MODEL-PACKS.md](docs/MODEL-PACKS.md) for contents, build options, and distribution restrictions.

## Shadowframe Bridge

1. Start ComfyUI and confirm it is available at `http://127.0.0.1:8188`.
2. Install Cloudflare Tunnel once with `winget install --id Cloudflare.cloudflared`.
3. Double-click `Start Shadowframe Bridge.cmd`.
4. The launcher builds the local bridge, reuses a private access key stored only on the PC, starts the secure tunnel, and opens `shadowframe.tech` already paired to it.
5. Keep ComfyUI and the bridge running while generating. Double-click `Stop Shadowframe Bridge.cmd` when finished.

The bridge listens only on `127.0.0.1`, accepts requests only from Shadowframe's approved website origins, requires a private bearer key, and exposes only the ComfyUI endpoints needed by the application. The key is transferred in the URL fragment, which browsers do not send to GitHub, and is kept in session storage rather than committed to the repository.

## Persistent friend access

1. In Cloudflare, create a remotely managed tunnel named `Shadowframe`.
2. Add the public hostname `bridge.shadowframe.tech` with service `http://localhost:3001`.
3. Copy its tunnel token and run `Configure Permanent Bridge.cmd` once.
4. Run `Enable Shadowframe Auto-Start.cmd` once so legacy ComfyUI and the bridge start after Windows sign-in.
5. Run `Show Friend Access.cmd` whenever you need the permanent address and private key to share.

The private key and Cloudflare tunnel token are stored only in the ignored `.shadowframe` folder and are restricted to the current Windows account. Never commit or publicly post either value. Use `Disable Shadowframe Auto-Start.cmd` to remove the startup task.

## Generator modes

- Text to Image
- Image to Image
- Image to Video
- Text to Video

All four modes are wired to local ComfyUI API workflows. Video generation uses Wan, while both image modes use Anima.

## Included image workflows

### Text to Image and Image to Image — Anima

- `models/diffusion_models/waiANIMA_v10Base10.safetensors`
- `models/diffusion_models/anima-aesthetic-v1.1.safetensors`
- `models/text_encoders/qwen_3_06b_base.safetensors`
- `models/vae/qwen_image_vae.safetensors`

Both WAI-ANIMA v1.0 and Anima Aesthetic v1.1 are selectable in Text to Image and Image to Image. The workflows run 25 steps with ER-SDE, CFG 4.5, and a recommended maximum 1.5× output scale. Image to Image includes High, Balanced, and Creative reference-fidelity levels. Balanced is the default at 0.50 denoise and 0.85 LoRA strength; High uses 0.35/0.70, while Creative uses 0.70/1.00.

## Engine-aware style presets

The interface filters style LoRAs by generator mode and base-model compatibility. Wan video modes show only Wan-compatible styles, while both Anima image bases show their shared Anima styles.
The base-model selector is mode-aware. The Visual Style area only shows Original plus LoRAs built for the selected checkpoint, preventing incompatible LoRAs from being mixed with the wrong model family.

Shadowframe AI passes consensual adult prompts directly to the selected local ComfyUI workflow. The generation endpoint rejects prompts involving minors, sexual violence or coercion, and sexual content involving animals.

### Anima image models

Place `waiANIMA_v10Base10.safetensors` and `anima-aesthetic-v1.1.safetensors` in `models/diffusion_models`, `qwen_3_06b_base.safetensors` in `models/text_encoders`, and `qwen_image_vae.safetensors` in `models/vae`. Both workflows use 25 steps, CFG 4.5, ER-SDE with the simple scheduler, and cap output scaling at the recommended 1.5×.

The separate Anima Aesthetic v1.1 base uses `anima-aesthetic-v1.1.safetensors` with the same encoder and VAE. Both Anima Aesthetic and WAI-ANIMA expose the same compatible presets: Xipa, Niji, Soft Anime, Deepthroat, Suuru, Line Art, Micro Detail, Sex Queue, Puffy Pussy, and Ripped Clothes. The app reads ComfyUI's installed LoRA list, adds each preset's published trigger word, and loads its clean `Anima_*` filename at strength 1.0.

## Included Image to Video workflow

The template expects these model files to be available to ComfyUI:

- `wan2.2_i2v_high_noise_14B_fp8_scaled.safetensors`
- `wan2.2_i2v_low_noise_14B_fp8_scaled.safetensors`
- `umt5_xxl_fp8_e4m3fn_scaled.safetensors`
- `wan_2.1_vae.safetensors`
- Wan 2.2 LightX2V high-noise and low-noise LoRAs

The Text to Video workflow additionally expects:

- `wan2.2_t2v_high_noise_14B_fp8_scaled.safetensors`
- `wan2.2_t2v_low_noise_14B_fp8_scaled.safetensors`
- `wan2.2_t2v_lightx2v_4steps_lora_v1.1_high_noise.safetensors`
- `wan2.2_t2v_lightx2v_4steps_lora_v1.1_low_noise.safetensors`

## Local setup

1. Start ComfyUI and confirm it is available at `http://127.0.0.1:8188`.
2. Install dependencies with `pnpm install`.
3. Copy `.env.example` to `.env.local` only if your ComfyUI address is different.
4. Start Shadowframe AI with `pnpm dev`.
5. Open the local address shown in the terminal.

## Configuration

`COMFYUI_URL` sets the ComfyUI server used by the local application:

```env
COMFYUI_URL=http://127.0.0.1:8188
```

The app proxies local ComfyUI requests through its own backend so ComfyUI does not need permissive browser CORS settings.

## Repository safety

The checked-in workflow is sanitized and contains no source image, private prompt, generated media, or machine-specific model path. Keep `.env.local`, local outputs, and personal workflows out of commits.

Use the application only with content and likenesses you are authorized to process.
