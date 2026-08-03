$ErrorActionPreference = "Stop"

$taskName = "Shadowframe Bridge"
if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
  Write-Host "Shadowframe automatic startup is disabled." -ForegroundColor Green
} else {
  Write-Host "Shadowframe automatic startup was not enabled."
}

