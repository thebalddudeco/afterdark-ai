$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$friendAccessPath = Join-Path $projectRoot ".shadowframe\Friend Access.txt"
if (!(Test-Path -LiteralPath $friendAccessPath)) {
  throw "Start Shadowframe Bridge once to create the friend access details."
}
Start-Process notepad.exe -ArgumentList @($friendAccessPath)

