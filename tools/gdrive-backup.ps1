# OTB repo -> Google Drive backup (operator request 2026-08-03).
#
# Nightly git bundle of the FULL repo history (all branches + tags) into
# G:\My Drive\00 OTB\repo-backups\ - one self-contained ~20MB file per day,
# rotation keeps the last $Keep. Drive desktop syncs it to the cloud, so the
# repo survives GitHub-account loss AND local-disk loss independently.
# Restore drill:  git clone otb-command-YYYY-MM-DD.bundle restored-repo
# (a bundle is a first-class git remote; verify with `git bundle verify`).
#
# Untracked files are deliberately NOT captured (capture frames, junk, local
# env) - anything that matters must be committed, same discipline as always.
#
# Registered as Scheduled Task "OTB-Repo-Backup" (daily 03:00). Re-register
# after an OS reinstall with:
#   powershell -File tools\gdrive-backup.ps1 -Register

param([switch]$Register)

$Repo   = "C:\Users\adam\Projects\otb-command-claude-code-kit\otb-command"
$Dest   = "G:\My Drive\00 OTB\repo-backups"
$Keep   = 10
$Log    = Join-Path $Dest "backup.log"

if ($Register) {
    $action = New-ScheduledTaskAction -Execute "powershell.exe" `
        -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$Repo\tools\gdrive-backup.ps1`""
    $trigger = New-ScheduledTaskTrigger -Daily -At 03:00
    Register-ScheduledTask -TaskName "OTB-Repo-Backup" -Action $action -Trigger $trigger -Force | Out-Null
    Write-Host "Registered OTB-Repo-Backup (daily 03:00)."
    exit 0
}

if (-not (Test-Path "G:\My Drive")) { Write-Host "Drive not mounted - skipping."; exit 1 }
New-Item -ItemType Directory -Force $Dest | Out-Null

$stamp  = Get-Date -Format "yyyy-MM-dd"
$bundle = Join-Path $Dest "otb-command-$stamp.bundle"

Set-Location $Repo
git bundle create $bundle --all 2>&1 | Out-Null
$ok = (git bundle verify $bundle 2>&1 | Select-String "is okay") -ne $null
$size = [math]::Round((Get-Item $bundle).Length / 1MB, 1)

# rotate: newest $Keep bundles survive
Get-ChildItem $Dest -Filter "otb-command-*.bundle" | Sort-Object Name -Descending |
    Select-Object -Skip $Keep | Remove-Item -Force

Add-Content $Log "$(Get-Date -Format o) $stamp bundle=$size MB verify=$ok"
Write-Host "bundle: $bundle ($size MB, verify=$ok)"
if (-not $ok) { exit 1 }
