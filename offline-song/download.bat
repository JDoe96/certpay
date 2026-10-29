@echo off
REM Double-click me on Windows to download "My Bad Habit - Country Lunatic".
cd /d "%~dp0"
where python >nul 2>nul
if %errorlevel%==0 (
  python download.py
) else (
  where py >nul 2>nul
  if %errorlevel%==0 (
    py download.py
  ) else (
    echo Python was not found. Install it free from https://www.python.org/downloads/
    echo IMPORTANT: tick "Add python.exe to PATH" during install, then run this file again.
    start https://www.python.org/downloads/
  )
)
echo.
pause
