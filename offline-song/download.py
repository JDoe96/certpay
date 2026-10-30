#!/usr/bin/env python3
"""
Download songs for personal offline listening into this folder.

Tracks:
  1. "My Bad Habit"    - Country Lunatic   (5:06)
  2. "Catfish Billy 2" - Yelawolf          (3:18, Trunk Muzik 3)

Run this on YOUR OWN computer/phone (home Wi-Fi), not in a restricted
cloud workspace -- it needs to be able to reach youtube.com.

Usage:
    python3 download.py              # download every missing track
    python3 download.py 2            # download only track 2
    python3 download.py --only catfish
    python3 download.py --only 1 2
    python3 download.py --list       # show tracks + what is already here
    python3 download.py --check      # only check tools, download nothing

What it does:
  * Installs yt-dlp automatically if it is missing.
  * Skips any track already downloaded (safe to re-run anytime).
  * If ffmpeg is installed: saves an MP3 (192 kbps) with title/artist tags.
  * If ffmpeg is NOT installed: saves the original best-quality audio
    (.m4a usually) with no conversion needed -- it plays in every
    phone/car/browser music app just like an MP3.

All tracks are copyrighted by their respective labels/artists.
Keep downloaded files for your own personal offline use.
"""

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent

TRACKS = [
    {
        "num": 1,
        "slug": "my-bad-habit",
        "title": "My Bad Habit",
        "artist": "Country Lunatic",
        "album": "Lunatic Nation",
        "length": "5:06",
        "url": "https://www.youtube.com/watch?v=qkrAngr_KY0",
        "credit": "(c) 2025 F.O.W.B Independent Records L.L.C.",
    },
    {
        "num": 2,
        "slug": "catfish-billy-2",
        "title": "Catfish Billy 2",
        "artist": "Yelawolf",
        "album": "Trunk Muzik 3",
        "length": "3:18",
        # Official Yelawolf topic audio (provided to YouTube by EMPIRE).
        "url": "https://www.youtube.com/watch?v=hnnVACOif1U",
        "credit": "(p) 2019 Slumerican / Shady / Interscope",
    },
]

EXTS = ("mp3", "m4a", "webm", "opus", "ogg")


def basename(track) -> str:
    return f"{track['artist']} - {track['title']}"


def already_downloaded(track):
    for ext in EXTS:
        candidate = HERE / f"{basename(track)}.{ext}"
        if candidate.exists() and candidate.stat().st_size > 100_000:
            return candidate
    return None


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


def ytdlp_prefix() -> list:
    """How to invoke yt-dlp: python module preferred, binary fallback."""
    try:
        import yt_dlp  # noqa: F401
        return [sys.executable, "-m", "yt_dlp"]
    except ImportError:
        binary = shutil.which("yt-dlp")
        return [binary] if binary else [sys.executable, "-m", "yt_dlp"]


def build_command(track) -> list:
    """Build the yt-dlp command, preferring MP3 when ffmpeg exists."""
    out = str(HERE / f"{basename(track)}.%(ext)s")
    cmd = ytdlp_prefix() + ["--no-playlist", "-o", out]
    if shutil.which("ffmpeg"):
        cmd += [
            "-x", "--audio-format", "mp3", "--audio-quality", "192K",
            "--embed-metadata", "--embed-thumbnail",
        ]
    else:
        cmd += ["-f", "bestaudio[ext=m4a]/bestaudio/best", "--embed-metadata"]
    cmd.append(track["url"])
    return cmd


def download_one(track) -> bool:
    print(f"\n[{track['num']}] \"{track['title']}\" - {track['artist']} "
          f"({track['album']}, {track['length']})")
    print(f"    Source: {track['url']}")
    existing = already_downloaded(track)
    if existing:
        print(f"    Already downloaded: {existing.name} -- skipping.")
        return True
    result = subprocess.run(build_command(track), check=False)
    downloaded = already_downloaded(track)
    if result.returncode == 0 and downloaded:
        size_mb = downloaded.stat().st_size / 1_000_000
        print(f"    Done: {downloaded.name}  ({size_mb:.1f} MB)")
        return True
    print(f"    FAILED: \"{track['title']}\" did not download (see tips below).")
    return False


