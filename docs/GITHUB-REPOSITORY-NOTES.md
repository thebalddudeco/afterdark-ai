# GitHub Repository Notes

## What Belongs In Git

- Application source code.
- Desktop launcher and installer source.
- Build and test scripts.
- Workflow templates.
- Style registry metadata.
- Documentation.
- Small brand and web assets.
- Checksums and notices only when they do not expose private/local artifacts.

## What Does Not Belong In Git

- Model checkpoints, LoRAs, VAEs, and text encoders.
- `release` payloads and installer build output.
- ComfyUI generated outputs.
- Input/reference images used for private generation.
- `.env.local` or any local environment file.
- `.shadowframe` state.
- Cloudflare tunnel tokens.
- Private bridge access keys.

## Recommended Release Pattern

Use GitHub for:

- source releases
- documentation
- release notes
- issue tracking
- small installer metadata

Use separate release storage for:

- `Shadowframe-Core.tar`
- `Shadowframe-Anima-Models.tar`
- `Shadowframe-Wan-Models.tar`

Publish SHA-256 checksums beside every downloadable payload.

## Branching

Small documentation and packaging updates can merge directly after build checks pass. Larger installer/runtime changes should use a release branch and be tested through a clean-machine checklist before merging.
