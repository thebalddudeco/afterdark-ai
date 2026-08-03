@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Show-Shadowframe-FriendAccess.ps1"
if errorlevel 1 pause

