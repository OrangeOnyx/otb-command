# OTB captures -> Google Drive mirror (operator request 2026-10-06: "so you and
# I can always have access and not rely on an external HD").
#
# Copies E:\OTB-CAPTURE into G:\My Drive\00 OTB\OTB-CAPTURE. ADDITIVE ONLY:
# new and newer files are copied; nothing is ever deleted or overwritten-older
# on Drive, so a failing or swapped external drive can't wipe the mirror.
# E: stays the working copy (Drive may hold files online-only; the processing
# tools read local files). The Polycam inbox (tools/polycam-inbox.py) also
# copies each newly filed scan to Drive at ingest time; this catches the rest
# (drone footage, Insta360 clips, logs).
#
# Registered as Scheduled Task "OTB-Capture-Drive-Mirror" (daily 02:30).
# Re-register with:  powershell -File tools\capture-drive-mirror.ps1 -Register

param([switch]$Register)

$Repo = "C:\Users\adam\Projects\otb-command-claude-code-kit\otb-command"
$Src  = "E:\OTB-CAPTURE"
$Dest = "G:\My Drive\00 OTB\OTB-CAPTURE"
$Log  = Join-Path $Dest "mirror.log"

if ($Register) {
    $action = New-ScheduledTaskAction -Execute "powershell.exe" `
        -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$Repo\tools\capture-drive-mirror.ps1`""
    $trigger = New-ScheduledTaskTrigger -Daily -At 02:30
    Register-ScheduledTask -TaskName "OTB-Capture-Drive-Mirror" -Action $action -Trigger $trigger -Force | Out-Null
    Write-Host "Registered OTB-Capture-Drive-Mirror (daily 02:30)."
    exit 0
}

if (-not (Test-Path $Src))          { Write-Host "E:\OTB-CAPTURE not mounted - skipping."; exit 1 }
if (-not (Test-Path "G:\My Drive")) { Write-Host "Drive not mounted - skipping."; exit 1 }
New-Item -ItemType Directory -Force $Dest | Out-Null

# /E all subfolders · /XO skip files older than Drive's copy · no /MIR or /PURGE (never delete)
robocopy $Src $Dest /E /XO /R:2 /W:10 /NP /NFL /NDL /NJH | Out-Null
$code = $LASTEXITCODE
$stamp = Get-Date -Format "yyyy-MM-dd HH:mm"
Add-Content $Log "$stamp  robocopy exit $code  (0-7 = ok, 8+ = failures)"
if ($code -ge 8) { exit 1 } else { exit 0 }
