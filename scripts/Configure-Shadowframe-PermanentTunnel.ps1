$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$stateDirectory = Join-Path $projectRoot ".shadowframe"
$tokenPath = Join-Path $stateDirectory "cloudflare-tunnel-token.txt"

New-Item -ItemType Directory -Path $stateDirectory -Force | Out-Null

Write-Host "Shadowframe permanent tunnel setup" -ForegroundColor Cyan
Write-Host "Create a Cloudflare Tunnel named Shadowframe, add bridge.shadowframe.tech as a public hostname," 
Write-Host "point it to http://localhost:3001, then copy the tunnel token from Cloudflare."
Write-Host ""
$token = (Read-Host "Paste the Cloudflare tunnel token").Trim()
if (!$token) { throw "No tunnel token was entered." }

Set-Content -LiteralPath $tokenPath -Value $token -Encoding ASCII -NoNewline
& icacls.exe $tokenPath /inheritance:r /grant:r "$($env:USERDOMAIN)\$($env:USERNAME):(F)" | Out-Null

Write-Host "The permanent tunnel token is installed." -ForegroundColor Green
Write-Host "Restarting Shadowframe Bridge..."
& (Join-Path $PSScriptRoot "Start-Shadowframe-Bridge.ps1") -StartComfyUI

