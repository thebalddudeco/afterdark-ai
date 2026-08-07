# Shadowframe AI Release Notes

## Working Notes: CatVTON Outfit Replace

Strict Outfit Replace has been moved away from the Comfy-account-gated Flux VTO node and is now wired to a local CatVTON workflow path. The app uses a source photo, garment reference image, automatic outfit mask, CatVTON try-on pass, and normal Shadowframe image output saving.

The CatVTON custom node is vendored under `vendor/custom_nodes/Comfyui-CatVTON`, and Core staging now copies Shadowframe-vendored custom nodes into the bundled ComfyUI runtime.

Current verification status: the web app build passes and the CatVTON custom node registers without startup-time dependency crashes. Full generation is not yet release-verified because Python 3.12 cannot build Detectron2/DensePose on this machine without Microsoft C++ Build Tools or a prebuilt compatible dependency pack. Do not publish this Outfit Replace update as a completed user release until CatVTON dependency packaging is resolved.

## Release Candidate: 0.3.5

This distro refresh versions Shadowframe as `0.3.5` and finalizes the public-release packaging lane. The public package is now clearly separated from the creator/private build: it starts in `public` profile mode, ships SFW sample prompts only, labels itself as the public edition in the installer, and validates uploads before they ever reach ComfyUI.

The current public handoff folder is:

- `release\\Shadowframe-Installer-Public`

The rebuilt public Core installer payload SHA-256 is `F36543F3D7A811CF7387C8C8A84F3BA21EA4C312CB5C2EB2D3C69CB84BB29BFD`.

The public installer bundle now also includes `Shadowframe-ReleaseProfile.json` with `public`, so the packaged installer and staged runtime agree on which profile should boot.

## Previous Release Candidate: 0.3.4

This distro refresh versions Shadowframe as `0.3.4` and turns the current repository into a release-safe build: the Core app, installer, launcher, and model-pack minimum-version metadata are aligned again, and the user-facing release only exposes the modes that are clean-install ready.

The PhotoReal compatibility guard remains in place for the RedCraft/Qwen3VL pairing, so stale or mismatched PhotoReal installs can be repaired instead of failing with a raw checkpoint-size error during generation.

The current source tree still contains the CatVTON Outfit Replace work, but Outfit Replace is disabled in the shipped release build until its local dependency chain is fully self-contained for new users. That keeps the public package honest: no Comfy login requirement, no manual Detectron2 build steps, and no half-working tab in the released app.

Public-release packaging now has its own lane:

- `pnpm installer:build:public` compiles the app in `public` profile mode
- the staged Core bundle carries a `release-profile.json` marker
- the installer bundle carries `Shadowframe-ReleaseProfile.json`
- the desktop runtime starts the local bridge with the public profile enabled
- the public installer ships SFW prompt samples only
- public uploads are validated before they are proxied into ComfyUI
- the public installer window now identifies itself as the public edition and hides any NSFW prompt button

The rebuilt local Core setup executable SHA-256 is `19173AD9BAED241221B8334CF755CC72E023C023743A2F84C6EDE0EC12F07CF7`.

The rebuilt local Core payload SHA-256 is `9E33B16AEB04350C69639DC492997CBD2E8781D1728C76BDFD6459B99F3859BE`.

The rebuilt PhotoReal model-pack payload remains `4A3249B1A003704FF0FFB51ABBA756784321EB70B7F525FB78A56F0264A379F3`, and its minimum supported Core version is now `0.3.5`.

## Release Candidate: 0.3.3

This distro refresh versions Shadowframe as `0.3.3` and upgrades the bundled ComfyUI runtime target to `0.30.0` so Krea2-based PhotoReal workflows can run.

RedCraft now uses the official Qwen3VL 4B FP8 text encoder path, and the PhotoReal model pack includes `qwen3vl_4b_fp8_scaled.safetensors` so fresh installs have the same dependency that fixed the beta machine.

Validation update: a local RedCraft text-to-image smoke test was accepted by ComfyUI and completed successfully after the runtime upgrade, producing `ShadowframeAI_REDCRAFT_00001_.png`.

The local PhotoReal model-pack artifact was rebuilt for this release. Its payload SHA-256 is `4A3249B1A003704FF0FFB51ABBA756784321EB70B7F525FB78A56F0264A379F3`.

PhotoReal Setup and the packaged installation verifier now perform a targeted RedCraft/Krea2 compatibility check for the exact RedCraft checkpoint and Qwen3VL encoder pair. If the app detects a stale or mismatched PhotoReal pack, it opens a self-repair dialog that can rerun the PhotoReal model-pack repair locally through the Shadowframe Bridge.

The local Core installer artifact was also rebuilt for this release. Its payload SHA-256 is `129BDDF6362886F6AB054E7D403ACF19DE1B422566410DF31F130AB9BB617BA8`.

Strict Outfit Replace is now available as its own tool. It takes a source model photo plus a garment reference image, then sends a locked backend wardrobe-replacement prompt so the app treats the job as clothing replacement rather than a fresh portrait generation.

