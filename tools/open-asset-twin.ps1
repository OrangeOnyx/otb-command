[CmdletBinding()]
param([switch]$NoBrowser)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Test-OtbAppHtml {
    param([AllowEmptyString()][string]$Html)
    return ($Html -match '(?is)<title>\s*Cypress Command Platform[^<]*On The Boulevard\s*</title>' -and
        $Html -match 'id=["'']pg-spatial["'']' -and
        $Html -match 'src=["'']/src/main\.js(?:\?[^"'']*)?["'']')
}

function Test-OtbPortListening {
    $socket = [System.Net.Sockets.TcpClient]::new()
    try {
        $connect = $socket.BeginConnect('127.0.0.1', 5174, $null, $null)
        if (-not $connect.AsyncWaitHandle.WaitOne(400)) { return $false }
        $socket.EndConnect($connect)
        return $socket.Connected
    } catch { return $false }
    finally { $socket.Close(); $socket.Dispose() }
}

function Test-OtbReviewReady {
    try {
        # Read only the public app shell; never request or print config/env data.
        $response = Invoke-WebRequest -Uri 'http://127.0.0.1:5174/' -UseBasicParsing -TimeoutSec 1 -MaximumRedirection 0
        return ($response.StatusCode -eq 200 -and (Test-OtbAppHtml -Html ([string]$response.Content)))
    } catch { return $false }
}

function Open-OtbAssetTwin {
    param([switch]$SkipBrowser)
    $projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
    $reviewScript = Join-Path $projectRoot 'tools/dev-review.mjs'
    $viteScript = Join-Path $projectRoot 'node_modules/vite/bin/vite.js'
    $twinUrl = 'http://127.0.0.1:5174/?view=twin&layout=interior#spatial'

    if (Test-OtbPortListening) {
        if (-not (Test-OtbReviewReady)) {
            throw 'Port 5174 is occupied, but it did not return the OTB application. Nothing was stopped or replaced. Check the program using that port, then try again.'
        }
        Write-Host 'Reusing the running OTB application on port 5174.'
    } else {
        if (-not (Test-Path -LiteralPath $reviewScript -PathType Leaf)) {
            throw "Local review runner is missing: $reviewScript"
        }
        if (-not (Test-Path -LiteralPath $viteScript -PathType Leaf)) {
            throw 'Existing Vite dependencies were not found in this checkout. Restore the project dependencies before opening the twin; this launcher does not install packages.'
        }
        $nodeCommand = Get-Command node.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
        $bundledNode = 'C:\Users\adam\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
        if ($nodeCommand) { $nodePath = $nodeCommand.Source }
        elseif (Test-Path -LiteralPath $bundledNode -PathType Leaf) { $nodePath = $bundledNode }
        else { throw 'Node.js was not found on PATH or in the existing Codex bundled runtime.' }

        # .cache is already ignored by Git. Keep each start's diagnostic logs.
        $logDirectory = Join-Path $projectRoot '.cache/asset-twin-launcher'
        [void](New-Item -ItemType Directory -Path $logDirectory -Force)
        $stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
        $stdoutLog = Join-Path $logDirectory "review-$stamp.stdout.log"
        $stderrLog = Join-Path $logDirectory "review-$stamp.stderr.log"
        $server = Start-Process -FilePath $nodePath -ArgumentList ('"' + $reviewScript + '"') -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog -PassThru
        Write-Host "Starting OTB local review (launcher process $($server.Id))."

        $timer = [System.Diagnostics.Stopwatch]::StartNew()
        $ready = $false
        while ($timer.ElapsedMilliseconds -lt 15000) {
            $remaining = 15000 - $timer.ElapsedMilliseconds
            if ($remaining -lt 1100) { break }
            if (Test-OtbReviewReady) { $ready = $true; break }
            $server.Refresh()
            if ($server.HasExited) { break }
            Start-Sleep -Milliseconds 200
        }
        $timer.Stop()
        if (-not $ready) {
            throw "OTB did not become ready within 15 seconds. Logs: $stdoutLog and $stderrLog. No process was stopped."
        }
        Write-Host "Ready. Diagnostic logs: $logDirectory"
    }

    Write-Host $twinUrl
    if (-not $SkipBrowser) { Start-Process -FilePath $twinUrl | Out-Null }
}

# Dot-sourcing exposes the small validation helpers without starting a server.
if ($MyInvocation.InvocationName -ne '.') {
    try { Open-OtbAssetTwin -SkipBrowser:$NoBrowser }
    catch { Write-Error $_.Exception.Message; exit 1 }
}
