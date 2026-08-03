$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$friendAccessPath = Join-Path $projectRoot ".shadowframe\Friend Access.txt"
if (!(Test-Path -LiteralPath $friendAccessPath)) {
  throw "Start Shadowframe Bridge once to create the friend access details."
}

Write-Host ""
$friendAccessText = Get-Content -Raw -LiteralPath $friendAccessPath
$bridgeMatch = [regex]::Match($friendAccessText, "(?m)^Bridge address:\s*(.+)$")
$keyMatch = [regex]::Match($friendAccessText, "(?m)^Private access key:\s*(.+)$")
if (!$bridgeMatch.Success -or !$keyMatch.Success) {
  throw "The friend access details are incomplete. Restart Shadowframe Bridge to recreate them."
}

$bridgeAddress = $bridgeMatch.Groups[1].Value.Trim()
$privateAccessKey = $keyMatch.Groups[1].Value.Trim()

Write-Host "Shadowframe Friend Access"
Write-Host ""
Write-Host "Bridge address: $bridgeAddress"
Write-Host "Private access key: $privateAccessKey"
Write-Host ""
Write-Host "Send the bridge address and private access key to the person you trust." -ForegroundColor Cyan
Write-Host "Treat the private access key like a password."
Write-Host ""
Write-Host "Press 1 to copy the bridge address"
Write-Host "Press 2 to copy the private access key"
Write-Host "Press 3 to copy both in a ready-to-send message"
Write-Host "Press Q to close"
Write-Host ""

while ($true) {
  $choice = [Console]::ReadKey($true).KeyChar
  switch ($choice.ToString().ToUpperInvariant()) {
    "1" {
      Set-Clipboard -Value $bridgeAddress
      Write-Host "Bridge address copied." -ForegroundColor Green
    }
    "2" {
      Set-Clipboard -Value $privateAccessKey
      Write-Host "Private access key copied." -ForegroundColor Green
    }
    "3" {
      $shareText = "Bridge address: $bridgeAddress`r`nPrivate access key: $privateAccessKey"
      Set-Clipboard -Value $shareText
      Write-Host "Both details copied." -ForegroundColor Green
    }
    "Q" { return }
  }
}
