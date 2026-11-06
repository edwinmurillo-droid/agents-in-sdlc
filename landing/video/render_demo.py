#!/usr/bin/env python3
"""Render the Tab Commander demo in the landing-page design.

Uses only the raw 1280x800 screen recording. Title cards and captions are
drawn. The dashboard picture on the marketing site is not used as footage.
"""
from __future__ import annotations

import math
import struct
import subprocess
import sys
import wave
from functools import lru_cache
from pathlib import Path

import numpy as np
import qrcode
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
LANDING = ROOT.parent
RAW_CANDIDATES = [
    ROOT / "originals" / "raw.mp4",
    Path("/home/ubuntu/.cursor/projects/workspace/uploads/raw_e7a4.mp4"),
]
FRAME_DIR = Path("/tmp/tc-src")
FONT_DIR = ROOT / "fonts"
FPS = 30
DUR = 45.0
URL = "https://chromewebstore.google.com/detail/tab-commander/bkeacpglbifipmmkofcjkoligeampnmc"
SRC_FPS = 15

BG = (16, 18, 24)
CREAM = (244, 241, 234)
MUTED = (201, 198, 189)
AMBER = (231, 195, 106)
BLUE = (158, 182, 255)
INK = (22, 24, 30)
BUTTON = (243, 239, 230)

# Output time ranges. Source times are seconds in raw.mp4.
SCENES = [
    (0.0, 5.0, "open"),
    (5.0, 12.6, "dashboard"),
    (12.6, 19.4, "filter"),
    (19.4, 25.8, "jump"),
    (25.8, 34.4, "close"),
    (34.4, 45.0, "end"),
]


def ensure_frames() -> None:
    if (FRAME_DIR / "f04743.jpg").exists():
        return
    raw = next((p for p in RAW_CANDIDATES if p.exists()), None)
    if raw is None:
        raise SystemExit("raw recording not found")
    FRAME_DIR.mkdir(parents=True, exist_ok=True)
    subprocess.check_call(
        ["ffmpeg", "-y", "-v", "error", "-i", str(raw), "-q:v", "4", str(FRAME_DIR / "f%05d.jpg")]
    )


def static_font(src: Path, dest: Path, axes: dict) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        return
    font = TTFont(src)
    instantiateVariableFont(font, axes, inplace=True, updateFontNames=False)
    font.flavor = None
    font.save(dest)


def prepare_fonts() -> dict[str, Path]:
    static_font(LANDING / "fonts" / "fraunces-latin.woff2", FONT_DIR / "fraunces-560.ttf", {"wght": 560, "opsz": 72})
    static_font(LANDING / "fonts" / "fraunces-latin.woff2", FONT_DIR / "fraunces-640.ttf", {"wght": 640, "opsz": 96})
    static_font(LANDING / "fonts" / "outfit-latin.woff2", FONT_DIR / "outfit-400.ttf", {"wght": 400})
    static_font(LANDING / "fonts" / "outfit-latin.woff2", FONT_DIR / "outfit-560.ttf", {"wght": 560})
    static_font(LANDING / "fonts" / "outfit-latin.woff2", FONT_DIR / "outfit-600.ttf", {"wght": 600})
    mono = Path("/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-Medium.ttf")
    if not mono.exists():
        mono = Path("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf")
    return {
        "display": FONT_DIR / "fraunces-640.ttf",
        "display-soft": FONT_DIR / "fraunces-560.ttf",
        "body": FONT_DIR / "outfit-400.ttf",
        "medium": FONT_DIR / "outfit-560.ttf",
        "strong": FONT_DIR / "outfit-600.ttf",
        "mono": mono,
    }


@lru_cache(maxsize=64)
def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def smooth(x: float) -> float:
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def make_bg(w: int, h: int) -> Image.Image:
    y, x = np.mgrid[0:h, 0:w]
    glow = np.exp(-(((x - w * 0.86) / (w * 0.55)) ** 2 + ((y - h * 0.08) / (h * 0.5)) ** 2) * 2.4)
    img = np.zeros((h, w, 3), dtype=np.uint8)
    img[:, :] = BG
    img[:, :, 2] = np.clip(img[:, :, 2] + glow * 28, 0, 255)
    img[:, :, 0] = np.clip(img[:, :, 0] + glow * 10, 0, 255)
    img[:, :, 1] = np.clip(img[:, :, 1] + glow * 14, 0, 255)
    return Image.fromarray(img, "RGB")


