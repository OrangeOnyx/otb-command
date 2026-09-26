"""Score for film.html — "A Thousand Promises" (90 s, 120 BPM).

Arc: clock + e-piano question (A minor) → the pile builds into chaos → dead stop,
heartbeat → the snap releases into A major → night filter → interface melody →
manifesto → the mark slams together on four beats → the music strips back to the
opening clock → cut. Every cue is pinned to a timestamp in film.html.
Writes out/film-score.wav (44.1 kHz, 16-bit stereo).
"""
import wave
from pathlib import Path

import numpy as np

from synth import *  # noqa: F401,F403

DUR = 90.0
N = int(SR * DUR)
BEAT = 0.5
music = np.zeros((2, N))   # ducked by the kick
dry = np.zeros((2, N))     # drums, fx
chaos = np.zeros((2, N))   # everything in the pile — hard-gated at the freeze
verb = np.zeros((2, N))
cverb = np.zeros((2, N))   # chaos reverb send (gated too)
kicks = []

MINOR = [(57, 60, 64), (53, 57, 60), (48, 52, 55), (55, 59, 62)]
MINOR_B = [33, 29, 36, 31]
MAJOR = [(57, 61, 64, 69), (54, 57, 61, 66), (50, 54, 57, 62), (52, 56, 59, 64)]
MAJOR_B = [33, 30, 38, 40]


def kk(bus, t0, gain=0.95, big=False):
    put(bus, t0, kick(big), 0, gain)
    kicks.append(t0)


