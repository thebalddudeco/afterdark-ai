import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { authorizeBridgeRequest, bridgeJson, bridgeOptions } from "../../lib/bridge-security";

const execFileAsync = promisify(execFile);
const COMFYUI_URL = process.env.COMFYUI_URL || "http://127.0.0.1:8188";

const REPAIR_SCRIPT = `
$ErrorActionPreference = "Stop"

function Get-ShadowframeInstallValue([string]$Name, [string]$Fallback) {
  try {
    $key = Get-Item -LiteralPath "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\ShadowframeAI" -ErrorAction SilentlyContinue
    if ($key) {
      $value = $key.GetValue($Name)
      if ($value -and ![string]::IsNullOrWhiteSpace([string]$value)) {
        return [IO.Path]::GetFullPath([string]$value).TrimEnd("\\")
      }
    }
  } catch {}
  return [IO.Path]::GetFullPath($Fallback).TrimEnd("\\")
}

function Resolve-SetupPath($Receipt) {
  foreach ($candidate in @($Receipt.setupPath, $Receipt.sourceSetupPath)) {
    if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Leaf)) { return [IO.Path]::GetFullPath([string]$candidate) }
  }
  foreach ($root in @($Receipt.packageRoot, $Receipt.sourcePackageRoot)) {
    if (!$root -or !(Test-Path -LiteralPath $root -PathType Container)) { continue }
    $found = Get-ChildItem -LiteralPath $root -Filter "Install Shadowframe PhotoReal Models.exe" -File -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) { return $found.FullName }
  }
  return ""
}

$dataRoot = Get-ShadowframeInstallValue "DataRoot" (Join-Path $env:LOCALAPPDATA "Shadowframe")
$receiptPath = Join-Path $dataRoot "State\\ModelPacks\\photoreal-models.json"
if (!(Test-Path -LiteralPath $receiptPath -PathType Leaf)) {
  throw "PhotoReal has not been installed yet. Run the PhotoReal model pack installer once, then Shadowframe can repair it automatically."
}

$receipt = Get-Content -Raw -LiteralPath $receiptPath | ConvertFrom-Json
$setupPath = Resolve-SetupPath $receipt
if (!$setupPath) {
  throw "Shadowframe cannot find the PhotoReal installer package. Reconnect or restore the original PhotoReal release folder, then try Repair again."
}

$payloadPath = Join-Path (Split-Path -Parent $setupPath) "Shadowframe-PhotoReal-Models.tar"
if (!(Test-Path -LiteralPath $payloadPath -PathType Leaf)) {
  throw "Shadowframe found the PhotoReal installer, but the model payload is missing beside it. Restore the full PhotoReal release folder, then try Repair again."
}

$arguments = @("/SILENT", "/ALLOWUNSUPPORTED", "/DATAROOT=$dataRoot")
$process = Start-Process -FilePath $setupPath -ArgumentList $arguments -Wait -PassThru
if ($process.ExitCode -ne 0) {
  throw "PhotoReal repair failed. Check %TEMP%\\Shadowframe-ModelPack-Setup.log for details."
}

[pscustomobject]@{
  repaired = $true
  setupPath = $setupPath
  dataRoot = $dataRoot
} | ConvertTo-Json -Compress
`;

function encodedPowerShell(script: string) {
  return Buffer.from(script, "utf16le").toString("base64");
}

async function unloadComfyModels() {
  try {
    await fetch(`${COMFYUI_URL}/free`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unload_models: true, free_memory: true }),
    });
  } catch {
    // Best effort: repair can still proceed if ComfyUI does not expose /free.
  }
}

export async function POST(request: Request) {
  const authorizationError = authorizeBridgeRequest(request);
  if (authorizationError) return authorizationError;

  const respond = (body: unknown, init?: ResponseInit) => bridgeJson(request, body, init);
  try {
    const body = await request.json().catch(() => ({})) as { packId?: string };
    if (body.packId && body.packId !== "photoreal-models") {
      return respond({ error: "Only the PhotoReal model pack can be repaired from this screen right now." }, { status: 400 });
    }

    await unloadComfyModels();
    const { stdout } = await execFileAsync("powershell.exe", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-EncodedCommand",
      encodedPowerShell(REPAIR_SCRIPT),
    ], { windowsHide: true, timeout: 30 * 60 * 1000, maxBuffer: 1024 * 1024 });
    await unloadComfyModels();

    return respond({
      ok: true,
      message: "PhotoReal was repaired. Try the RedCraft generation again.",
      details: stdout.trim(),
    });
  } catch (error) {
    return respond({
      error: error instanceof Error ? error.message : "PhotoReal repair failed.",
    }, { status: 500 });
  }
}

export async function OPTIONS(request: Request) { return bridgeOptions(request); }
