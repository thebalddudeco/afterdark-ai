# Shadowframe AI v0.3.6

Public-release finalization for Shadowframe AI.

## Download this release

- [GitHub release page](https://github.com/thebalddudeco/shadowframe-ai/releases/tag/v0.3.6) — release notes, checksums, and companion files
- [Full public installer bundle on Hugging Face](https://huggingface.co/datasets/TheBaldDudeCo/shadowframe-ai-public-release/tree/main) — the complete required Windows download

Use the Hugging Face bundle as the main install download. GitHub is the release overview and checksum reference.

## Highlights

- Finalized the dedicated public-release packaging lane.
- Public builds now boot in the `public` release profile automatically.
- Public installer now ships only SFW sample prompts.
- Public installer now pulls the public Anima, Wan, and PhotoReal packs from Hugging Face during setup when they are not bundled locally.
- Public uploads are validated before they ever reach ComfyUI.
- Installer UI clearly identifies the package as the public edition.

## What changed

### Public release packaging

- Added explicit release-profile markers to both the staged Core bundle and the final installer bundle.
- Rebuilt the clean public handoff package in `release\\Shadowframe-Installer-Public-0.3.6`.
- Wired the public setup flow so model packs no longer need to be manually staged beside the installer for a normal end-user install.
- Kept creator/private and public packaging paths separated so the public edition stays aligned with the intended safer product surface.

### Safety and onboarding

- Added public upload validation with clear messages for unsupported file types, oversize uploads, extreme aspect ratios, and blocked filenames.
- Limited bundled public prompt samples to SFW starter prompts only.
- Updated installer wording so the public package is clearly labeled and easier for new users to understand.

### Documentation and release readiness

- Updated release notes, packaging log, changelog, and release checklist for the `0.3.6` public handoff.
- Kept the repo aligned with the packaged public output and current release flow.

## Validation

- `pnpm lint` passes with warnings only.
- `pnpm build:pages` passes.
- Public installer packaging completed successfully.
- Core isolation install/startup test passes.
- Public installer Hugging Face fetch test passes.
- Public Anima, Wan, and PhotoReal pack artifacts pass manifest and checksum verification.

## Public installer artifacts

Folder:

- `release\\Shadowframe-Installer-Public-0.3.6`

Primary end-user download:

- [Full public installer bundle on Hugging Face](https://huggingface.co/datasets/TheBaldDudeCo/shadowframe-ai-public-release/tree/main)

SHA-256:

- `Shadowframe Setup.exe` — `DFD17BAA9FF61E0575C927542B56EE3C0C562EAE89938540AA3284D5FC3F7754`
- `Shadowframe-Core.tar` — `BF358E37533433E6B9213D4D99F5E5B17CB79040778217215341A3B7C3A59F0F`
- `Shadowframe-Package.json` — `ED9C612B18E415CA9A6ECEB8DA047B92D6269413B10C675706D7A94EF8FD2DBE`
- `Shadowframe-ReleaseProfile.json` — `10F33B2B8841D5FF0E41A7C8357407C151A90371A9B01F0B174258ADCE090788`

## Notes

- The public installer bundle contains `Shadowframe-ReleaseProfile.json` with `public`.
- The public bundle contains `Sample Prompts\\SFW` and does not include `Sample Prompts\\NSFW`.
- Large model payloads remain separate from GitHub-friendly source distribution.
- GitHub remains the release-notes/checksum hub; Hugging Face is the primary full-bundle download for end users.






