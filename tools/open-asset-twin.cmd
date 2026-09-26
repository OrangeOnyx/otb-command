@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0open-asset-twin.ps1" %*
set "OTB_LAUNCH_EXIT=%ERRORLEVEL%"
if not "%OTB_LAUNCH_EXIT%"=="0" pause
exit /b %OTB_LAUNCH_EXIT%
