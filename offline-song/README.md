# 🎵 Offline songs

Two tracks, one folder, one player — all playable with **no internet** once downloaded:

| # | Song | Length | Source |
|---|---|---|---|
| 1 | **My Bad Habit — Country Lunatic** | 5:06 | https://www.youtube.com/watch?v=qkrAngr_KY0 |
| 2 | **Catfish Billy 2 — Yelawolf** (*Trunk Muzik 3*) | 3:18 | https://www.youtube.com/watch?v=hnnVACOif1U (Official Yelawolf topic audio, provided by EMPIRE) |

You have 3 ways to listen offline. Pick whichever is easiest — #1 needs no computer skills at all.

---

## Option 1 — Official apps (easiest, tap "Download" in the app)

### Catfish Billy 2 — Yelawolf (℗ 2019 Slumerican / Shady / Interscope)
| App | Link |
|---|---|
| All services (official EMPIRE link) | https://empire.lnk.to/CatfishBilly2 |
| Spotify (exact track) | https://open.spotify.com/track/5SRMiogXzTURa0MyyroHGY |
| YouTube (Official audio) | https://www.youtube.com/watch?v=hnnVACOif1U |
| Full album *Trunk Muzik 3* | https://empire.lnk.to/TM3 |

### My Bad Habit — Country Lunatic (© 2025 F.O.W.B Independent Records L.L.C.)
| App | Link |
|---|---|
| YouTube / YouTube Music | https://music.youtube.com/channel/UCMwvUGKlLpy6z3-hjtm1hsg |
| Spotify | https://open.spotify.com/artist/6jbCtSWFPFnjsqwaaGicP5 |
| Apple Music | https://music.apple.com/us/artist/country-lunatic/1809527036 |
| Deezer | https://www.deezer.com/us/artist/318900841 |

- **YouTube app:** open the video → **⋯ / Download** button under it → it appears in *Library → Downloads* and plays offline (YouTube Premium feature in most regions).
- **YouTube Music / Spotify / Apple Music / Deezer:** open the track → **Download ↓** → plays offline inside that app.

## Option 2 — Your own MP3/M4A files (this folder, ~2 minutes)

Run this **on your own computer/phone on home Wi-Fi** (not a work/school/cloud network — those often block YouTube, which is why the files can't be fetched from the Arena workspace: YouTube is unreachable from there, verified again for the new track).

### Windows
1. First time only: install Python free from https://www.python.org/downloads/ and tick **"Add python.exe to PATH"**.
2. Double-click **`download.bat`** in this folder — it downloads **both** songs (anything already downloaded is skipped).
3. Wait for `All done!` — you'll have:
   - `Country Lunatic - My Bad Habit.mp3` (or `.m4a`)
   - `Yelawolf - Catfish Billy 2.mp3` (or `.m4a`)

### Mac / Linux
```bash
cd offline-song
chmod +x download.sh
./download.sh              # both tracks
./download.sh 2            # only Catfish Billy 2
./download.sh --list       # see what's already downloaded
```

### Just one track
```bash
python3 download.py 2               # Catfish Billy 2 only
python3 download.py 1               # My Bad Habit only
python3 download.py --only catfish  # same thing, by name
python3 download.py --check         # test your setup, download nothing
```

### Android phone (no computer)
1. Install **Termux** (from F-Droid or Google Play).
2. In Termux: `pkg install python ffmpeg -y`
3. Copy this `offline-song` folder to the phone, `cd` into it, run: `python download.py` (add `2` for only Catfish Billy 2).
4. The audio files land in that folder — move them to your Music folder.

### Then play offline
- **Easiest:** open **`player.html`** (in this same folder) in any browser — double-click it, tap a track, press ▶. Works from a USB stick, in airplane mode, no internet, no install. It auto-finds both downloaded files (green dot = ready, red dot = missing), has ⏮/⏭ track skipping, auto-plays the next song, and you can also drag-and-drop any audio file onto it.
- **Phone:** copy the `.mp3`/`.m4a` files to your phone's **Music** or **Downloads** folder (USB cable, email them to yourself, or cloud drive) — they show up in your normal music app.
- **Car/truck:** copy them to a USB stick.

> The downloader prefers MP3 when [ffmpeg](https://ffmpeg.org/download.html) is installed; without ffmpeg it saves the original `.m4a` audio, which plays in browsers, phones, and cars the same way. Re-running it is safe — finished tracks are skipped.

## Option 3 — Just want them on your phone fast?

Do Option 2 on a computer, then plug the phone in with USB and copy the two
audio files across. ~5–8 MB each, plays forever offline. Done.

---

### Files in this folder
| File | What it is |
|---|---|
| `download.py` | The downloader (installs yt-dlp itself; `--list`, `--check`, per-track numbers/names supported) |
| `download.bat` | Windows double-click launcher (both tracks) |
| `download.sh` | Mac/Linux/Termux launcher (forwards args, e.g. `./download.sh 2`) |
| `player.html` | Offline playlist player — one self-contained page, no internet needed |

### Troubleshooting
- **"TLS / connection closed / Unable to download webpage"** → that network blocks YouTube. Run it on home Wi-Fi or a phone hotspot. (This is exactly what happens in the cloud workspace, so the files have to be grabbed on your own device.)
- **"Python was not found"** → install from https://www.python.org/downloads/ (tick *Add to PATH* on Windows), then re-run.
- **Download worked but file is `.m4a`, not `.mp3`** → that's fine, it plays everywhere. Install ffmpeg and re-run if you specifically need MP3.
- **Player shows a red "missing" dot** → that track's audio file must sit in the *same folder* as `player.html` (run the downloader), or use the track list / **Choose audio file…** button.
- **Wrong song version?** Track 2 uses the Official Yelawolf topic audio (`hnnVACOif1U`, EMPIRE) — not a live/fan re-upload.

### Note
Both tracks are copyrighted (*Catfish Billy 2* ℗ 2019 Slumerican / Shady /
Interscope; *My Bad Habit* © 2025 F.O.W.B Independent Records L.L.C.) — keep
your downloads for your own personal offline listening, and support the
artists via the official links above. Downloaded audio is git-ignored here
so it never gets committed to the CertPay repo.
