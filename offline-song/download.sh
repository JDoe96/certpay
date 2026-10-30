#!/usr/bin/env bash
# Mac / Linux / Android-Termux:  chmod +x download.sh && ./download.sh
set -e
cd "$(dirname "$0")"
if command -v python3 >/dev/null 2>&1; then
  python3 download.py "$@"
elif command -v python >/dev/null 2>&1; then
  python download.py "$@"
else
  echo "Python 3 was not found. Install it free from https://www.python.org/downloads/"
  echo "Android: install Termux, then run:  pkg install python ffmpeg"
  exit 1
fi
