# Shadowframe AI v0.3.5

Public-release finalization for Shadowframe AI.

## Highlights

- Finalized the dedicated public-release packaging lane.
- Public builds now boot in the `public` release profile automatically.
- Public installer now ships only SFW sample prompts.
- Public uploads are validated before they ever reach ComfyUI.
- Installer UI clearly identifies the package as the public edition.

## What changed

### Public release packaging

- Added explicit release-profile markers to both the staged Core bundle and the final installer bundle.
- Rebuilt the clean public handoff package in `release\\Shadowframe-Installer-Public-0.3.5`.
- Kept creator/private and public packaging paths separated so the public edition stays aligned with the intended safer product surface.

### Safety and onboarding

- Added public upload validation with clear messages for unsupported file types, oversize uploads, extreme aspect ratios, and blocked filenames.
- Limited bundled public prompt samples to SFW starter prompts only.
- Updated installer wording so the public package is clearly labeled and easier for new users to understand.

### Documentation and release readiness

- Updated release notes, packaging log, changelog, and release checklist for the `0.3.5` public handoff.
- Kept the repo aligned with the packaged public output and current release flow.

## Validation

- `pnpm lint` passes with warnings only.
- `pnpm build:pages` passes.
- Public installer packaging completed successfully.

## Public installer artifacts

Folder:

- `release\\Shadowframe-Installer-Public-0.3.5`

SHA-256:

- `Shadowframe Setup.exe` — `5D903C035503A2F1D4BABA8CA722035F3C5FA406033BB80AC75F24949EB915D9`
- `Shadowframe-Core.tar` — `99E8CC0935D1CA0DE72A091430FE5D528832DEC4F1D6A4A485E3B739F5DB6B39`
- `Shadowframe-Package.json` — `7D9848C50D1C04CDAE185E262499083FA05EDC9D6162A03EAF8E03CFD6095918`
- `Shadowframe-ReleaseProfile.json` — `10F33B2B8841D5FF0E41A7C8357407C151A90371A9B01F0B174258ADCE090788`

## Notes

- The public installer bundle contains `Shadowframe-ReleaseProfile.json` with `public`.
- The public bundle contains `Sample Prompts\\SFW` and does not include `Sample Prompts\\NSFW`.
- Large model payloads remain separate from GitHub-friendly source distribution.
