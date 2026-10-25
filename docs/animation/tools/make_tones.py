"""Build tones_stft.json for the animation: the strongest tones of one spoken word, frame by frame.

Usage:  python3 make_tones.py RECORDING START_SECONDS [OUT.json]
  RECORDING      any file macOS `afconvert` can read (m4a, wav, ...)
  START_SECONDS  where the 1-second clip starts in the recording

Output: {"sr":16000,"win":320,"hop":160,"k":5,"frames":[[[f_Hz, amplitude, phase], ...], ...]}
  99 frames (Hann window of 320 samples, hop 160, no padding at the ends), up to k tones each.
  A tone's amplitude is that of a cosine (the window's gain removed), its phase is at the frame's start,
  so a frame is rebuilt as  sum a * cos(2*pi*f*(t - t_frame) + phase).
"""
import json
import os
import subprocess
import sys
import tempfile
import wave

import numpy as np

SR, WIN, HOP, K = 16000, 320, 160, 5
NFFT = 4096          # zero padding: finer frequency steps for the peak search
FMIN, FMAX = 60, 4000  # tones outside this band are skipped (above 4 kHz they flicker once slowed down)


def load(path):
    """Decode to 16 kHz mono with afconvert and return float samples in -1..1."""
    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, "clip.wav")
        subprocess.run(["afconvert", "-f", "WAVE", "-d", f"LEI16@{SR}", "-c", "1", path, wav], check=True)
        with wave.open(wav) as w:
            return np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(float) / 32768


def tones(frame, hann):
    """The K strongest spectral peaks of one frame: [frequency, amplitude, phase]."""
    X = np.fft.rfft(frame * hann, NFFT)
    mag = np.abs(X)
    freqs = np.fft.rfftfreq(NFFT, 1 / SR)
    lo, hi = np.searchsorted(freqs, FMIN), np.searchsorted(freqs, FMAX)
    peaks = [i for i in range(max(lo, 1), min(hi, len(mag) - 1)) if mag[i] > mag[i - 1] and mag[i] >= mag[i + 1]]
    peaks.sort(key=lambda i: -mag[i])
    out = []
    for i in peaks[:K]:
        a, b, c = np.log(mag[i - 1] + 1e-12), np.log(mag[i] + 1e-12), np.log(mag[i + 1] + 1e-12)
        d = 0.5 * (a - c) / (a - 2 * b + c) if a - 2 * b + c else 0.0  # parabolic interpolation of the peak
        f = (i + d) * SR / NFFT
        amp = 2 * mag[i] / hann.sum()                                 # a cosine's amplitude
        out.append([round(float(f), 1), float(f"{amp:.5g}"), round(float(np.angle(X[i])), 3)])
    return out


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    src, start = sys.argv[1], float(sys.argv[2])
    dst = sys.argv[3] if len(sys.argv) > 3 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "tones_stft.json")
    x = load(src)
    a = int(start * SR)
    clip = x[a:a + SR]
    if len(clip) < SR:
        sys.exit("the recording ends before the 1-second clip does")
    hann = 0.5 - 0.5 * np.cos(2 * np.pi * np.arange(WIN) / WIN)  # periodic Hann: overlapping windows sum to 1
    frames = [tones(clip[j * HOP:j * HOP + WIN], hann) for j in range(1 + (SR - WIN) // HOP)]
    with open(dst, "w") as f:
        json.dump({"sr": SR, "win": WIN, "hop": HOP, "k": K, "frames": frames}, f, separators=(",", ":"))
    print(f"{len(frames)} frames -> {dst}")


if __name__ == "__main__":
    main()
