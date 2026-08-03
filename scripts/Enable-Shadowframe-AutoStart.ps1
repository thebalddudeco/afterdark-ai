$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$launcher = Join-Path $PSScriptRoot "Start-Shadowframe-Bridge.ps1"
$taskName = "Shadowframe Bridge"
$taskArguments = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$launcher`" -NoBrowser -StartComfyUI"
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $taskArguments -WorkingDirectory $projectRoot
$trigger = New-ScheduledTaskTrigger -AtLogOn -User "$($env:USERDOMAIN)\$($env:USERNAME)"
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero)

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "Starts legacy ComfyUI and the private Shadowframe Bridge when this user signs in." -Force | Out-Null

Write-Host "Shadowframe automatic startup is enabled." -ForegroundColor Green
Write-Host "Legacy ComfyUI and the bridge will start whenever you sign in to Windows."

