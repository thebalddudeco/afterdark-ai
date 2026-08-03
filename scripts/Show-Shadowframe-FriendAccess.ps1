$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$friendAccessPath = Join-Path $projectRoot ".shadowframe\Friend Access.txt"
if (!(Test-Path -LiteralPath $friendAccessPath)) {
  throw "Start Shadowframe Bridge once to create the friend access details."
}

Write-Host ""
Get-Content -LiteralPath $friendAccessPath
Write-Host ""
Write-Host "Send the bridge address and private access key to the person you trust." -ForegroundColor Cyan
Write-Host "Treat the private access key like a password."
