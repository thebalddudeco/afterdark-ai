# Shadowframe Windows Installer — Phase 2

Phase 2 packages the standalone Core as a normal per-user Windows application. Recipients do not need an existing ComfyUI, Python, Node.js, Git, or command-line setup.

## Distribution

The distributable folder is `release/Shadowframe-Installer`. The following files must remain together:

- `Shadowframe Setup.exe`
- `Shadowframe-Core.tar`
- `Shadowframe-Package.json`

`SHA256SUMS.txt` provides optional whole-download checksums. Models and LoRAs remain separate installation packs.

Setup installs to `%LOCALAPPDATA%\Programs\Shadowframe AI` by default and stores mutable application data under `%LOCALAPPDATA%\Shadowframe`. This separation allows repair, update, and uninstall operations to replace the application without deleting models, inputs, outputs, generations, or private settings.

## Installer behavior

- Requires 64-bit Windows 10 build 19041 or newer.
- Detects an NVIDIA display adapter and Microsoft Edge WebView2 Runtime.
- Checks available disk space before installation.
- Verifies the complete Core archive with SHA-256 before extraction.
- Creates Start Menu, uninstall, and optional Desktop shortcuts.
- Registers Shadowframe AI in Windows Installed Apps for the current user.
- Rerunning Setup repairs or updates the existing installation using a rollback-safe directory replacement.
- Uninstall preserves application data by default. `/REMOVEDATA` explicitly removes it.
- Installer errors are recorded in `%TEMP%\Shadowframe-Setup.log`.

## Build and test

Run `pnpm installer:build` to rebuild Core and produce the installer distribution. Run `pnpm installer:test` only when no real Shadowframe installation is registered. The automated test installs into a unique temporary folder, launches the private runtime on alternate ports, performs a repair/update pass, uninstalls it, and verifies that application data is unchanged.

The `0.3.1` distro also places starter prompt folders beside the installer under `Sample Prompts` so new users can copy examples into Shadowframe after installation.

## Silent deployment

```powershell
"Shadowframe Setup.exe" /SILENT
"Shadowframe Setup.exe" /SILENT /INSTALLDIR="D:\Apps\Shadowframe AI"
"Shadowframe Setup.exe" /UNINSTALL /SILENT /INSTALLDIR="D:\Apps\Shadowframe AI"
```

## Before public release

- Sign Setup, Shadowframe.exe, and the uninstaller copy with an Authenticode code-signing certificate.
- Test on a clean physical or virtual Windows machine with a supported NVIDIA GPU and current driver.
- Confirm WebView2 bootstrap/install guidance on a machine where the runtime is absent.
- Add versioned upgrade testing between two real release versions.
- Build the separate Anima and Wan model-pack installers.

Windows Sandbox is not available on the current development PC, so Phase 2 was validated with a disposable installation directory and isolated runtime ports rather than a fresh Windows image.
