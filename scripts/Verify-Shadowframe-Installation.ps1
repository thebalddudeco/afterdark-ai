param(
  [switch]$FullHash
)

$ErrorActionPreference = "Stop"
$coreKeyPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\ShadowframeAI"
function Get-ShadowframeRegistryValue([string]$Name, [string]$Fallback) {
  try {
    $core = Get-Item -LiteralPath "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\ShadowframeAI" -ErrorAction SilentlyContinue
    if ($core) {
      $value = $core.GetValue($Name)
      if ($value -and ![string]::IsNullOrWhiteSpace([string]$value)) {
        return [IO.Path]::GetFullPath([string]$value).TrimEnd('\')
      }
    }
  } catch {}
  return [IO.Path]::GetFullPath($Fallback).TrimEnd('\')
}

$dataRoot = Get-ShadowframeRegistryValue "DataRoot" (Join-Path $env:LOCALAPPDATA "Shadowframe")
$outputRoot = Get-ShadowframeRegistryValue "OutputRoot" (Join-Path ([Environment]::GetFolderPath([Environment+SpecialFolder]::MyDocuments)) "Shadowframe Output")
$modelPacksRoot = Join-Path $dataRoot "State\ModelPacks"
$failed = $false

function Write-Check([string]$Message, [bool]$Passed, [string]$Detail = "") {
  if ($Passed) {
    Write-Host "[OK] $Message" -ForegroundColor Green
  } else {
    Write-Host "[FAIL] $Message" -ForegroundColor Red
    if ($Detail) { Write-Host "       $Detail" -ForegroundColor DarkYellow }
    $script:failed = $true
  }
}

function Write-Warn([string]$Message, [string]$Detail = "") {
  Write-Host "[WARN] $Message" -ForegroundColor Yellow
  if ($Detail) { Write-Host "       $Detail" -ForegroundColor DarkYellow }
}

function Test-WebView2 {
  $client = "SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
  foreach ($hive in @([Microsoft.Win32.RegistryHive]::LocalMachine, [Microsoft.Win32.RegistryHive]::CurrentUser)) {
    foreach ($view in @([Microsoft.Win32.RegistryView]::Registry64, [Microsoft.Win32.RegistryView]::Registry32)) {
      $base = [Microsoft.Win32.RegistryKey]::OpenBaseKey($hive, $view)
      try {
        $key = $base.OpenSubKey($client)
        if ($key -and $key.GetValue("pv") -and $key.GetValue("pv") -ne "0.0.0.0") { return $true }
      } finally {
        if ($key) { $key.Dispose() }
        $base.Dispose()
      }
    }
  }
  return $false
}

function Get-Sha256([string]$Path) {
  $stream = [System.IO.File]::OpenRead($Path)
  try {
    $sha = [System.Security.Cryptography.SHA256]::Create()
    return [System.BitConverter]::ToString($sha.ComputeHash($stream)).Replace("-", "")
  } finally {
    if ($sha) { $sha.Dispose() }
    $stream.Dispose()
  }
}

function Get-PhotoRealCompatibilityChecks($ReceiptData) {
  if ($ReceiptData.CompatibilityChecks) { return @($ReceiptData.CompatibilityChecks) }
  if ($ReceiptData.PackId -ne "photoreal-models") { return @() }
  return @(
    [pscustomobject]@{
      Id = "redcraft-krea2-runtime-pair"
      DisplayName = "RedCraft/Krea2 runtime pair"
      RepairMessage = "Repair or reinstall the current PhotoReal model pack from this release, then restart Shadowframe."
      RequiredFiles = @(
        [pscustomobject]@{
          RelativePath = "diffusion_models/redcraft23INT8INT4FP8_30Krea2.safetensors"
          Bytes = 13141826368
          Sha256 = "F6088960C0FEBD27CBD372FC758BB07D012F2D8AE3CD10C45C903D48B94409EA"
        }
        [pscustomobject]@{
          RelativePath = "text_encoders/qwen3vl_4b_fp8_scaled.safetensors"
          Bytes = 5242467968
          Sha256 = "54BD5144DF0BBC25DD6CCADFCB826B521445A1B06AE5A42570BDD2974CA87094"
        }
      )
    }
  )
}

function Test-CompatibilityChecks($ReceiptData, [string]$ModelRoot) {
  foreach ($check in (Get-PhotoRealCompatibilityChecks $ReceiptData)) {
    $missing = 0
    $sizeMismatch = 0
    $hashMismatch = 0
    foreach ($file in $check.RequiredFiles) {
      $installed = Join-Path $ModelRoot $file.RelativePath.Replace("/", "\")
      if (!(Test-Path -LiteralPath $installed -PathType Leaf)) {
        $missing++
        continue
      }
      $item = Get-Item -LiteralPath $installed
      if ($item.Length -ne [int64]$file.Bytes) {
        $sizeMismatch++
        continue
      }
      $hash = Get-Sha256 $installed
      if (!$hash.Equals($file.Sha256, [System.StringComparison]::OrdinalIgnoreCase)) { $hashMismatch++ }
    }
    $passed = ($missing -eq 0 -and $sizeMismatch -eq 0 -and $hashMismatch -eq 0)
    $detail = if ($passed) { "" } else { "$missing missing, $sizeMismatch wrong size, $hashMismatch wrong hash. $($check.RepairMessage)" }
    Write-Check "$($check.DisplayName)" $passed $detail
  }
}

Write-Host ""
Write-Host "Shadowframe AI Installation Check" -ForegroundColor Cyan
Write-Host ""

Write-Check "64-bit Windows" ([Environment]::Is64BitOperatingSystem)
Write-Check "Microsoft Edge WebView2 Runtime" (Test-WebView2) "Install WebView2 from Microsoft if this fails."

$nvidia = Get-CimInstance Win32_VideoController -ErrorAction SilentlyContinue | Where-Object {
  ($_.Name + " " + $_.AdapterCompatibility) -match "NVIDIA"
}
Write-Check "NVIDIA graphics adapter" ([bool]$nvidia) "Shadowframe generation expects an NVIDIA GPU and current driver."

$coreInstalled = Test-Path -LiteralPath $coreKeyPath
Write-Check "Shadowframe Core registration" $coreInstalled "Install 01 Shadowframe Core first."
if ($coreInstalled) {
  $core = Get-ItemProperty -LiteralPath $coreKeyPath
  $installRoot = $core.InstallLocation
  Write-Host "       Core version: $($core.DisplayVersion)"
  Write-Host "       Install path: $installRoot"

  foreach ($relative in @(
    "Shadowframe.exe",
    "runtime-manifest.json",
    "Runtime\ComfyUI\main.py",
    "Runtime\PythonBase\python.exe",
    "Runtime\Node\node.exe",
    "Bridge\package.json",
    "scripts\Start-Shadowframe-Core.ps1",
    "scripts\Stop-Shadowframe-Core.ps1"
  )) {
    Write-Check "Core file: $relative" (Test-Path -LiteralPath (Join-Path $installRoot $relative) -PathType Leaf)
  }
}

Write-Check "Shadowframe data folder" (Test-Path -LiteralPath $dataRoot -PathType Container) "Model packs create this automatically."
Write-Check "Shadowframe output folder" (Test-Path -LiteralPath $outputRoot -PathType Container) "Core setup creates this automatically."

$expectedPacks = @(
  @{ Id = "anima-models"; Name = "Anima Image Models" },
  @{ Id = "wan-models"; Name = "Wan 2.2 Video Models" },
  @{ Id = "photoreal-models"; Name = "PhotoReal Image and Video Models" }
)

foreach ($pack in $expectedPacks) {
  $receipt = Join-Path $modelPacksRoot "$($pack.Id).json"
  $hasReceipt = Test-Path -LiteralPath $receipt -PathType Leaf
  Write-Check "$($pack.Name) receipt" $hasReceipt "Install the matching numbered model pack."
  if (!$hasReceipt) { continue }

  $receiptData = Get-Content -Raw -LiteralPath $receipt | ConvertFrom-Json
  Write-Host "       Pack version: $($receiptData.Version)"
  $missing = 0
  $sizeMismatch = 0
  $hashMismatch = 0
  foreach ($file in $receiptData.Files) {
    $installed = Join-Path $dataRoot ("models\" + $file.RelativePath.Replace("/", "\"))
    if (!(Test-Path -LiteralPath $installed -PathType Leaf)) {
      $missing++
      continue
    }
    $item = Get-Item -LiteralPath $installed
    if ($item.Length -ne [int64]$file.Bytes) {
      $sizeMismatch++
      continue
    }
    if ($FullHash) {
      $hash = Get-Sha256 $installed
      if (!$hash.Equals($file.Sha256, [System.StringComparison]::OrdinalIgnoreCase)) { $hashMismatch++ }
    }
  }

  Write-Check "$($pack.Name) model files present" ($missing -eq 0) "$missing file(s) missing."
  Write-Check "$($pack.Name) model file sizes" ($sizeMismatch -eq 0) "$sizeMismatch file(s) have a size mismatch."
  if ($FullHash) {
    Write-Check "$($pack.Name) full model hashes" ($hashMismatch -eq 0) "$hashMismatch file(s) have a hash mismatch."
  } else {
    Write-Warn "$($pack.Name) hash verification skipped" "Run this script with -FullHash for the slower full-file check."
  }
  Test-CompatibilityChecks $receiptData (Join-Path $dataRoot "models")
}

Write-Host ""
if ($failed) {
  Write-Host "Shadowframe is not fully ready on this PC. Fix the failed items above, then run this check again." -ForegroundColor Red
  exit 1
}

Write-Host "Shadowframe installation looks ready. Launch Shadowframe AI and run a small generation test next." -ForegroundColor Green