def groove(t0, t1, chords, basses, bus=music, drums=dry, clap_on=True, hats=True, bass_on=True, arp=True, kick_on=True, arp_gain=0.45):
    b = t0
    while b < t1 - 1e-6:
        beat = int(round(b / BEAT))
        bar = int(b // 2) % 4
        if kick_on:
            kk(drums, b)
        if clap_on and beat % 2 == 1:
            put(drums, b, clap(), 0.05, 0.75)
            put(verb if drums is dry else cverb, b, clap(), 0, 0.3)
        if hats:
            put(drums, b + BEAT / 2, hat(), 0.3, 0.7)
            put(drums, b + BEAT / 4, hat(), -0.3, 0.22)
            put(drums, b + 3 * BEAT / 4, hat(), -0.3, 0.22)
        if bass_on:
            put(bus, b + BEAT / 2, bass(basses[bar]), 0, 0.85)
            if beat % 4 == 3:
                put(bus, b + 3 * BEAT / 4, bass(basses[bar] + 12, 0.12), 0, 0.45)
        if arp:
            ch = chords[bar]
            for k in range(2):
                n = ch[(beat * 2 + k) % len(ch)] + 12
                pan = -0.4 if k else 0.4
                put(bus, b + k * BEAT / 2, pluck(n, 0.35), pan, arp_gain)
                put(verb, b + k * BEAT / 2, pluck(n, 0.35), pan, arp_gain * 0.5)
        b += BEAT


def pads(t0, t1, chords, bright=6, gain=0.8, bus=music):
    b = t0
    while b < t1 - 1e-6:
        ch = chords[int(b // 2) % 4]
        p = pad([n - 12 for n in ch] + list(ch), 2.3, bright=bright, attack=0.25, release=0.5)
        put(bus, b, p, 0, gain)
        put(verb, b, p, 0, gain * 0.6)
        b += 2.0


# ── 0–8 · the clock, the typing, the question ───────────────────────────
for k in range(16):
    put(dry, 0.5 + k * BEAT, clock(k % 2 == 1), 0.15 if k % 2 else -0.15, 1.2 if k < 12 else 1.2 - (k - 11) * 0.22)
drone = pad([33, 45], 8.5, bright=3, attack=3.0, release=1.0)
put(music, 0.0, drone, 0, 0.9)
for i in range(len('Every property runs on')):
    put(dry, 1.0 + i / 16, keyclick(), 0.2, 0.9)
for i in range(len('a thousand small promises.')):
    put(dry, 3.05 + i / 14, keyclick(), 0.2, 0.9)
for k, n in enumerate((69, 72, 76, 74)):  # the question motif, minor
    t0 = 4.26 + k * 0.215
    put(music, t0, epiano(n, 2.4), -0.2 + k * 0.13, 0.9)
    put(verb, t0, epiano(n, 2.4), 0, 0.7)
R = np.random.default_rng(11)
for k in range(18):  # letters tumble: glass
    put(chaos, 5.9 + k * 0.1 + R.random() * 0.05, bell(note(84 + int(R.integers(0, 12))), 1.0), R.random() * 2 - 1, 0.12)
put(chaos, 6.0, whoosh(2.0, 200, 5000), 0, 0.5)

# ── 8–26 · the pile ─────────────────────────────────────────────────────
for b in np.arange(8.0, 12.0, 1.0):
    kk(chaos, b, 0.8)
b = 8.0
while b < 26.0 - 1e-6:  # 16th ostinato, brightening
    k = int(round((b - 8) / 0.125))
    ch = MINOR[int(b // 2) % 4]
    n = (ch + (ch[0] + 12,))[k % 4] + 12
    put(chaos, b, pluck(n, 0.18, 0.6 + 1.4 * (b - 8) / 18), 0.35 if k % 2 else -0.35, 0.22 + 0.12 * (b - 8) / 18)
    b += 0.125
groove(12.0, 26.0, MINOR, MINOR_B, bus=chaos, drums=chaos, arp=False)
for t0 in (10, 12, 14, 16):
    for n in MINOR[(t0 // 2) % 4]:
        put(chaos, t0, pluck(n, 1.4, 1.5), 0, 0.3)
        put(cverb, t0, pluck(n, 1.4), 0, 0.35)
    put(chaos, t0 - 0.3, whoosh(0.3, 600, 6000), 0, 0.35)
for k in range(8):
    t0 = 18 + k * 0.5
    for n in MINOR[k % 4]:
        put(chaos, t0, pluck(n + 12, 0.4, 1.8), 0, 0.26)
Rp = np.random.default_rng(5)
t0 = 8.5
while t0 < 26.0:  # notification pings, density rising
    rate = 0.8 + 16 * ((t0 - 8.5) / 17.5) ** 2
    put(chaos, t0, bell(note(int(Rp.choice([88, 93, 96, 98, 100]))), 0.5), Rp.random() * 1.6 - 0.8, 0.07)
    t0 += Rp.exponential(1 / rate)
b = 22.0
while b < 26.0 - 1e-6:  # flash words: glitch hits + snare 16ths
    put(chaos, b, band(np.random.default_rng(int(b * 100)).standard_normal(int(0.05 * SR)), 300, 9000) * np.exp(-tt(0.05) * 60), 0, 0.35)
    put(chaos, b, blip(84 + int((b - 22) * 4) % 12, 0.06), 0.3, 0.9)
    put(chaos, b, clap(), 0, 0.25 + 0.35 * (b - 22) / 4)
    b += 0.25
put(chaos, 22.0, riser(4.0, 150, 2200), 0, 0.9)
clus = pad([57, 58, 60, 61, 63, 64], 4.0, bright=8, attack=3.5, release=0.1)
put(chaos, 22.0, clus, 0, 0.7)

# ── 26–28 · freeze · heartbeat · the question ──────────────────────────
put(dry, 26.5, heartbeat(), 0, 0.9)
put(dry, 26.72, heartbeat(), 0, 0.6)
for i in range(len('What if every promise had a place?')):
    put(dry, 26.35 + i / 30, keyclick(), 0, 0.7)
snap_chord = sum(pad(list(MAJOR[0]) + [45, 76], 3.0, bright=8, attack=0.01, release=1.5)[: int(3 * SR)] for _ in range(1))
rev = snap_chord[::-1][-int(0.8 * SR):] * np.linspace(0, 1, int(0.8 * SR)) ** 2
put(music, 27.2, rev, 0, 0.8)

# ── 28–44 · the snap → the place (A major) ─────────────────────────────
put(dry, 28.0, impact(), 0, 1.0); put(verb, 28.0, impact(), 0, 0.4)
kk(dry, 28.0, 0.9, big=True)
put(music, 28.0, snap_chord, 0, 0.9); put(verb, 28.0, snap_chord, 0, 0.8)
put(dry, 28.0, whoosh(0.4, 8000, 300, rise=False), 0, 0.6)
Rs = np.random.default_rng(9)
for k in range(144):  # the wall locks: a mechanical cascade
    t0 = 28.18 + (Rs.random() ** 1.6) * 0.62
    put(dry, t0, tick(1400 + Rs.random() * 2600, 0.09), Rs.random() * 1.6 - 0.8)
for r in range(9):  # cards land in their suites
    for c in range(16):
        t0 = 30.5 + r * 0.08 + c * 0.03 + 0.7
        put(dry, t0, tick(2200 + ((r * 16 + c) % 27) * 60, 0.05), (c / 7.5) - 1)
groove(29.0, 44.0, MAJOR, MAJOR_B, clap_on=True)
pads(29.0, 44.0, MAJOR, bright=6, gain=0.55)
for bld, t0 in ((0, 33.4), (1, 33.7)):
    put(music, t0, whoosh(0.8, 120, 900), 0, 0.5)
evR = Mulberry(77)
for k in range(22):  # pins pop (question) and resolve (answer)
    et = 35 + k * 0.34 + evR() * 0.2
    evR(); evR()
    put(music, et, pluck(76, 0.4, 1.5), 0.3, 0.3)
    put(music, et + 0.8, pluck(81, 0.5, 1.8), -0.3, 0.3)
    put(verb, et + 0.8, pluck(81, 0.5), 0, 0.3)
put(dry, 43.4, riser(2.2, 180, 2600), 0, 1.0)
put(dry, 45.6, impact(), 0, 0.6)

# ── 45.6–64 · the app · carousel melody · concierge · implosion ────────
put(music, 45.6, bell(note(81), 2.0), 0, 0.35); put(verb, 45.6, bell(note(81), 2.0), 0, 0.5)
for k in range(13):
    put(dry, 46.0 + k * 0.04, tick(1800 + k * 120, 0.12), -0.6 + k * 0.1)
groove(46.5, 54.0, MAJOR, MAJOR_B, clap_on=True, arp=False)
pads(46.0, 54.0, MAJOR, bright=5, gain=0.45)
melody = [69, 73, 76, 81, 80, 76, 78, 76, 73, 71, 76]
for k, n in enumerate(melody):
    t0 = 46.5 + k * 0.5
    put(music, t0, epiano(n, 0.9, 1.4), 0, 0.75)
    put(verb, t0, epiano(n, 0.9), 0, 0.5)
    put(dry, t0, whoosh(0.3, 3000, 600, rise=False), 0.4 if k % 2 else -0.4, 0.15)
put(dry, 52.0, whoosh(1.6, 300, 7000), 0, 0.7)
for k in range(24):
    put(music, 52.0 + k * 1.6 / 24, pluck(MAJOR[k // 6 % 4][k % 3] + 12 + 12 * (k // 12), 0.2, 1.8), (k % 2) * 0.6 - 0.3, 0.3)
put(dry, 53.6, impact(), 0, 0.55); put(music, 53.6, bell(note(88), 1.5), 0, 0.3)
pads(54.0, 60.0, MAJOR, bright=4, gain=0.5)
for b in np.arange(54.0, 59.0, 0.5):
    put(dry, b + 0.25, hat(), 0.3, 0.45)
for i in range(len('What needs my attention this week?')):
    put(dry, 54.5 + i / 30, keyclick(), 0.3, 0.9)
for n in (61, 64, 69):
    put(music, 56.0, epiano(n + 12, 2.0), 0, 0.45)
for k, n in enumerate((73, 76, 81)):
    put(music, 56.5 + k * 0.5, pluck(n, 0.5, 1.4), 0.4, 0.4)
    put(dry, 56.5 + k * 0.5, whoosh(0.35, 4000, 800, rise=False), 0.5, 0.2)
for k, ct in enumerate((58.0, 58.4, 58.8)):
    put(dry, ct, tick(900, 0.3), 0.5); put(dry, ct + 0.01, tick(2600, 0.2), 0.5)
    put(music, ct + 0.02, bell(note(81 + [0, 4, 7][k]), 0.8), 0.4, 0.2)
b = 59.0
while b < 60.0:
    put(dry, b, clap(), 0, 0.2 + 0.4 * (b - 59))
    b += 0.125
put(dry, 59.0, riser(1.0, 300, 2000), 0, 0.6)
suck = whoosh(0.9, 200, 8000)[::-1]
put(dry, 60.0, suck, 0, 0.8)
put(dry, 60.9, heartbeat(), 0, 0.9)
for k, b in enumerate((62.0, 62.5, 63.0, 63.5)):
    put(dry, b, blip(81 + k * 2, 0.12), 0, 1.0); put(dry, b, pop(), 0, 0.5)
    kk(dry, b, 0.5)
put(dry, 62.0, riser(2.0, 200, 3000), 0, 0.9)
put(dry, 63.6, whoosh(0.4, 400, 9000), 0, 0.6)

# ── 64–80 · manifesto ──────────────────────────────────────────────────
put(dry, 64.0, impact(), 0, 0.8)
groove(64.0, 76.0, MAJOR, MAJOR_B, arp=True, arp_gain=0.4)
pads(64.0, 76.0, MAJOR, bright=7, gain=0.5)
for k in range(6):
    T0 = 64 + 2 * k
    if k:
        put(dry, T0 - 0.02, whoosh(0.45, 500, 8000), 0, 0.4)
    for n in MAJOR[k % 4]:
        put(music, T0, pluck(n + 12, 0.9, 1.6), 0, 0.3)
        put(verb, T0, pluck(n + 12, 0.9), 0, 0.3)
    put(dry, T0 + 0.6, pop(), 0.2, 0.9)
put(dry, 76.0, whoosh(0.45, 8000, 300, rise=False), 0, 0.4)
for i in range(7):  # one word per beat; the chord climbs
    t0 = 76 + i * 0.5
    kk(dry, t0, 0.9, big=i == 6)
    for n in MAJOR[0]:
        put(music, t0, pluck(n + i, 0.45, 1.8), 0, 0.28)
    put(verb, t0, pluck(69 + i, 0.45), 0, 0.3)
put(dry, 79.5, pop(), 0, 1.0); put(dry, 79.5, tick(3000, 0.3), 0, 1)
put(dry, 79.6, whoosh(0.4, 500, 9000), 0, 0.4)

# ── 80–90 · the mark · the clock returns · cut ─────────────────────────
put(dry, 80.45, heartbeat(), 0, 0.7)
for k, tl in enumerate((80.5, 81.0, 81.5, 82.0)):
    put(dry, tl - 0.3, whoosh(0.3, 600, 6000), [0, 0, -0.5, 0.5][k], 0.35)
    put(dry, tl, metal(1.0 + k * 0.12), [0, 0, -0.4, 0.4][k], 0.9)
    kk(dry, tl, 0.85, big=True)
    put(verb, tl, metal(1.0 + k * 0.12), 0, 0.4)
for i in range(14):
    put(dry, 82.5 + (i // 7) * 0.22 + (i % 7) * 0.028, tick(2600 + i * 90, 0.12), -0.4 + i * 0.06)
final = pad([45, 57, 61, 64, 68, 71, 76], 4.5, bright=9, attack=0.01, release=1.0)
put(dry, 83.0, impact(), 0, 1.0); put(verb, 83.0, impact(), 0, 0.4)
put(music, 83.0, final, 0, 0.9); put(verb, 83.0, final, 0, 0.9)
for k, n in enumerate((69, 73, 76, 81)):  # the answer motif, major
    put(music, 83.0 + k * 0.12, epiano(n + 12, 2.5), -0.3 + k * 0.2, 0.55)
    put(verb, 83.0 + k * 0.12, epiano(n + 12, 2.5), 0, 0.5)
put(music, 83.35, bell(note(88), 2.5), 0.2, 0.2)
for k, b in enumerate((85.5, 86.0, 86.5)):  # the clock comes back
    put(dry, b, clock(k % 2 == 1), 0, 0.9)
for b, n in ((87.0, 69), (87.5, 76)):  # the core blinks like the first cursor
    put(dry, b, clock(False), 0, 0.7)
    put(dry, b, epiano(n, 1.2), 0, 0.35)
put(dry, 88.0, clock(True), 0, 1.0)
tail = impact()
put(dry, 88.0, tail * np.linspace(1, 0, len(tail)) ** 2, 0, 0.5)

# ── mix ─────────────────────────────────────────────────────────────────
t_all = np.arange(N) / SR
duck = np.ones(N)
for kt in kicks:
    i = int(kt * SR)
    seg = t_all[i : i + int(0.4 * SR)] - kt
    duck[i : i + len(seg)] = np.minimum(duck[i : i + len(seg)], 1 - 0.55 * np.exp(-seg * 11))
music *= duck

# night: the whole music bed closes to a low-pass and reopens for the dive
a, b = int(37.0 * SR), int(45.6 * SR)
fc = lambda s: float(np.interp(s, [0, 2.0, 4.5, 6.4, 8.6], [16000, 5000, 650, 900, 16000]))
music[:, a:b] = np.stack([lp_sweep(music[c, a:b], fc) for c in range(2)])
# the end: the final chord drains away to leave only the clock
a, b = int(84.6 * SR), int(88.0 * SR)
fc2 = lambda s: float(np.interp(s, [0, 1.6, 3.4], [16000, 500, 60]))
music[:, a:b] = np.stack([lp_sweep(music[c, a:b], fc2) for c in range(2)]) * np.linspace(1, 0.15, b - a)
music[:, b:] = 0

ir_t = np.arange(int(2.8 * SR)) / SR
ir = np.stack([band(rng.standard_normal(len(ir_t)), 200, 7000) * np.exp(-ir_t * 2.4) for _ in range(2)])
ir[:, : int(0.015 * SR)] = 0
L = 1 << int(np.ceil(np.log2(N + len(ir_t))))


def convolve(x):
    w = np.stack([np.fft.irfft(np.fft.rfft(x[c], L) * np.fft.rfft(ir[c], L), L)[:N] for c in range(2)])
    return w / (np.max(np.abs(w)) + 1e-9) * np.max(np.abs(x)) * 2.2


wet = convolve(verb)
cwet = convolve(cverb)
gate = (t_all < 26.0).astype(float)
gate[int(26.0 * SR) - 200 : int(26.0 * SR)] = np.linspace(1, 0, 200)
wet[:, int(84.6 * SR):] *= np.linspace(1, 0, N - int(84.6 * SR)) ** 3
mix = dry + music + (chaos + cwet * 0.35) * gate + wet * 0.35
mix = np.tanh(mix * 0.9)
mix /= np.max(np.abs(mix)) / 0.89

out = Path(__file__).with_name('out')
out.mkdir(exist_ok=True)
pcm = (mix.T * 32767).astype('<i2')
with wave.open(str(out / 'film-score.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('wrote', out / 'film-score.wav', f'{DUR:.0f}s')