def select_tracks(selectors):
    """Map user selectors (number / slug / substring) to tracks."""
    if not selectors:
        return list(TRACKS), []
    chosen, unknown = [], []
    for sel in selectors:
        needle = str(sel).strip().lower()
        match = None
        for track in TRACKS:
            haystacks = [
                str(track["num"]), track["slug"], track["title"].lower(),
                track["artist"].lower(), f"{track['artist']} - {track['title']}".lower(),
            ]
            if needle in haystacks or (len(needle) >= 3 and any(needle in h for h in haystacks)):
                match = track
                break
        if match and match not in chosen:
            chosen.append(match)
        elif not match:
            unknown.append(sel)
    chosen.sort(key=lambda t: t["num"])
    return chosen, unknown


def print_list() -> None:
    print("Tracks in this offline kit:")
    for track in TRACKS:
        existing = already_downloaded(track)
        state = f"DOWNLOADED ({existing.name})" if existing else "not downloaded yet"
        print(f"  {track['num']}. \"{track['title']}\" - {track['artist']} "
              f"[{track['album']}, {track['length']}] -- {state}")
        print(f"     {track['url']}  ({track['credit']})")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Download your offline songs into this folder (personal use)."
    )
    parser.add_argument("tracks", nargs="*", metavar="TRACK",
                        help="optional: track number/name to get, e.g. 2 or catfish")
    parser.add_argument("--only", nargs="+", metavar="TRACK",
                        help="same as positional TRACK, e.g. --only 1 2")
    parser.add_argument("--list", action="store_true",
                        help="list tracks and download status, then exit")
    parser.add_argument("--check", action="store_true",
                        help="check tools only, download nothing")
    args = parser.parse_args()

    selectors = list(args.tracks) + list(args.only or [])
    selected, unknown = select_tracks(selectors)

    print("Offline song downloader")
    print(f"Folder : {HERE}")
    print(f"Python : {sys.version.split()[0]}")
    ffmpeg = shutil.which("ffmpeg")
    print(f"ffmpeg : {ffmpeg or 'not installed (m4a fallback, still plays everywhere)'}")
    print_list()

    if unknown:
        print(f"\nERROR: unknown track selector(s): {', '.join(map(str, unknown))}")
        print("Use a track number (1, 2) or part of the name, e.g.:  python3 download.py 2")
        return 2
    if args.list:
        return 0

    if not ensure_ytdlp():
        print("\nERROR: could not install yt-dlp. Install Python 3 from")
        print("https://www.python.org/downloads/ then run:  pip install yt-dlp")
        return 1
    print("yt-dlp : OK")

    if args.check:
        names = ", ".join(f"#{t['num']} {t['title']}" for t in selected)
        print(f"\n--check passed: ready to download {names}. Nothing downloaded.")
        return 0

    wanted = ", ".join(f"\"{t['title']}\"" for t in selected)
    print(f"\nDownloading: {wanted}")
    print("(needs youtube.com reachable -- use home Wi-Fi) ...")
    results = [download_one(track) for track in selected]

    if all(results):
        print("\nAll done! Play offline any of these ways:")
        print("  1. Double-click player.html in this folder (works offline), pick a track, press play.")
        print("  2. Copy the audio file(s) to your phone's Music/Downloads folder.")
        print("  3. Copy them to a USB stick for the car / truck radio.")
        return 0

    print("\nSome download(s) did not finish. Most common causes:")
    print("  * This network blocks youtube.com (work/school/cloud Wi-Fi).")
    print("    -> Re-run on your home computer or phone hotspot.")
    print("  * No internet right now -> reconnect and run it again (finished tracks are skipped).")
    print("  * yt-dlp is out of date -> run:  pip install -U yt-dlp")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
