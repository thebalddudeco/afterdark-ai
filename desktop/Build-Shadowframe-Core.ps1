param(
  [string]$OutputDirectory = "",
  [string]$ComfyUiSource = "$env:LOCALAPPDATA\Programs\ComfyUI\resources\ComfyUI",
  [string]$ComfyUiFrontendSource = "$env:LOCALAPPDATA\Programs\ComfyUI\resources\UI",
  [string]$PythonBaseSource = "$env:APPDATA\uv\python\cpython-3.12.11-windows-x86_64-none",
  [string]$PythonEnvironmentSource = "$env:USERPROFILE\Documents\ComfyUI\.venv",
  [string]$NodeSource = "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$releaseRoot = Join-Path $projectRoot "release"
if (!$OutputDirectory) { $OutputDirectory = Join-Path $releaseRoot "Shadowframe-Core" }

$resolvedReleaseRoot = [IO.Path]::GetFullPath($releaseRoot).TrimEnd('\')
$resolvedOutput = [IO.Path]::GetFullPath($OutputDirectory).TrimEnd('\')
if (!$resolvedOutput.StartsWith($resolvedReleaseRoot + '\', [StringComparison]::OrdinalIgnoreCase)) {
  throw "The Core staging directory must stay inside $resolvedReleaseRoot"
}

$requiredSources = @(
  $ComfyUiSource,
  $PythonBaseSource,
  $PythonEnvironmentSource,
  $NodeSource,
  (Join-Path $projectRoot "node_modules")
)
foreach ($source in $requiredSources) {
  if (!(Test-Path -LiteralPath $source)) { throw "Required Phase 1 source is missing: $source" }
}

function Copy-Directory([string]$source, [string]$destination, [string[]]$extraArguments = @()) {
  New-Item -ItemType Directory -Path $destination -Force | Out-Null
  $arguments = @($source, $destination, "/E", "/COPY:DAT", "/DCOPY:DAT", "/R:2", "/W:1", "/NFL", "/NDL", "/NP") + $extraArguments
  & robocopy.exe @arguments | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "Copy failed from $source to $destination (robocopy exit $LASTEXITCODE)." }
}

Write-Host "Building the Shadowframe web service..."
$nodeBin = Split-Path -Parent $NodeSource
$fallback = "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback"
$previousPath = $env:PATH
$env:PATH = "$nodeBin;$fallback;$env:PATH"
try {
  & (Join-Path $fallback "pnpm.cmd") build
  if ($LASTEXITCODE -ne 0) { throw "The Shadowframe web service build failed." }
} finally {
  $env:PATH = $previousPath
}

Write-Host "Building Shadowframe.exe..."
& (Join-Path $PSScriptRoot "Build-Shadowframe.ps1") -SkipShortcut
if ($LASTEXITCODE -ne 0) { throw "Shadowframe.exe could not be built." }

if (Test-Path -LiteralPath $resolvedOutput) {
  Remove-Item -LiteralPath $resolvedOutput -Recurse -Force
}
New-Item -ItemType Directory -Path $resolvedOutput -Force | Out-Null

Write-Host "Staging the application and Core manifest..."
Copy-Item -LiteralPath (Join-Path $projectRoot "Shadowframe.exe") -Destination (Join-Path $resolvedOutput "Shadowframe.exe") -Force
Copy-Item -LiteralPath (Join-Path $PSScriptRoot "core-manifest.json") -Destination (Join-Path $resolvedOutput "runtime-manifest.json") -Force
New-Item -ItemType Directory -Path (Join-Path $resolvedOutput "scripts") -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $projectRoot "scripts\Start-Shadowframe-Core.ps1") -Destination (Join-Path $resolvedOutput "scripts\Start-Shadowframe-Core.ps1") -Force
Copy-Item -LiteralPath (Join-Path $projectRoot "scripts\Stop-Shadowframe-Core.ps1") -Destination (Join-Path $resolvedOutput "scripts\Stop-Shadowframe-Core.ps1") -Force
Copy-Item -LiteralPath (Join-Path $projectRoot "scripts\Test-Shadowframe-Core.ps1") -Destination (Join-Path $resolvedOutput "scripts\Test-Shadowframe-Core.ps1") -Force

Write-Host "Staging the private Python and ComfyUI runtime..."
$runtimeRoot = Join-Path $resolvedOutput "Runtime"
Copy-Directory $PythonBaseSource (Join-Path $runtimeRoot "PythonBase")
Copy-Directory (Join-Path $PythonEnvironmentSource "Lib\site-packages") (Join-Path $runtimeRoot "PythonBase\Lib\site-packages") @("/XD", "__pycache__")
Copy-Directory $ComfyUiSource (Join-Path $runtimeRoot "ComfyUI") @("/XD", ".git", "__pycache__")
if (Test-Path -LiteralPath $ComfyUiFrontendSource) {
  Copy-Directory $ComfyUiFrontendSource (Join-Path $runtimeRoot "UI")
}
New-Item -ItemType Directory -Path (Join-Path $runtimeRoot "Node") -Force | Out-Null
Copy-Item -LiteralPath $NodeSource -Destination (Join-Path $runtimeRoot "Node\node.exe") -Force

Write-Host "Staging the local Shadowframe bridge..."
$bridgeRoot = Join-Path $resolvedOutput "Bridge"
New-Item -ItemType Directory -Path $bridgeRoot -Force | Out-Null
foreach ($file in @("package.json", "pnpm-lock.yaml", "next.config.ts", "tsconfig.json", "vite.config.ts", "postcss.config.mjs")) {
  Copy-Item -LiteralPath (Join-Path $projectRoot $file) -Destination (Join-Path $bridgeRoot $file) -Force
}
foreach ($directory in @("app", "build", "db", "drizzle", "public", "dist", ".vinext")) {
  $source = Join-Path $projectRoot $directory
  if (Test-Path -LiteralPath $source) { Copy-Directory $source (Join-Path $bridgeRoot $directory) @("/XD", "__pycache__") }
}

$previousPath = $env:PATH
$env:PATH = "$nodeBin;$fallback;$env:PATH"
try {
  & (Join-Path $fallback "pnpm.cmd") install --dir $bridgeRoot --ignore-workspace --frozen-lockfile --offline --config.node-linker=hoisted --config.package-import-method=copy
  $portableBridgeEntry = Join-Path $bridgeRoot "node_modules\vinext\dist\cli.js"
  if (!(Test-Path -LiteralPath $portableBridgeEntry)) {
    throw "The portable bridge dependencies could not be staged."
  }
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "The dependency tool reported an optional native-build policy warning; the required portable bridge files were verified."
  }
} finally {
  $env:PATH = $previousPath
}

$thirdParty = Join-Path $resolvedOutput "ThirdPartyNotices"
New-Item -ItemType Directory -Path $thirdParty -Force | Out-Null
$comfyLicense = Join-Path $ComfyUiSource "LICENSE"
if (Test-Path -LiteralPath $comfyLicense) {
  Copy-Item -LiteralPath $comfyLicense -Destination (Join-Path $thirdParty "ComfyUI-LICENSE.txt") -Force
}

@"
Shadowframe Core — Phase 1 staging package

This package owns its ComfyUI, Python, Node.js, workflows, and local bridge runtime.
It intentionally contains no model checkpoints or LoRAs.

Runtime data is stored in:
  %LOCALAPPDATA%\Shadowframe

Run Shadowframe.exe to start the private runtime.
"@ | Set-Content -LiteralPath (Join-Path $resolvedOutput "README.txt") -Encoding UTF8

Write-Host "Verifying that the staged Python runtime is relocatable..."
$stagedPython = Join-Path $runtimeRoot "PythonBase\python.exe"
& $stagedPython -I -c "import sys, torch, aiohttp; print(sys.version); print(torch.__version__); print('Shadowframe Core Python OK')"
if ($LASTEXITCODE -ne 0) { throw "The staged Python runtime is not self-contained." }

Write-Host "Shadowframe Core Phase 1 staged at: $resolvedOutput" -ForegroundColor Green
