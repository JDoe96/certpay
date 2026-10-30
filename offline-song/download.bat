@echo off
REM Double-click me on Windows to download your offline songs (both tracks; finished ones are skipped).
REM Track 1: My Bad Habit - Country Lunatic   Track 2: Catfish Billy 2 - Yelawolf
REM For just one track, open a terminal here and run:  python download.py 2
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
