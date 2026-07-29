# c3-nightly.ps1 - daily C3 occupancy: classify banked frames (Haiku, hourly
# sampling) and upload the results to Supabase. Companion to sampler-watchdog.ps1.
#
# Registered as Scheduled Tasks "OTB-C3-Nightly" (daily 23:45) and
# "OTB-C3-Midday" (daily 12:00 — same script; keeps the D-1 card showing
# same-morning data instead of yesterday's nightly batch. Classify+upload are
# frame-idempotent, so the nightly pass re-processes nothing the midday pass
# already did — earlier data, no extra Haiku spend).
# Re-register both after an OS reinstall with:
#   powershell -File tools\c3-nightly.ps1 -Register
#
# Secrets: ANTHROPIC_API_KEY + CRON_SECRET are pulled from the Vercel prod env
# at runtime (CLI logged in as orangeonyx), loaded into THIS process only, and
# the pulled file is deleted immediately. Never in chat, repo, or on disk.
#
# Capture day-dirs are UTC-keyed, so each run processes the current AND the
# previous UTC date - a >24h window; classify and upload are both idempotent,
# so the overlap re-processes nothing.

param([switch]$Register)

$Repo = "C:\Users\adam\Downloads\otb-command-claude-code-kit\otb-command"
$CaptureDir = "C:\Users\adam\Downloads\Drone Footage RAW\OTB-cube-capture"
$Log = Join-Path $CaptureDir "c3-nightly.log"

if ($Register) {
    $action = New-ScheduledTaskAction -Execute "powershell.exe" `
        -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$Repo\tools\c3-nightly.ps1`""
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
        -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 1)
    Register-ScheduledTask -TaskName "OTB-C3-Nightly" -Action $action `
        -Trigger (New-ScheduledTaskTrigger -Daily -At "23:45") -Settings $settings -Force | Out-Null
    Register-ScheduledTask -TaskName "OTB-C3-Midday" -Action $action `
        -Trigger (New-ScheduledTaskTrigger -Daily -At "12:00") -Settings $settings -Force | Out-Null
    Write-Output "Registered tasks OTB-C3-Nightly (daily 23:45) and OTB-C3-Midday (daily 12:00)."
    return
}

function Log($msg) { Add-Content $Log "[$(Get-Date)] $msg" }

# Under Task Scheduler python's stdout is cp1252 and c3-stalls.py prints
# unicode (the arrow in its verdict lines) - without this the first print
# raises UnicodeEncodeError and kills the classify after one frame.
$env:PYTHONUTF8 = "1"

Set-Location $Repo
Log "nightly run start"

# --- secrets: pull -> load -> delete ---
$envFile = Join-Path $env:TEMP "otb-c3-nightly.env"
npx vercel env pull $envFile --environment=production --yes --scope adams-projects-0c52918e 2>&1 | Out-Null
if (-not (Test-Path $envFile)) { Log "FAIL: vercel env pull produced no file"; exit 1 }
foreach ($name in "ANTHROPIC_API_KEY", "CRON_SECRET") {
    $line = Get-Content $envFile | Where-Object { $_ -match "^$name=" }
    if ($line) { Set-Item "env:$name" ($line -replace "^$name=`"?", "" -replace "`"$", "") }
}
Remove-Item $envFile -Force
if (-not $env:ANTHROPIC_API_KEY -or -not $env:CRON_SECRET) { Log "FAIL: secrets missing from env pull"; exit 1 }

# --- classify + upload the current and previous UTC dates ---
$now = (Get-Date).ToUniversalTime()
foreach ($d in @($now.AddDays(-1), $now)) {
    $date = $d.ToString("yyyy-MM-dd")
    if (-not (Test-Path (Join-Path $CaptureDir $date))) { Log "$date : no frame dir, skip"; continue }
    $c = python tools/c3-stalls.py --classify --date $date --every 12 2>&1 | Select-Object -Last 1
    Log "$date classify: $c"
    $u = node tools/c3-upload.mjs --date $date 2>&1 | Select-Object -Last 1
    Log "$date upload: $u"
}
Log "nightly run done"