Strict Outfit Replace now also asks the backend workflow to preserve realistic adult fabric tension and anatomical garment impressions for tight, sheer, lingerie, swimwear, t-shirt, dress, or similar wardrobe swaps.

The Outfit Replace panel has been simplified: prompt boxes are hidden, aspect-ratio presets live under Advanced Settings, custom sizing is hidden for this strict two-image tool, and the tab now appears at the far right of the generator switcher. Raw Flux VTO authorization errors are translated into a Comfy account sign-in message.

## Previous Release Candidate: 0.3.2

This distro refresh versions Shadowframe as `0.3.2` and activates the LTX 2.3 GTAnimation Image → Video workflow. LTX is now a real selectable video base model, its LoRAs are wired through the backend, and the PhotoReal model-pack script installs the LTX model as a checkpoint so ComfyUI can expose the matching model and VAE path.

Compatibility hotfix: RedCraft now performs a Krea2 runtime preflight before queuing, PhotoReal LoRAs are routed through model-only loading, and ComfyUI execution errors are surfaced directly in the Shadowframe UI for easier diagnosis.

The local PhotoReal model-pack artifact was rebuilt for this release. Its payload SHA-256 is `4103D035D104F54478B295592AE0482FA7B78AAF8697279184FC91167484D568`.

The local Core installer artifact was also rebuilt for this release. Its payload SHA-256 is `5D383D066862287FB8B488656CBDFC544EDCA26A23E5A746B2B589CA9E318A7B`.

## Previous Release Candidate: 0.3.1

This distro refresh versions Shadowframe as `0.3.1` and adds new-user sample prompt packs for RedCraft, LTX, and Moody Real Mix. It also registers the RedCraft Moto Saito LoRA using the downloaded file `@motocross_saito_v0_0_0_cr_0010.safetensors`.

## Previous Release Candidate: 0.3.0

Shadowframe AI is now packaged as a Windows-first local generation stack. The app can be distributed without requiring the recipient to already have ComfyUI, Python, Node.js, Git, or this development repository installed.

## Package Layout

Shadowframe is split into three packages:

- Shadowframe Core: desktop app, bundled ComfyUI runtime, private bridge, local web service, workflow code, scripts, and runtime manifest.
- Anima Image Models: WAI-ANIMA, Anima Aesthetic, Qwen encoder/VAE, and configured Anima LoRAs.
- Wan 2.2 Video Models: Wan 2.2 I2V/T2V high and low noise models, UMT5 encoder, Wan VAE, and Lightx2v LoRAs.
- PhotoReal Image and Video Models: RedCraft, Moody Real Mix, LTX 2.3 GTAnimation, Qwen/Qwen3VL support files, and configured PhotoReal LoRAs.

Core must be installed first. Model packs install independently into `%LOCALAPPDATA%\Shadowframe\models`.

## Current Build Outputs

- `release\Shadowframe-Installer\Shadowframe Setup.exe`
- `release\Shadowframe-Installer\Shadowframe-Core.tar`
- `release\Shadowframe-Anima-Models\Install Shadowframe Anima Models.exe`
- `release\Shadowframe-Anima-Models\Shadowframe-Anima-Models.tar`
- `release\Shadowframe-Wan-Models\Install Shadowframe Wan Models.exe`
- `release\Shadowframe-Wan-Models\Shadowframe-Wan-Models.tar`
- `release\Shadowframe-PhotoReal-Models\Install Shadowframe PhotoReal Models.exe`
- `release\Shadowframe-PhotoReal-Models\Shadowframe-PhotoReal-Models.tar`
- `release\Shadowframe-Installer\Sample Prompts\SFW`
- `release\Shadowframe-Installer\Sample Prompts\NSFW`

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
- Beta handoff package builder completed and produced `release\Shadowframe-Beta-Handoff`.
- Beta installation verifier runs and reports actionable install readiness checks.
- Starter prompt folders were added to the current local installer distro and the Core beta handoff folder.
- Version metadata updated to `0.3.5` across package, Core manifest, launcher, installer, and model-pack minimum Core metadata.
- LTX Image → Video workflow validation passed in ComfyUI, including an LTX LoRA selection.
- RedCraft Krea2 workflow validation passed in ComfyUI after upgrading the local runtime to `0.30.0`.
- Release build hides Outfit Replace by default until its clean-install local runtime package is finalized.
- Local release artifacts were rebuilt for this version, including Core Setup, the Core payload manifest, all three model-pack manifests, and the beta handoff folder.

## Remaining Acceptance Tests

- Test Core, Anima, and Wan installers on a clean Windows system with a supported NVIDIA GPU.
- Run real generation tests for all supported modes.
- Transfer or host the beta handoff folder for a trusted tester.
- Confirm code-signing strategy for production EXEs.
- Confirm public redistribution rights for every non-Wan model binary before hosting Anima model payloads publicly.

## Distribution Notes

GitHub is appropriate for source code, documentation, and small installer metadata. Large model payloads should be hosted separately because the current model archives are approximately 10.00 GiB and 64.33 GiB.

The Wan pack uses sources identified as Apache-2.0. The Anima pack is marked private-use until explicit redistribution permission is confirmed.



