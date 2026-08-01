# c3-nightly.ps1 - daily C3 occupancy pulled from the DW Spectrum ARCHIVE.
#
# 2026-08-01: the live 300s sampler (cube-frames.mjs + sampler-watchdog.ps1) was
# RETIRED. Two measurements drove it: (1) the classifier only ever consumed one
# frame per camera per hour, so ~92% of sampled frames were never read; (2) the
# Cube's archive retention is >= 55 days on all 17 cameras - verified 2026-08-01
# by cube-backfill (17/17 pulled at 2026-06-07; 4/17 at 2026-05-25). Storing a
# frame every 300s bought nothing the archive did not already hold.
#
# This script now pulls exactly the hourly frames it needs, classifies them,
# uploads, and prunes local frames past $KeepDays.
#
# Registered as Scheduled Tasks "OTB-C3-Nightly" (daily 23:45) and
# "OTB-C3-Midday" (daily 12:00 - keeps the D-1 card on same-morning data).
# Re-register both after an OS reinstall with:
#   powershell -File tools\c3-nightly.ps1 -Register
#
# Failure tolerance: a missed run is no longer data loss. The archive holds far
# more than $BackfillDays, so raise $BackfillDays (or run once by hand with a
# wider window) to recover any outage - nothing needs restoring.
#
# Secrets: ANTHROPIC_API_KEY + CRON_SECRET are pulled from the Vercel prod env
# at runtime (CLI logged in as orangeonyx), loaded into THIS process only, and
# the pulled file is deleted immediately. Never in chat, repo, or on disk.
#
# Day-dirs are UTC-keyed (toISOString) while frame FILENAMES carry naive local
# time - the collectors' long-standing convention, which c3-upload.mjs relies on.
# Backfill, classify and upload are each idempotent, so overlapping windows and
# re-runs re-process nothing.

param([switch]$Register)

$Repo       = "C:\Users\adam\Projects\otb-command-claude-code-kit\otb-command"
$CaptureDir = "E:\OTB-CAPTURE\Drone-Footage-RAW-2026-07\OTB-cube-capture"
$Log        = Join-Path $CaptureDir "c3-nightly.log"

$BackfillDays = 2     # local days re-pulled each run (today + yesterday)
$EverySec     = 3600  # one frame per camera per hour - what the classifier reads
$KeepDays     = 21    # local frame retention; the archive still holds ~55 days

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
Log "nightly run start (archive mode, backfill ${BackfillDays}d @ ${EverySec}s)"

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

# --- 1. backfill the hourly frames from the archive (local-time window) ---
$fromLocal = (Get-Date).AddDays(-($BackfillDays - 1)).ToString("yyyy-MM-dd") + " 00:00"
$toLocal   = (Get-Date).ToString("yyyy-MM-dd HH:mm")
$b = node tools/cube-backfill.mjs --from $fromLocal --to $toLocal --every $EverySec --out $CaptureDir 2>&1 | Select-Object -Last 1
Log "backfill $fromLocal -> $toLocal : $b"

# --- 2. classify + upload the current and previous UTC dates ---
$now = (Get-Date).ToUniversalTime()
foreach ($d in @($now.AddDays(-1), $now)) {
    $date = $d.ToString("yyyy-MM-dd")
    if (-not (Test-Path (Join-Path $CaptureDir $date))) { Log "$date : no frame dir, skip"; continue }
    $c = python tools/c3-stalls.py --classify --date $date --every 1 2>&1 | Select-Object -Last 1
    Log "$date classify: $c"
    $u = node tools/c3-upload.mjs --date $date 2>&1 | Select-Object -Last 1
    Log "$date upload: $u"
}

# --- 3. prune local frames past the retention window (archive is the backstop) ---
$cutoff = (Get-Date).ToUniversalTime().AddDays(-$KeepDays)
$pruned = 0; $prunedBytes = 0
foreach ($dir in (Get-ChildItem $CaptureDir -Directory -Force -ErrorAction SilentlyContinue)) {
    if ($dir.Name -notmatch '^\d{4}-\d{2}-\d{2}$') { continue }
    $dt = [datetime]::MinValue
    if (-not [datetime]::TryParseExact($dir.Name, "yyyy-MM-dd", $null, [Globalization.DateTimeStyles]::None, [ref]$dt)) { continue }
    if ($dt -lt $cutoff) {
        $m = Get-ChildItem $dir.FullName -Recurse -File -Force -ErrorAction SilentlyContinue | Measure-Object Length -Sum
        Remove-Item -LiteralPath $dir.FullName -Recurse -Force -ErrorAction SilentlyContinue
        if (-not (Test-Path $dir.FullName)) { $pruned += $m.Count; $prunedBytes += $m.Sum }
    }
}
if ($pruned -gt 0) { Log ("pruned $pruned frames older than $KeepDays d (" + [math]::Round($prunedBytes/1MB,0) + " MB) - still recoverable from the archive") }

Log "nightly run done"
