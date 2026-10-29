#!/usr/bin/env python3
"""
Download "My Bad Habit" - Country Lunatic for personal offline listening.

Run this on YOUR OWN computer/phone (home Wi-Fi), not in a restricted
cloud workspace -- it needs to be able to reach youtube.com.

Usage:
    python3 download.py            # download the song next to this script
    python3 download.py --check    # only check tools, download nothing

What it does:
  * Installs yt-dlp automatically if it is missing.
  * If ffmpeg is installed: saves an MP3 (192 kbps) with title/artist tags.
  * If ffmpeg is NOT installed: saves the original best-quality audio
    (.m4a usually) with no conversion needed -- it plays in every
    phone/car/browser music app just like an MP3.

The song is (c) 2025 F.O.W.B Independent Records L.L.C.
Keep the downloaded file for your own personal offline use.
"""

import shutil
import subprocess
import sys
from pathlib import Path

URL = "https://www.youtube.com/watch?v=qkrAngr_KY0"
TITLE = "My Bad Habit"
ARTIST = "Country Lunatic"
HERE = Path(__file__).resolve().parent
BASENAME = f"{ARTIST} - {TITLE}"


def ensure_ytdlp() -> bool:
    """Return True if yt-dlp is usable (installing it if needed)."""
    try:
        import yt_dlp  # noqa: F401
        return True
    except ImportError:
        pass
    if shutil.which("yt-dlp"):
        return True
    print("Installing yt-dlp (one-time, ~3 MB) ...")
    for extra in ([], ["--break-system-packages"]):
        result = subprocess.run(
            [sys.executable, "-m", "pip", "install", "--user", *extra, "yt-dlp"],
            check=False,
        )
        if result.returncode == 0:
            try:
                import yt_dlp  # noqa: F401
                return True
            except ImportError:
                if shutil.which("yt-dlp"):
                    return True
                # pip --user scripts dir may not be importable in this
                # process yet; the subprocess fallback below handles it.
                return True
    return False


def build_command() -> list:
    """Build the yt-dlp command, preferring MP3 when ffmpeg exists."""
    out = str(HERE / f"{BASENAME}.%(ext)s")
    base = [
        sys.executable, "-m", "yt_dlp",
        "--no-playlist",
        "--restrict-filenames", "off",
        "-o", out,
        URL,
    ]
    # Prefer the python module; fall back to the yt-dlp binary.
    try:
        import yt_dlp  # noqa: F401
    except ImportError:
        binary = shutil.which("yt-dlp")
        if binary:
            base[0:3] = [binary]

    if shutil.which("ffmpeg"):
        print("ffmpeg found -> will save as MP3 (192 kbps) with tags.")
        return base[:-1] + [
            "-x", "--audio-format", "mp3", "--audio-quality", "192K",
            "--embed-metadata", "--embed-thumbnail",
            URL,
        ]
    print("ffmpeg not found -> saving original audio (.m4a), no conversion needed.")
    print("Tip: install ffmpeg later if you specifically need .mp3.")
    return base[:-1] + [
        "-f", "bestaudio[ext=m4a]/bestaudio/best",
        "--embed-metadata",
        URL,
    ]


def already_downloaded():
    for ext in ("mp3", "m4a", "webm", "opus", "ogg"):
        candidate = HERE / f"{BASENAME}.{ext}"
        if candidate.exists() and candidate.stat().st_size > 100_000:
            return candidate
    return None


def main() -> int:
    check_only = "--check" in sys.argv
    print(f'"{TITLE}" - {ARTIST}')
    print(f"Source : {URL}")
    print(f"Folder : {HERE}")
    print(f"Python : {sys.version.split()[0]}")
    print(f"ffmpeg : {shutil.which('ffmpeg') or 'not installed (m4a fallback)'}")

    if not ensure_ytdlp():
        print("\nERROR: could not install yt-dlp. Install Python 3 from")
        print("https://www.python.org/downloads/ then run:  pip install yt-dlp")
        return 1
    print("yt-dlp : OK")

    existing = already_downloaded()
    if existing:
        print(f"\nAlready downloaded: {existing.name}")
        print("Open player.html in this folder, or copy the file to your phone.")
        return 0

    if check_only:
        print("\n--check passed: everything needed is ready. Nothing downloaded.")
        return 0

    print("\nDownloading (needs youtube.com reachable -- use home Wi-Fi) ...")
    result = subprocess.run(build_command(), check=False)
    downloaded = already_downloaded()
    if result.returncode == 0 and downloaded:
        size_mb = downloaded.stat().st_size / 1_000_000
        print(f"\nDone: {downloaded.name}  ({size_mb:.1f} MB)")
        print("Play it offline any of these ways:")
        print("  1. Double-click player.html in this folder (works offline).")
        print("  2. Copy the audio file to your phone's Music/Downloads folder.")
        print("  3. Copy it to a USB stick for the car / truck radio.")
        return 0

    print("\nDownload did not finish. Most common causes:")
    print("  * This network blocks youtube.com (work/school/cloud Wi-Fi).")
    print("    -> Re-run on your home computer or phone hotspot.")
    print("  * No internet right now -> reconnect and run it again.")
    print("  * yt-dlp is out of date -> run:  pip install -U yt-dlp")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
