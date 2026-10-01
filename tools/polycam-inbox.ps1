# Polycam inbox watcher (operator request 2026-10-01). Runs tools/polycam-inbox.py every 10 minutes:
# new Polycam export sets in G:\My Drive\00 OTB\Polycam-Inbox or Downloads -> E:\OTB-CAPTURE -> registered.
# Log: E:\OTB-CAPTURE\polycam-inbox.log. Skips quietly when E: is unplugged.
# Register (once, or after an OS reinstall):
#   powershell -File tools\polycam-inbox.ps1 -Register

param([switch]$Register)

$Repo = "C:\Users\adam\Projects\otb-command-claude-code-kit\otb-command"

if ($Register) {
    $action = New-ScheduledTaskAction -Execute "powershell.exe" `
        -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$Repo\tools\polycam-inbox.ps1`""
    $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 10)
    $settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2) -StartWhenAvailable
    Register-ScheduledTask -TaskName "OTB-Polycam-Inbox" -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
    Write-Host "Registered OTB-Polycam-Inbox (every 10 min)."
    exit 0
}

if (-not (Test-Path "E:\OTB-CAPTURE")) { exit 0 }
Set-Location $Repo
python tools\polycam-inbox.py
exit $LASTEXITCODE
