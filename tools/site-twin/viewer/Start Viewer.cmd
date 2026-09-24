@echo off
setlocal
cd /d "%~dp0"
echo Open http://127.0.0.1:8770 after the server starts.
echo Keep this window open while using the viewer.
where py >nul 2>nul
if not errorlevel 1 (
  py -3 server.py
) else (
  python server.py
)
if errorlevel 1 echo Python 3 is required. You can also serve this folder with any static web server.
pause