def logo(size: int) -> Image.Image:
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, size - 1, size - 1), radius=int(size * 0.22), fill=INK)
    m = size * 0.18
    d.rounded_rectangle((m, m, size - m, size - m), radius=int(size * 0.1), outline=CREAM, width=max(2, size // 18))
    d.line((m, size * 0.40, size - m, size * 0.40), fill=CREAM, width=max(2, size // 18))
    d.rounded_rectangle((size * 0.28, size * 0.50, size * 0.46, size * 0.72), radius=2, fill=BLUE)
    d.rounded_rectangle((size * 0.54, size * 0.50, size * 0.72, size * 0.72), radius=2, fill=(44, 51, 68))
    return im


def make_qr() -> Image.Image:
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=12, border=2)
    qr.add_data(URL)
    qr.make(fit=True)
    im = qr.make_image(fill_color="#16181e", back_color="#f4f1ea").convert("RGB")
    out = ROOT / "qr.png"
    im.save(out)
    return im


def src_index(t: float) -> int:
    n = int(round(t * SRC_FPS)) + 1
    return max(1, min(4743, n))


class Film:
    def __init__(self, w: int, h: int, fonts: dict[str, Path], qr_im: Image.Image):
        self.w = w
        self.h = h
        self.sq = w == h
        self.fonts = {k: str(v) for k, v in fonts.items()}
        self.bg = make_bg(w, h)
        self.mark = logo(64 if self.sq else 56)
        self.qr = qr_im
        if self.sq:
            self.panel = (48, 168, 984, 616)  # x, y, w, h  984/616 = 1.597, source is 1.6
        else:
            self.panel = (300, 132, 1320, 825)
        self.cache: dict[int, Image.Image] = {}

    def fnt(self, kind: str, size: int) -> ImageFont.FreeTypeFont:
        return font(self.fonts[kind], size)

    def text(self, draw: ImageDraw.ImageDraw, xy, s, kind, size, fill, anchor=None):
        draw.text(xy, s, font=self.fnt(kind, size), fill=fill, anchor=anchor)

    def shot(self, t: float) -> Image.Image:
        n = src_index(t)
        if n not in self.cache:
            im = Image.open(FRAME_DIR / f"f{n:05d}.jpg").convert("RGB")
            x, y, w, h = self.panel
            im = im.resize((w, h), Image.Resampling.LANCZOS)
            self.cache[n] = im
        return self.cache[n]

    def place_shot(self, canvas: Image.Image, t: float):
        x, y, w, h = self.panel
        shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        ImageDraw.Draw(shadow).rounded_rectangle((x - 10, y + 16, x + w + 10, y + h + 22), radius=28, fill=(0, 0, 0, 120))
        canvas.alpha_composite(shadow)
        frame = self.shot(t).convert("RGBA")
        mask = Image.new("L", (w, h), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, w - 1, h - 1), radius=18, fill=255)
        canvas.paste(frame, (x, y), mask)
        d = ImageDraw.Draw(canvas)
        d.rounded_rectangle((x, y, x + w, y + h), radius=18, outline=(243, 239, 230, 40), width=2)

    def kicker(self, canvas: Image.Image, label: str):
        d = ImageDraw.Draw(canvas)
        size = 18 if self.sq else 20
        if self.sq:
            self.text(d, (self.w // 2, 78), label, "mono", size, AMBER, "mt")
        else:
            self.text(d, (self.panel[0], 68), label, "mono", size, AMBER, "lt")

    def pill(self, canvas: Image.Image, label: str):
        d_layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(d_layer)
        size = 30 if self.sq else 34
        f = self.fnt("medium", size)
        tw = f.getlength(label)
        pad_x, pad_y = 28, 16
        bw, bh = int(tw + pad_x * 2), size + pad_y * 2
        x = (self.w - bw) // 2
        y = self.panel[1] + self.panel[3] + (22 if self.sq else 28)
        d.rounded_rectangle((x, y, x + bw, y + bh), radius=bh // 2, fill=BUTTON + (255,))
        self.text(d, (self.w // 2, y + pad_y - 2), label, "medium", size, INK, "mt")
        canvas.alpha_composite(d_layer)

    def progress(self, canvas: Image.Image, t: float):
        d = ImageDraw.Draw(canvas)
        d.rectangle((0, self.h - 4, int(self.w * t / DUR), self.h), fill=AMBER)

    def open_card(self, t: float) -> Image.Image:
        im = self.bg.copy().convert("RGBA")
        d = ImageDraw.Draw(im)
        im.alpha_composite(self.mark, (72 if not self.sq else 64, 64 if not self.sq else 72))
        name_x = (72 if not self.sq else 64) + 76
        self.text(d, (name_x, 78 if not self.sq else 86), "Tab Commander", "strong", 28 if not self.sq else 30, CREAM, "lm")
        if self.sq:
            self.text(d, (64, 210), "CHROME EXTENSION  ·  V1.0.0", "mono", 18, AMBER)
            self.text(d, (64, 270), "Every open tab.", "display", 78, CREAM)
            self.text(d, (64, 360), "One live dashboard.", "display", 78, CREAM)
            self.text(d, (64, 490), "Search by title or URL. Close a selection.", "body", 32, MUTED)
            self.text(d, (64, 538), "Across every window.", "body", 32, MUTED)
        else:
            self.text(d, (150, 250), "CHROME EXTENSION  ·  V1.0.0", "mono", 20, AMBER)
            self.text(d, (146, 300), "Every open tab.", "display", 104, CREAM)
            self.text(d, (146, 420), "One live dashboard.", "display", 104, CREAM)
            self.text(d, (150, 570), "Search by title or URL. Close a selection.", "body", 36, MUTED)
            self.text(d, (150, 622), "Across every window.", "body", 36, MUTED)
        self.progress(im, t)
        return im

    def end_card(self, t: float) -> Image.Image:
        im = self.bg.copy().convert("RGBA")
        d = ImageDraw.Draw(im)
        if self.sq:
            im.alpha_composite(self.mark, ((self.w - 64) // 2, 48))
            self.text(d, (self.w // 2, 140), "Tab Commander", "display", 64, CREAM, "mt")
            self.text(d, (self.w // 2, 220), "Free on the Chrome Web Store", "body", 28, MUTED, "mt")
            self.text(d, (self.w // 2, 262), "Also runs in Microsoft Edge", "body", 26, MUTED, "mt")
            bw, bh = 360, 64
            x, y = (self.w - bw) // 2, 310
            d.rounded_rectangle((x, y, x + bw, y + bh), radius=bh // 2, fill=BUTTON)
            self.text(d, (self.w // 2, y + 14), "Add to Chrome", "strong", 28, INK, "mt")
            qs = 300
            qr = self.qr.resize((qs, qs), Image.Resampling.NEAREST)
            im.alpha_composite(qr.convert("RGBA"), ((self.w - qs) // 2, 400))
            self.text(d, (self.w // 2, 720), "chromewebstore.google.com/detail/tab-commander/", "medium", 20, CREAM, "mt")
            self.text(d, (self.w // 2, 752), "bkeacpglbifipmmkofcjkoligeampnmc", "medium", 20, BLUE, "mt")
            self.text(d, (self.w // 2, 820), "No Tab Commander server.", "body", 24, MUTED, "mt")
            self.text(d, (self.w // 2, 854), "The list stays on this device.", "body", 24, MUTED, "mt")
        else:
            im.alpha_composite(self.mark, (150, 150))
            self.text(d, (230, 164), "Tab Commander", "strong", 28, CREAM, "lm")
            self.text(d, (150, 250), "Tab Commander", "display", 84, CREAM)
            self.text(d, (154, 360), "Free on the Chrome Web Store", "body", 32, MUTED)
            self.text(d, (154, 408), "Also runs in Microsoft Edge", "body", 30, MUTED)
            d.rounded_rectangle((154, 480, 520, 552), radius=36, fill=BUTTON)
            self.text(d, (337, 498), "Add to Chrome", "strong", 30, INK, "mt")
            self.text(d, (154, 590), "No Tab Commander server.", "body", 26, MUTED)
            self.text(d, (154, 630), "The list stays on this device.", "body", 26, MUTED)
            self.text(d, (154, 720), "chromewebstore.google.com/detail/tab-commander/", "medium", 22, CREAM)
            self.text(d, (154, 756), "bkeacpglbifipmmkofcjkoligeampnmc", "medium", 22, BLUE)
            qs = 360
            qr = self.qr.resize((qs, qs), Image.Resampling.NEAREST)
            im.alpha_composite(qr.convert("RGBA"), (1380, 300))
            self.text(d, (1560, 680), "Scan to install", "mono", 18, AMBER, "mt")
        self.progress(im, t)
        return im

    def demo(self, t: float, kind: str) -> Image.Image:
        im = self.bg.copy().convert("RGBA")
        if kind == "dashboard":
            u = (t - 5.0) / (12.6 - 5.0)
            src_t = 209.2 + u * 3.6
            label, cap = "THE DASHBOARD", "Eight tabs, across two windows."
        elif kind == "filter":
            u = (t - 12.6) / (19.4 - 12.6)
            src_t = 214.3 + min(0.92, u) * 2.4
            label, cap = "THE FILTER", "The list, filtered to wiki."
        elif kind == "jump":
            u = (t - 19.4) / (25.8 - 19.4)
            src_t = 221.3 + u * 1.6
            label, cap = "THE JUMP", "That tab, brought forward."
        else:
            u = (t - 25.8) / (34.4 - 25.8)
            if u < 0.58:
                src_t = 268.4 + (u / 0.58) * 3.4
                cap = "Weather and Example Domain, selected."
            else:
                src_t = 274.6 + ((u - 0.58) / 0.42) * 1.8
                cap = "Eight open tabs become six."
            label = "THE CLOSE"
        self.kicker(im, label)
        self.place_shot(im, src_t)
        self.pill(im, cap)
        self.progress(im, t)
        return im

    def scene(self, t: float) -> Image.Image:
        for a, b, kind in SCENES:
            if a <= t < b:
                if kind == "open":
                    return self.open_card(t)
                if kind == "end":
                    return self.end_card(t)
                return self.demo(t, kind)
        return self.end_card(DUR - 0.001)

    def frame(self, t: float) -> Image.Image:
        im = self.scene(t)
        for i, (a, b, kind) in enumerate(SCENES):
            if a <= t < b and i > 0 and t - a < 0.40 and kind != "open":
                prev = self.scene(a - 0.02)
                im = Image.blend(prev, im, smooth((t - a) / 0.40))
                break
        return im.convert("RGB")


def write_audio(path: Path) -> None:
    sr = 48000
    n = int(DUR * sr)
    t = np.arange(n) / sr
    sig = (
        0.028 * np.sin(2 * np.pi * 110 * t)
        + 0.016 * np.sin(2 * np.pi * 164.81 * t)
        + 0.010 * np.sin(2 * np.pi * 220 * t)
    )
    sig *= 0.86 + 0.14 * np.sin(2 * np.pi * 0.07 * t)
    for start in (5.0, 12.6, 19.4, 25.8, 34.4):
        dt = t - start
        sig += np.where((dt >= 0) & (dt < 0.4), 0.035 * np.sin(2 * np.pi * 523.25 * dt) * np.exp(-7 * dt), 0)
    sig *= np.minimum(1, t / 1.5) * np.minimum(1, np.maximum(0, (DUR - t) / 2.0))
    sig = np.clip(sig, -0.45, 0.45)
    stereo = np.column_stack((sig, sig * 0.97))
    pcm = (stereo * 32767).astype(np.int16)
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "w") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())


def encode(film: Film, audio: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{film.w}x{film.h}", "-r", str(FPS), "-i", "pipe:0",
        "-i", str(audio),
        "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-ac", "2",
        "-movflags", "+faststart", "-shortest", str(dest),
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    total = int(DUR * FPS)
    assert proc.stdin is not None
    for i in range(total):
        proc.stdin.write(film.frame(i / FPS).tobytes())
        if i % 150 == 0:
            print(dest.name, f"{i / FPS:.1f}s", flush=True)
    proc.stdin.close()
    if proc.wait() != 0:
        raise SystemExit(f"ffmpeg failed for {dest}")


def main() -> None:
    ensure_frames()
    fonts = prepare_fonts()
    qr_im = make_qr()
    audio = ROOT / "bed.wav"
    write_audio(audio)
    if len(sys.argv) > 1 and sys.argv[1] == "preview":
        out = Path("/tmp/tc-preview")
        out.mkdir(exist_ok=True)
        for w, h in ((1920, 1080), (1080, 1080)):
            film = Film(w, h, fonts, qr_im)
            for t in (1.2, 8.0, 15.5, 22.5, 29.0, 32.5, 40.0):
                film.frame(t).save(out / f"{w}x{h}-{t:.1f}.jpg", quality=85)
                print("preview", w, t)
        return
    wide = Film(1920, 1080, fonts, qr_im)
    square = Film(1080, 1080, fonts, qr_im)
    encode(wide, audio, ROOT / "out" / "tab-commander-demo-1080p.mp4")
    wide.frame(1.2).save(ROOT / "out" / "poster.png")
    encode(square, audio, ROOT / "out" / "tab-commander-demo-square.mp4")
    print("done")


if __name__ == "__main__":
    main()
