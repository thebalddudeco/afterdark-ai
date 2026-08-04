# Shadowframe Core — Phase 1

Phase 1 separates Shadowframe from the developer PC's existing ComfyUI installation. The staged Windows package owns its application launcher, ComfyUI source, Python runtime and packages, Node.js runtime, built Shadowframe service, and workflow code.

## Current result

- Staging output: `release/Shadowframe-Core`
- Runtime size without models: approximately 4.4 GB
- Application data: `%LOCALAPPDATA%\Shadowframe`
- Default private endpoints: ComfyUI on `127.0.0.1:8188`, Shadowframe on `127.0.0.1:3001`
- Models and LoRAs are intentionally excluded from Core and will be delivered as separate packs.
- Friend access and the permanent Cloudflare tunnel remain outside the Phase 1 Core package.

The Core startup refuses to borrow another ComfyUI process. If either private port is occupied, startup stops with a clear error instead of silently connecting to an unrelated installation.

## Build

From the repository root, run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File desktop\Build-Shadowframe-Core.ps1
```

The builder compiles the web service and launcher, stages the runtimes, installs portable bridge dependencies, and verifies that the relocated Python runtime can import PyTorch and the HTTP stack.

## Isolation test

With no other Shadowframe Core instance running, run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\Test-Shadowframe-Core.ps1
```

The test uses ports 8288 and 3101 so it can run beside the developer's normal ComfyUI and bridge. It launches the staged copy, verifies both HTTP services and their versions, and stops the test processes.

## Clean-machine requirements still to validate

- 64-bit Windows 10 or 11
- Compatible NVIDIA driver and GPU
- Microsoft Edge WebView2 Runtime (normally present on supported Windows systems)
- Sufficient disk space for the 4.4 GB Core plus selected model packs and generation output

Phase 2 should turn this staging folder into a signed installer, add prerequisites and repair/uninstall behavior, and test on a clean Windows virtual machine before public distribution.
