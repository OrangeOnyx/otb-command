"""Shared instruments for the reel scores (numpy synthesis, 44.1 kHz)."""
import numpy as np

SR = 44100
rng = np.random.default_rng(7)
def note(n):  # MIDI → Hz
    return 440.0 * 2 ** ((n - 69) / 12)


def tt(dur):
    return np.arange(int(dur * SR)) / SR


def put(bus, t0, sig, pan=0.0, gain=1.0):
    N = bus.shape[1]
    i = int(t0 * SR)
    if i >= N or i < 0:
        return
    sig = sig[: N - i] * gain
    lg, rg = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    bus[0, i : i + len(sig)] += sig * lg * 1.414
    bus[1, i : i + len(sig)] += sig * rg * 1.414


def band(sig, lo, hi):
    spec = np.fft.rfft(sig)
    f = np.fft.rfftfreq(len(sig), 1 / SR)
    m = 1 / (1 + (lo / np.maximum(f, 1)) ** 4) / (1 + (f / hi) ** 4)
    return np.fft.irfft(spec * m, len(sig))


def sweep_filter(sig, fc_of_t, q=2.0):
    """Time-varying band-pass via STFT (fc_of_t: seconds → centre Hz)."""
    n, hop = 2048, 512
    win = np.hanning(n)
    pad = np.concatenate([np.zeros(n), sig, np.zeros(n)])
    out = np.zeros_like(pad)
    norm = np.zeros_like(pad)
    f = np.fft.rfftfreq(n, 1 / SR)
    for s in range(0, len(pad) - n, hop):
        fc = fc_of_t(max(0, s - n) / SR)
        m = np.exp(-0.5 * (np.log2(np.maximum(f, 1) / fc) * q) ** 2)
        out[s : s + n] += np.fft.irfft(np.fft.rfft(pad[s : s + n] * win) * m, n) * win
        norm[s : s + n] += win ** 2
    return (out / np.maximum(norm, 1e-3))[n : n + len(sig)]


# ── instruments ─────────────────────────────────────────────────────────
def kick(big=False):
    t = tt(0.9 if big else 0.45)
    f = 44 + (150 if big else 120) * np.exp(-t * (22 if big else 32))
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * (3.2 if big else 7.5)) * (1 - np.exp(-t * 3000))
    click = band(rng.standard_normal(len(t)), 1500, 8000) * np.exp(-t * 400) * 0.25
    return np.tanh((s + click) * 1.6) * 0.9


def impact():
    t = tt(3.5)
    f = 52 * np.exp(-t * 0.35) + 60 * np.exp(-t * 18)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.2)
    nz = band(rng.standard_normal(len(t)), 60, 1800) * np.exp(-t * 5) * 0.5
    return np.tanh((sub + nz) * 1.8) * 0.9


def clap():
    t = tt(0.3)
    env = sum(np.exp(-np.maximum(t - d, 0) * 90) * (t >= d) for d in (0, 0.011, 0.022))
    env += np.exp(-np.maximum(t - 0.03, 0) * 18) * (t >= 0.03) * 0.6
    return band(rng.standard_normal(len(t)), 900, 5200) * env * 0.5


def hat(open_=False):
    t = tt(0.25 if open_ else 0.06)
    return band(rng.standard_normal(len(t)), 7000, 16000) * np.exp(-t * (18 if open_ else 90)) * 0.35


def saw(freq, t, harm=14, roll=1.0, detune=0.0):
    s = np.zeros_like(t)
    for k in range(1, harm + 1):
        if freq * k > 15000:
            break
        s += np.sin(2 * np.pi * freq * k * (1 + detune) * t + k) / k ** roll
    return s


def bass(n, dur=0.22):
    t = tt(dur + 0.05)
    env = np.minimum(1, t * 400) * np.exp(-t * 7)
    f = note(n)
    s = saw(f, t, harm=10, roll=1.4) * 0.45 + np.sin(2 * np.pi * f * t) * 0.8
    return np.tanh(s * env * 1.4) * 0.55


def pluck(n, dur=0.6, bright=1.0):
    t = tt(dur)
    f = note(n)
    s = np.zeros_like(t)
    for k in range(1, 12):
        s += np.sin(2 * np.pi * f * k * t) / k ** 1.2 * np.exp(-t * (4 + k * 3.5 / bright))
    return s * np.minimum(1, t * 800) * 0.35


def bell(freq, dur=2.0):
    t = tt(dur)
    s = sum(a * np.sin(2 * np.pi * freq * r * t) * np.exp(-t * d) for r, a, d in ((1, 1, 2.2), (2.76, 0.45, 4), (5.4, 0.25, 7), (8.9, 0.1, 11)))
    return s * np.minimum(1, t * 600) * 0.3


