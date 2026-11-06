# Tab Commander demo — second cut

Replacement for the first cuts. Same raw recording. Landing-page design (Fraunces, Outfit, `#101218`, cream `#f4f1ea`, amber `#e7c36a`, blue `#9eb6ff`). The first cut’s navy grid, teal type, “47 tabs,” “2 seconds,” voice-success card, and invented close button are not in this cut.

## Runtime

- 45.0 seconds, 30 fps, H.264 (`yuv420p`, CRF 18) and AAC stereo 48 kHz.
- `out/tab-commander-demo-1080p.mp4` is 1920×1080.
- `out/tab-commander-demo-square.mp4` is 1080×1080, laid out again (centered kickers, a wider panel, a stacked end card). It is not a crop of the 16:9 file.
- `out/poster.png` is the 16:9 opening frame.

## What the recording actually supports

Source: `originals/raw.mp4` (copy of the 316.2 s, 1280×800, 15 fps capture). Chrome was recorded. Edwin confirmed the extension also runs in Edge; this video says that and does not pretend the footage is Edge.

| Section | Source time | What is visible |
| --- | --- | --- |
| Open | none | Type only. Landing headline. No tab count. |
| The dashboard | 209.2–212.8 s | Eight tabs, two windows. Header reads “8 tabs open.” |
| The filter | 214.3–216.7 s | Only the Wikipedia row remains. “wiki” is highlighted in the title and URL. The search field is off the right edge and is not drawn in. |
| The jump | 221.3–222.9 s | wikipedia.org. The error flash near 220 s is not used. |
| The close | 268.4–271.8 s, then 274.6–276.4 s | Weather and Example Domain are checked while the header still says 8. The next shot is the same dashboard at 6 tabs, those two rows gone. The close control is off the right edge and is not drawn in. |
| End | none | One install CTA, the store URL, and a QR code. |

Voice is omitted. The recording only reaches “Listening…” beside a permission prompt. No spoken command completes.

Not used, because they are not in this recording: 47 tabs, a 2-second search, closing 10/12/20 tabs, duplicate finding, ratings, sales, Pro, or a microphone success.

## Design

- Background `#101218` with the landing page’s blue corner glow.
- Fraunces headlines and Outfit text, instantiated from `landing/fonts`.
- Amber mono kickers. Cream caption pills with ink text.
- Logo redrawn from `landing/favicon.svg`.
- 0.4 s crossfades. No punch-in that would crop in a fake control.
- End card holds about 10.6 s. `zbarimg` decoded `qr.png` to `https://chromewebstore.google.com/detail/tab-commander/bkeacpglbifipmmkofcjkoligeampnmc`.

## Audio

`bed.wav` is original synthesis: a quiet 110 Hz / 165 Hz / 220 Hz pad and a short tone at each section change. No stock music and no voiceover. The delivered files were remuxed with `volume=+8dB` after that encode (mean about −20 dB, peak about −8 dB). Re-running the script writes the quieter bed; apply the same gain to match these files.

## Limits

The capture is about 38 kbps, so the screen is soft. The search field, close button, and mic are outside the recorded frame. Reddit’s public “Prove your humanity” tab is in the real list and is left in. No account, credential, permission dialog, or Teva screen is included.

## Render

```bash
python3 landing/video/render_demo.py
```

Needs `ffmpeg`, Pillow, NumPy, `qrcode`, and `fonttools`. Frames are cached in `/tmp/tc-src`.
