# sampler-watchdog.ps1 - keep the C3 Cube frame sampler alive.
#
# The sampler (tools/cube-frames.mjs --loop 300) is a detached node process that
# has died three times (2x reboot, 1x silent kill 2026-07-22 ~02:38). This script
# is the self-heal: if the PID in sampler.pid is gone (or is no longer node),
# relaunch the sampler and rewrite the pid file.
#
# Registered as Scheduled Task "OTB-C3-Sampler-Watchdog" (user-level, at logon +
# every 5 minutes). Re-register after an OS reinstall with:
#   powershell -File tools\sampler-watchdog.ps1 -Register
#
# Frames land OUTSIDE the repo (standing rule). The --out path is passed with
# embedded quotes - Start-Process -ArgumentList splits unquoted space paths
# (07-16 lesson: 2,890 frames went to Downloads\Drone\).

param([switch]$Register)

$Repo = "C:\Users\adam\Projects\otb-command-claude-code-kit\otb-command"
$CaptureDir = "E:\OTB-CAPTURE\Drone-Footage-RAW-2026-07\OTB-cube-capture"
$PidFile = Join-Path $CaptureDir "sampler.pid"
$Log = Join-Path $CaptureDir "sampler.log"

if ($Register) {
    $action = New-ScheduledTaskAction -Execute "powershell.exe" `
        -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$Repo\tools\sampler-watchdog.ps1`""
    $trigLogon = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
    $trigRepeat = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) `
        -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 3650)
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
        -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 4)
    Register-ScheduledTask -TaskName "OTB-C3-Sampler-Watchdog" -Action $action `
        -Trigger $trigLogon, $trigRepeat -Settings $settings -Force | Out-Null
    Write-Output "Registered task OTB-C3-Sampler-Watchdog (at logon + every 5 min)."
    return
}

# --- watchdog pass ---
$alive = $false
if (Test-Path $PidFile) {
    $samplerPid = (Get-Content $PidFile).Trim()
    $p = Get-Process -Id $samplerPid -ErrorAction SilentlyContinue
    if ($p -and $p.ProcessName -eq "node") { $alive = $true }
}
if ($alive) { return }

$out = '"' + $CaptureDir + '"'
$p = Start-Process node -ArgumentList "tools/cube-frames.mjs", "--loop", "300", "--out", $out `
    -WorkingDirectory $Repo -WindowStyle Hidden -PassThru
Set-Content $PidFile $p.Id
Add-Content $Log "[$(Get-Date)] WATCHDOG: sampler was down - relaunched as PID $($p.Id)"
