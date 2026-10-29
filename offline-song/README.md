# 🎵 My Bad Habit — Country Lunatic (offline)

**Song:** [My Bad Habit ☆ Country Lunatic #lunaticnation](https://www.youtube.com/watch?v=qkrAngr_KY0)
**Artist:** Country Lunatic · **Length:** 5:06 · **© 2025 F.O.W.B Independent Records L.L.C.**

You have 3 ways to listen offline. Pick whichever is easiest — #1 needs no computer skills at all.

---

## Option 1 — Official apps (easiest, tap "Download" in the app)

The artist's own links (from the video description). Open his page, find the
song, and use that app's **Download** button — it then plays with no signal:

| App | Link |
|---|---|
| YouTube / YouTube Music | https://music.youtube.com/channel/UCMwvUGKlLpy6z3-hjtm1hsg |
| Spotify | https://open.spotify.com/artist/6jbCtSWFPFnjsqwaaGicP5 |
| Apple Music | https://music.apple.com/us/artist/country-lunatic/1809527036 |
| Deezer | https://www.deezer.com/us/artist/318900841 |

- **YouTube app:** open the video → **⋯ / Download** button under it → it appears in *Library → Downloads* and plays offline (YouTube Premium feature in most regions).
- **YouTube Music / Spotify / Apple Music / Deezer:** open the track → **Download ↓** → plays offline inside that app.

## Option 2 — Your own MP3/M4A file (this folder, ~2 minutes)

Run this **on your own computer/phone on home Wi-Fi** (not a work/school/cloud network — those often block YouTube, which is why it can't be fetched from the Arena workspace: YouTube is unreachable from there).

### Windows
1. First time only: install Python free from https://www.python.org/downloads/ and tick **"Add python.exe to PATH"**.
2. Double-click **`download.bat`** in this folder.
3. Wait for `Done: Country Lunatic - My Bad Habit.mp3` (or `.m4a`).

### Mac / Linux
```bash
cd offline-song
chmod +x download.sh
./download.sh
```

### Android phone (no computer)
1. Install **Termux** (from F-Droid or Google Play).
2. In Termux: `pkg install python ffmpeg -y`
3. Copy this `offline-song` folder to the phone, `cd` into it, run: `python download.py`
4. The audio file lands in that folder — move it to your Music folder.

### Then play it offline
- **Easiest:** open **`player.html`** (in this same folder) in any browser — double-click it, press ▶. Works from a USB stick, in airplane mode, no internet, no install. It auto-finds the downloaded file, and you can also drag-and-drop the file onto it.
- **Phone:** copy the `.mp3`/`.m4a` to your phone's **Music** or **Downloads** folder (USB cable, email it to yourself, or cloud drive) — it shows up in your normal music app.
- **Car/truck:** copy it to a USB stick.

> The downloader prefers MP3 when [ffmpeg](https://ffmpeg.org/download.html) is installed; without ffmpeg it saves the original `.m4a` audio, which plays in browsers, phones, and cars the same way. Re-running it is safe — it skips the download if the file is already there.

## Option 3 — Just want it on your phone fast?

Do Option 2 on a computer, then plug the phone in with USB and copy the single
audio file across. One file, ~5–8 MB, plays forever offline. Done.

---

### Files in this folder
| File | What it is |
|---|---|
| `download.py` | The downloader (installs yt-dlp itself; run `python3 download.py --check` to test your setup without downloading) |
| `download.bat` | Windows double-click launcher |
| `download.sh` | Mac/Linux/Termux launcher |
| `player.html` | Offline player — one self-contained page, no internet needed |

### Troubleshooting
- **"TLS / connection closed / Unable to download webpage"** → that network blocks YouTube. Run it on home Wi-Fi or a phone hotspot. (This is exactly what happens in the cloud workspace, so the file has to be grabbed on your own device.)
- **"Python was not found"** → install from https://www.python.org/downloads/ (tick *Add to PATH* on Windows), then re-run.
- **Download worked but file is `.m4a`, not `.mp3`** → that's fine, it plays everywhere. Install ffmpeg and re-run if you specifically need MP3.
- **Player says "Song file not in this folder yet"** → the audio file must sit in the *same folder* as `player.html`, or use its **Choose audio file…** button.

### Note
This track is © 2025 F.O.W.B Independent Records L.L.C. — keep your download for
your own personal offline listening, and support the artist via the official
links above. Downloaded audio is git-ignored here so it never gets committed
to the CertPay repo.
