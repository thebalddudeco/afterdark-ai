# Shadowframe Beta Handoff

Phase 4C creates a handoff folder for trusted beta installation on another Windows PC.

## Build

From the repository root:

```powershell
pnpm beta:build
```

The builder creates:

```text
release\Shadowframe-Beta-Handoff
```

The folder contains:

- `01 Install Shadowframe Core`
- `02 Install Anima Models`
- `03 Install Wan Models`
- `Verify Installation.cmd`
- `Verify Installation - Full Hash Check.cmd`
- `README - START HERE.txt`
- `SYSTEM REQUIREMENTS.txt`
- `TROUBLESHOOTING.txt`
- `KNOWN ISSUES.txt`
- `INSTALL ORDER.txt`
- `BETA TEST NOTES.txt`
- `BETA-SHA256SUMS.txt`

By default, large files are hardlinked into the beta folder when possible, so the handoff package does not consume another full copy of the Core, Anima, and Wan payloads on the same drive. Use `desktop\Build-Shadowframe-BetaPackage.ps1 -CopyFiles` when you need independent physical copies.

## Install Order

1. Install Shadowframe Core.
2. Install Anima Models.
3. Install Wan Models.
4. Run `Verify Installation.cmd`.
5. Launch Shadowframe AI and run generation tests.

## Verification

`Verify Installation.cmd` checks:

- 64-bit Windows.
- Microsoft Edge WebView2 Runtime.
- NVIDIA graphics adapter.
- Shadowframe Core registration.
- Core runtime files.
- Shadowframe data folder.
- Anima and Wan model-pack receipts.
- Installed model file presence and sizes.

`Verify Installation - Full Hash Check.cmd` additionally reads every installed model file and verifies SHA-256 hashes. This is much slower, especially with Wan.

## Remaining Beta Goals

- Run the package on a Windows/NVIDIA PC outside the developer environment.
- Run txt-img, img-img, img-vid, and txt-vid generation acceptance tests.
- Capture logs and screenshots for every failure.
- Confirm whether unsigned EXE warnings are acceptable for the beta group.
