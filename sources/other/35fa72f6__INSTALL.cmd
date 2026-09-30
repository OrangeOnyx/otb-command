@echo off
setlocal
REM Installs the decision app. Put this file and otb-decision-engine.tar.gz in the
REM same folder (Downloads is fine) and double-click this file.

set "DEST=C:\Users\%USERNAME%\Documents\Codex\2026-07-28\orange-ocean-knowledge-system\tools\decision-engine"
set "SRC=%~dp0otb-decision-engine.tar.gz"

if not exist "%SRC%" (
  echo Could not find otb-decision-engine.tar.gz next to this file.
  echo Put both files in the same folder and run this again.
  pause & exit /b 1
)

echo Installing to %DEST%
if not exist "%DEST%" mkdir "%DEST%"
if exist "%DEST%\brief.config.json" copy /y "%DEST%\brief.config.json" "%DEST%\brief.config.prev.json" >nul
tar -xzf "%SRC%" -C "%DEST%" --strip-components=1
if errorlevel 1 ( echo Extract failed. & pause & exit /b 1 )

pushd "%DEST%"
REM Restore the configured paths, then merge in any new source keys from the shipped config.
if exist "brief.config.prev.json" (
  python -c "import json;prev=json.load(open('brief.config.prev.json'));new=json.load(open('brief.config.json'));new.update({k:v for k,v in prev.items() if k!='sources'});s=dict(new.get('sources') or {});s.update(prev.get('sources') or {});new['sources']=s;json.dump(new,open('brief.config.json','w'),indent=2)"
  del "brief.config.prev.json"
  echo Existing configuration preserved.
)
echo.
echo Running tests...
python tests\test_brief.py 2>&1 | findstr /C:"Ran " /C:"OK" /C:"FAILED"
python tests\test_serve.py 2>&1 | findstr /C:"Ran " /C:"OK" /C:"FAILED"
echo.

REM Preserve existing config if one is already there, else point at the live vault
if not exist "brief.config.json.installed" (
  powershell -NoProfile -Command "$r='C:\Users\%USERNAME%\Documents\Codex\2026-07-28\orange-ocean-knowledge-system'; $c=Get-Content -Raw brief.config.json ^| ConvertFrom-Json; $c.vault_root=\"$r\vault\"; $c.risk_register=\"$r\vault\60 Projects\Risk and Issue Register.md\"; if(-not $c.PSObject.Properties.Name.Contains('principal')){$c ^| Add-Member -NotePropertyName principal -NotePropertyValue 'adam@adamabdalla.com'}; $c ^| ConvertTo-Json ^| Set-Content -Encoding UTF8 brief.config.json"
  echo config> brief.config.json.installed
)

for /f "delims=" %%P in ('where python') do set "PY=%%P" & goto :gotpy
:gotpy
> "Decisions.cmd" echo @echo off
>> "Decisions.cmd" echo cd /d "%DEST%"
>> "Decisions.cmd" echo "%PY%" tools\serve.py

powershell -NoProfile -Command "$w=New-Object -ComObject WScript.Shell; $l=$w.CreateShortcut(([Environment]::GetFolderPath('Desktop')+'\Decisions.lnk')); $l.TargetPath='%DEST%\Decisions.cmd'; $l.WorkingDirectory='%DEST%'; $l.Save()"

echo.
echo Done. There is now a "Decisions" shortcut on your desktop.
echo Opening it once now.
start "" "%DEST%\Decisions.cmd"
popd
endlocal