def tick(freq=3200, amp=0.25):
    t = tt(0.025)
    return np.sin(2 * np.pi * freq * t) * np.exp(-t * 260) * amp


def keyclick():
    t = tt(0.02)
    return band(rng.standard_normal(len(t)), 2000, 7000) * np.exp(-t * 350) * 0.12


def pad(notes, dur, bright=6, attack=1.2, release=1.5):
    t = tt(dur)
    s = np.zeros_like(t)
    for n in notes:
        for dt in (-0.006, 0.0, 0.0065):
            s += saw(note(n), t, harm=bright, roll=1.3, detune=dt)
    env = np.minimum(1, t / attack) * np.minimum(1, np.maximum(0, (dur - t)) / release)
    return s * env * 0.05


def whoosh(dur, lo=300, hi=6000, rise=True):
    t = tt(dur)
    nz = rng.standard_normal(len(t))
    fc = (lambda x: lo * (hi / lo) ** min(1, x / dur)) if rise else (lambda x: hi * (lo / hi) ** min(1, x / dur))
    s = sweep_filter(nz, fc, q=1.5)
    env = (t / dur) ** 2 if rise else np.exp(-t * 4 / dur) * np.minimum(1, t * 60)
    return s * env * 0.45


def riser(dur, f0=200, f1=1600):
    t = tt(dur)
    f = f0 * (f1 / f0) ** (t / dur)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25 + whoosh(dur, 400, 9000) * 0.8
    return s * (t / dur) ** 1.6




# ── added for the film score ────────────────────────────────────────────
def epiano(n, dur=1.6, bright=1.0):
    """FM electric piano: carrier = modulator, decaying index, plus a tine."""
    t = tt(dur)
    f = note(n)
    idx = 2.6 * bright * np.exp(-t * 5) + 0.35
    s = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t))
    s += 0.18 * np.sin(2 * np.pi * f * 4.01 * t) * np.exp(-t * 14)
    return s * np.exp(-t * 1.6) * np.minimum(1, t * 900) * 0.32


def clock(tock=False):
    t = tt(0.06)
    click = band(rng.standard_normal(len(t)), 1500 if tock else 2400, 6500) * np.exp(-t * 320)
    body = np.sin(2 * np.pi * (1350 if tock else 1900) * t) * np.exp(-t * 140) * 0.5
    return (click + body) * 0.3


def heartbeat():
    t = tt(0.5)
    f = 38 + 50 * np.exp(-t * 25)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) * np.minimum(1, t * 400)
    return np.tanh(s * 2.2) * 0.8


def metal(pitch=1.0):
    t = tt(0.9)
    s = sum(a * np.sin(2 * np.pi * 420 * pitch * r * t + r) * np.exp(-t * d)
            for r, a, d in ((1, 1, 7), (2.32, .7, 9), (4.25, .5, 13), (6.63, .35, 18), (9.1, .2, 24)))
    click = band(rng.standard_normal(len(t)), 2000, 12000) * np.exp(-t * 180) * 1.2
    return (s * 0.3 + click) * 0.55


def pop():
    t = tt(0.09)
    f = 300 + 700 * np.exp(-t * 60)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 45) * 0.5


def blip(n, dur=0.08):
    t = tt(dur)
    return np.sign(np.sin(2 * np.pi * note(n) * t)) * np.exp(-t * 40) * 0.08


def lp_sweep(sig, fc_of_t):
    """Time-varying low-pass via STFT (fc_of_t: seconds from segment start → Hz)."""
    n, hop = 2048, 512
    win = np.hanning(n)
    pad = np.concatenate([np.zeros(n), sig, np.zeros(n)])
    out = np.zeros_like(pad)
    norm = np.zeros_like(pad)
    f = np.fft.rfftfreq(n, 1 / SR)
    for s in range(0, len(pad) - n, hop):
        fc = fc_of_t(max(0, s - n) / SR)
        m = 1 / (1 + (f / fc) ** 6)
        out[s : s + n] += np.fft.irfft(np.fft.rfft(pad[s : s + n] * win) * m, n) * win
        norm[s : s + n] += win ** 2
    return (out / np.maximum(norm, 1e-3))[n : n + len(sig)]


class Mulberry:
    """Port of the film's mulberry32 so audio cues land on the same random events."""
    def __init__(self, seed):
        self.s = seed & 0xFFFFFFFF

    def __call__(self):
        self.s = (self.s + 0x6D2B79F5) & 0xFFFFFFFF
        r = self.s
        r = ((r ^ (r >> 15)) * (1 | r)) & 0xFFFFFFFF
        r = (r + (((r ^ (r >> 7)) * (61 | r)) & 0xFFFFFFFF) ^ r) & 0xFFFFFFFF
        return ((r ^ (r >> 14)) & 0xFFFFFFFF) / 4294967296
