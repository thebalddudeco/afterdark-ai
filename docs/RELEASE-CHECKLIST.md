# Shadowframe Release Checklist

Use this checklist before publishing a public build.

## Source

- Git status contains only intended source and documentation changes.
- Large generated folders are ignored by Git.
- No `.env`, tunnel token, bridge key, source image, generated output, or model binary is staged.
- README, changelog, release notes, packaging log, and technical reference are current.

## Builds

- `pnpm build:pages` passes.
- `pnpm lint` passes with no errors.
- `dotnet build desktop\Shadowframe.Launcher\Shadowframe.Launcher.csproj -c Release` passes.
- `dotnet build desktop\Shadowframe.Installer\Shadowframe.Installer.csproj -c Release` passes.
- `pnpm core:build` produces `release\Shadowframe-Core`.
- `pnpm installer:build` produces `release\Shadowframe-Installer`.
- `pnpm models:build` produces the selected model-pack folders.
- `pnpm beta:build` produces `release\Shadowframe-Beta-Handoff`.

## Verification

- `pnpm core:test` passes.
- `pnpm installer:test` passes when no real install is registered.
- `pnpm models:test` passes.
- `pnpm models:verify` passes.
- Production Anima pack extraction/uninstall passes.
- Production Wan pack extraction/uninstall passes.
- Clean-machine Core install passes.
- Clean-machine model-pack installs pass.
- `Verify Installation.cmd` passes on the beta target after install.
- txt-img, img-img, img-vid, and txt-vid generation each complete successfully.

## Distribution

- EXEs are code-signed or intentionally released unsigned with clear expectations.
- Installers and payloads are malware-scanned.
- `SHA256SUMS.txt` files are published beside payloads.
- Core and model payloads are hosted outside Git if they exceed repository-friendly size.
- Wan third-party notices are retained.
- Anima model redistribution permission is confirmed before any public binary hosting.

## Release

- Version number is updated in `package.json`, `desktop\core-manifest.json`, and installer/model-pack manifests when applicable.
- GitHub release notes link to `docs\RELEASE-NOTES.md`.
- GitHub release clearly separates source, Core installer, and model packs.
- Post-release install instructions are tested from the published links.
