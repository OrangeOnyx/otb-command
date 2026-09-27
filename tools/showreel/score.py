"""Cypress Command motion reel — procedural score (48 s, 120 BPM, A minor).

Every cue below is pinned to a timestamp in reel.html, so hits land on cuts.
Pure numpy synthesis; writes out/score.wav (44.1 kHz, 16-bit stereo).
"""
import wave
from pathlib import Path

import numpy as np

from synth import *  # noqa: F401,F403 — instruments, SR, rng, put, band, …

DUR = 48.0
N = int(SR * DUR)
dry = np.zeros((2, N))
verb = np.zeros((2, N))  # reverb send
duckable = np.zeros((2, N))  # bus ducked by the kick


BEAT = 0.5
CHORDS = [(57, 60, 64, 71), (53, 57, 60, 67), (48, 52, 55, 62), (55, 59, 62, 69)]  # Am9 · Fmaj7 · Cadd9 · G6
BASSN = [33, 29, 36, 31]


def groove(t0, t1, kick_on=True, clap_on=True, bass_on=True, hats=True, arp=False):
    b = t0
    while b < t1 - 1e-6:
        beat = int(round((b - 0) / BEAT))
        bar = int(b // 2) % 4
        if kick_on:
            put(dry, b, kick(), 0, 0.95)
        if clap_on and beat % 2 == 1:
            put(dry, b, clap(), 0.05, 0.8)
            put(verb, b, clap(), 0, 0.35)
        if hats:
            put(dry, b + BEAT / 2, hat(), 0.3, 0.7)
            put(dry, b + BEAT / 4, hat(), -0.3, 0.25)
            put(dry, b + 3 * BEAT / 4, hat(), -0.3, 0.25)
        if bass_on:
            put(duckable, b + BEAT / 2, bass(BASSN[bar]), 0, 0.9)
            if beat % 4 == 3:
                put(duckable, b + 3 * BEAT / 4, bass(BASSN[bar] + 12, 0.12), 0, 0.5)
        if arp:
            ch = CHORDS[bar]
            for k in range(2):
                n = ch[(beat * 2 + k) % 4] + 12
                pan = -0.4 if k else 0.4
                put(duckable, b + k * BEAT / 2, pluck(n, 0.35), pan, 0.5)
                put(verb, b + k * BEAT / 2, pluck(n, 0.35), pan, 0.25)
        b += BEAT


# ── cue sheet (seconds match reel.html) ──────────────────────────────────
# S1 · survey (0–6)
put(verb, 0.0, pad([45, 57, 64, 71], 6.2, bright=5, attack=2.5, release=0.6), 0, 1.0)
put(dry, 0.0, pad([45, 57, 64, 71], 6.2, bright=5, attack=2.5, release=0.6), 0, 0.8)
put(dry, 0.35, bell(note(88)), 0.2, 0.6); put(verb, 0.35, bell(note(88)), 0, 0.6)
put(dry, 1.15, whoosh(0.55, 800, 5000, rise=False), -0.3, 0.6)
put(dry, 1.7, riser(2.0, 300, 900) * 0.4, 0, 0.8)
for k in range(8):
    put(dry, 1.0 + k * BEAT, tick(2600, 0.12), 0.5 if k % 2 else -0.5)
penta = [69, 72, 74, 76, 79, 81, 84]
for i in range(27):  # suites ink in → pentatonic run
    t0 = 2.5 + (0.75 + i / 27 * 0.5 if i >= 17 else i / 17 * 0.75)
    put(dry, t0, pluck(penta[i % 7] + (12 if i > 20 else 0), 0.4, 0.8), (i / 13.0) - 1, 0.35)
    put(verb, t0, pluck(penta[i % 7], 0.4), 0, 0.3)
for r in range(32):  # stall rows stamp
    put(dry, 3.5 + r * 0.045, tick(1800 + r * 40, 0.16), np.sin(r) * 0.6)
put(dry, 4.0, hat(True), 0, 0.5)
put(dry, 5.55, riser(0.45, 400, 3000), 0, 1.0)

# S2 · numbers (6–14)
put(dry, 6.0, impact(), 0, 0.9); put(verb, 6.0, impact(), 0, 0.3)
groove(6.0, 13.0, arp=False)
for k in range(40):  # odometer ratchet, decelerating
    t0 = 6.1 + 1.5 * (1 - (1 - k / 40) ** 0.5)
    put(dry, t0, tick(4200, 0.1), 0.2)
for i in range(4):
    t0 = 8 + i
    put(dry, t0 - 0.32, whoosh(0.34, 500, 7000), 0.6 if i % 2 == 0 else -0.6, 0.9)
    for n in CHORDS[i]:
        put(duckable, t0, pluck(n + 12, 0.9, 1.4), 0, 0.35)
        put(verb, t0, pluck(n + 12, 0.9), 0, 0.3)
put(dry, 11.75, whoosh(0.5, 200, 3000, rise=False), 0, 0.7)
for n in (57, 60, 64, 67, 72):
    put(dry, 12.3, pluck(n, 1.2, 1.6), 0, 0.4)
    put(verb, 12.3, pluck(n, 1.2), 0, 0.5)
b = 13.0
while b < 13.85:  # snare-style roll into the drop
    put(dry, b, clap(), 0, 0.3 + (b - 13) * 0.6)
    b += 0.125 if b < 13.5 else 0.0625
put(dry, 13.0, riser(0.9, 300, 2600), 0, 1.0)
put(dry, 13.1, whoosh(0.5, 3000, 150, rise=False), 0, 0.5)

# S3 · spatial (14–22)
put(dry, 14.0, impact(), 0, 1.0); put(verb, 14.0, impact(), 0, 0.35)
put(dry, 14.0, kick(True), 0, 0.8)
put(verb, 14.0, pad([45, 52, 57, 60, 64], 8.0, bright=8, attack=0.05, release=2.5), 0, 0.6)
put(duckable, 14.0, pad([45, 52, 57, 60, 64], 8.0, bright=8, attack=0.05, release=2.5), 0, 0.55)
groove(14.5, 21.5, arp=True)
for k in range(8):  # ground rings
    put(dry, 15 + k, bell(note(81 + [0, 3, 7, 10, 12, 7, 3, 0][k]), 1.2), 0.5 if k % 2 else -0.5, 0.25)
for i, uu in enumerate(range(27)):  # colour wave
    t0 = 17 + (1.1 + i / 27 * 0.5 if i >= 17 else i / 17 * 1.1)
    put(dry, t0, pluck(penta[i % 7] + 12, 0.25, 1.5), (i / 13.0) - 1, 0.18)
put(dry, 19.1, tick(1400, 0.3), 0.6); put(dry, 19.14, tick(2100, 0.25), 0.6)
for r in range(4):
    put(dry, 19.75 + r * 0.12, tick(3000, 0.12), 0.6)
put(dry, 21.45, whoosh(0.55, 400, 9000), 0.3, 0.9)

# S4 · sheets (22–30)
put(dry, 22.0, kick(True), 0, 0.6)
put(dry, 22.0, bell(note(76), 2.5), 0, 0.3); put(verb, 22.0, bell(note(76), 2.5), 0, 0.4)
groove(22.0, 29.0, clap_on=False, bass_on=True, arp=True)
for i in range(6):
    put(dry, 22.35 + i * 0.1, tick(1600 + i * 180, 0.22), -0.6 + i * 0.24)
for k in range(6):  # compliance checks
    put(dry, 22.8 + 0.2 + 0.8 + k * 0.3, pluck(76 + k * 2, 0.3, 1.5), 0.4, 0.22)
for k in range(5):  # action-board moves
    put(dry, 22.8 + 0.3 + 0.9 + k * 0.38, whoosh(0.18, 2000, 6000, rise=False), -0.2, 0.25)
q = 'Which dates need attention this quarter?'
for k in range(len(q)):
    put(dry, 22.8 + 0.5 + 0.4 + k / 42, keyclick(), 0.5)
for li, s_ in enumerate(['Two renewal windows and one', 'insurance certificate. All three', 'are now on the Action Board.']):
    for k in range(len(s_)):
        put(dry, 22.8 + 0.5 + 1.8 + li * 0.75 + k / 40, keyclick(), 0.3, 0.6)
put(dry, 29.0, riser(0.95, 250, 2400), 0, 1.0)

# S5 · speed cuts (30–38)
put(dry, 30.0, impact(), 0, 0.9)
for i in range(8):
    t0 = 30 + i * BEAT
    put(dry, t0, kick(), 0, 1.0)
    ch = CHORDS[i // 2 % 4]
    for n in ch:
        put(dry, t0, pluck(n + 12, 0.45, 1.8), 0, 0.3)
        put(verb, t0, pluck(n + 12, 0.45), 0, 0.25)
    put(dry, t0 + 0.25, hat(), 0.3, 0.8)
    put(dry, t0 + 0.125, hat(), -0.3, 0.3); put(dry, t0 + 0.375, hat(), -0.3, 0.3)
    put(duckable, t0 + 0.25, bass(BASSN[i // 2 % 4]), 0, 0.9)
for k, t0 in enumerate((34.0, 34.25, 34.5)):
    put(dry, t0, kick(True), 0, 0.7)
    put(verb, t0, pluck([57, 60, 64][k], 1.2), 0, 0.5)
put(verb, 34.0, pad([45, 57, 60, 64, 67], 3.0, bright=4, attack=0.3, release=1.2), 0, 0.8)
for k in range(len('Results that last.')):
    put(dry, 35.0 + k / 26, keyclick(), -0.3, 0.8)
put(dry, 36.0, whoosh(0.8, 300, 8000), 0, 0.7)
put(dry, 36.2, whoosh(0.8, 8000, 400, rise=False), 0, 0.4)
for k in range(5):
    put(dry, 36.8 + k * 0.22, pluck(57 + [0, 3, 7, 10, 12][k], 0.5, 1.2), -0.5 + k * 0.25, 0.35)
put(dry, 37.0, riser(1.5, 150, 1800), 0, 1.0)

# S6 · resolve (38–48)
put(dry, 38.5, impact(), 0, 1.0); put(verb, 38.5, impact(), 0, 0.5)
put(dry, 38.5, kick(True), 0, 0.9)
final = [45, 57, 61, 64, 68, 71, 76]  # A major add9 — the resolve
put(dry, 38.5, pad(final, 9.5, bright=9, attack=0.02, release=4.0), 0, 0.9)
put(verb, 38.5, pad(final, 9.5, bright=9, attack=0.02, release=4.0), 0, 1.0)
for k, n in enumerate((69, 73, 76, 81, 85, 88, 93)):
    put(dry, 38.75 + k * 0.03, bell(note(n), 2.0), -0.6 + k * 0.2, 0.18)
    put(verb, 38.75 + k * 0.03, bell(note(n), 2.0), 0, 0.2)
put(dry, 40.1, bell(note(88), 3.0), 0.2, 0.3); put(verb, 40.1, bell(note(88), 3.0), 0, 0.4)
for k in range(7):  # tagline words
    put(dry, 40.4 + k * 0.09, tick(2400 + k * 120, 0.08), -0.3 + k * 0.1)
put(dry, 41.8, whoosh(0.7, 3000, 300, rise=False), 0, 0.3)
put(dry, 42.0, bell(note(81), 4.0), -0.2, 0.2); put(verb, 42.0, bell(note(81), 4.0), 0, 0.4)

# ── mix ─────────────────────────────────────────────────────────────────
t_all = np.arange(N) / SR
duck = np.ones(N)
kick_times = [b for b in np.arange(6.0, 13.0, BEAT)] + [b for b in np.arange(14.5, 21.5, BEAT)] + \
    [b for b in np.arange(22.0, 29.0, BEAT)] + [30 + i * BEAT for i in range(8)]
for kt in kick_times:
    i = int(kt * SR)
    seg = t_all[i : i + int(0.4 * SR)] - kt
    duck[i : i + len(seg)] = np.minimum(duck[i : i + len(seg)], 1 - 0.6 * np.exp(-seg * 11))
dry += duckable * duck

ir_t = np.arange(int(2.6 * SR)) / SR
ir = np.stack([band(rng.standard_normal(len(ir_t)), 200, 7000) * np.exp(-ir_t * 2.6) for _ in range(2)])
ir[:, : int(0.012 * SR)] = 0
L = 1 << int(np.ceil(np.log2(N + len(ir_t))))
wet = np.stack([np.fft.irfft(np.fft.rfft(verb[c], L) * np.fft.rfft(ir[c], L), L)[:N] for c in range(2)])
wet /= np.max(np.abs(wet)) + 1e-9
mixd = dry + (verb + wet * 0.55 * np.max(np.abs(verb)) * 3) * 0.5
mixd = np.tanh(mixd * 0.9)
fade = np.clip((DUR - t_all) / 1.6, 0, 1)
mixd *= fade
mixd /= np.max(np.abs(mixd)) / 0.89

out = Path(__file__).with_name('out')
out.mkdir(exist_ok=True)
pcm = (mixd.T * 32767).astype('<i2')
with wave.open(str(out / 'score.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('wrote', out / 'score.wav', f'{DUR:.0f}s')
