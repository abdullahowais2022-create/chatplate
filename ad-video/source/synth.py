"""Original music + sound design for the TillText ad, synced to the HTML timeline (120 BPM)."""
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
import wave, sys

SR = 48000
DUR = 30.6
N = int(SR * DUR)
rng = np.random.default_rng(3)
BEAT = 0.5

def t_(d): return np.arange(int(d * SR)) / SR
def env(d, a=0.003, dec=0.2, curve=1.0):
    t = t_(d); e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / dec) ** curve
    return e
def lp(x, f, o=2): return sosfilt(butter(o, min(f, SR / 2 - 100) / (SR / 2), 'low', output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f / (SR / 2), 'high', output='sos'), x)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo / (SR / 2), hi / (SR / 2)], 'band', output='sos'), x)
def place(buf, x, at, g=1.0):
    i = int(at * SR)
    if i >= len(buf): return
    n = min(len(x), len(buf) - i); buf[i:i + n] += x[:n] * g
def midi(m): return 440 * 2 ** ((m - 69) / 12)
def saw(f, d, ph=0.0):
    t = t_(d); return 2 * ((t * f + ph) % 1) - 1
def supersaw(f, d, voices=7, det=0.012):
    out = np.zeros(int(d * SR))
    for v in range(voices):
        k = (v - (voices - 1) / 2) / ((voices - 1) / 2)
        out += saw(f * (1 + det * k), d, rng.random())
    return out / voices
def reverb(x, secs=1.6, mix=0.25, damp=5000):
    ir = rng.standard_normal(int(secs * SR)) * np.exp(-t_(secs) * (6.9 / secs))
    ir = lp(ir, damp); ir /= np.sqrt(np.sum(ir ** 2))
    wet = fftconvolve(x, ir)[:len(x)]
    return x * (1 - mix) + wet * mix * 0.6

# ---------------- instruments ----------------
def kick(g=1.0):
    d = 0.45; t = t_(d)
    f = 45 + 120 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * env(d, 0.001, 0.16)
    click = hp(rng.standard_normal(len(t)), 3000) * env(d, 0.0005, 0.004) * 0.5
    return np.tanh((body + click) * 1.6) * g
def clap():
    d = 0.4; x = np.zeros(int(d * SR))
    for o in (0, 0.011, 0.022):
        n = rng.standard_normal(int(0.3 * SR)) * env(0.3, 0.0005, 0.012 if o < 0.02 else 0.09)
        place(x, n, o)
    return bp(x, 900, 3200) * 1.8
def hat(dec=0.035, g=1.0):
    d = 0.15; return hp(rng.standard_normal(int(d * SR)), 7500, 4) * env(d, 0.0005, dec) * g
def openhat(): return hat(0.12, 0.8)
def sub(m, d):
    f = midi(m); t = t_(d)
    x = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)
    e = np.minimum(1, t / 0.01) * np.minimum(1, (d - t) / 0.03)
    return np.tanh(x * 1.3) * e
def stab(notes, d=0.22, cut=3200):
    x = sum(supersaw(midi(n), d) for n in notes) / len(notes)
    x = lp(x, cut, 2) * env(d, 0.004, 0.09)
    return x
def pad(notes, d, cut=1800):
    x = sum(supersaw(midi(n), d, 5, 0.008) for n in notes) / len(notes)
    t = t_(d); e = np.minimum(1, t / 0.35) * np.minimum(1, (d - t) / 0.6)
    return lp(x, cut, 2) * e
def pluck(m, d=0.25, cut=4000):
    x = saw(midi(m), d) + 0.5 * saw(midi(m + 12), d)
    return lp(x, cut, 2) * env(d, 0.002, 0.07)
def riser(d, f0=200, f1=6000):
    n = rng.standard_normal(int(d * SR)); out = np.zeros_like(n)
    seg = int(0.02 * SR)
    for i in range(0, len(n), seg):
        k = i / len(n); fc = f0 * (f1 / f0) ** k
        out[i:i + seg] = bp(n[max(0, i - 2000):i + seg], fc * 0.7, min(fc * 1.4, 20000))[-len(n[i:i + seg]):]
    t = t_(d)
    tone = np.sin(2 * np.pi * np.cumsum(220 * 4 ** (t / d)) / SR) * 0.25
    return (out + tone) * (t / d) ** 2
def impact(g=1.0):
    d = 2.5; t = t_(d)
    boom = np.sin(2 * np.pi * np.cumsum(30 + 80 * np.exp(-t / 0.08)) / SR) * env(d, 0.001, 0.5)
    crash = hp(rng.standard_normal(len(t)), 2500) * env(d, 0.001, 0.45) * 0.35
    return reverb(np.tanh((boom * 1.4 + crash)), 2.2, 0.35) * g

# ---------------- music ----------------
mus = np.zeros(N)
drums = np.zeros(N)
bassb = np.zeros(N)
chords = np.zeros(N)
lead = np.zeros(N)

PROG = [  # (bass midi, chord notes) Am F C G
    (33, [57, 60, 64, 69]), (29, [57, 60, 65, 69]), (36, [55, 60, 64, 67]), (31, [55, 59, 62, 67])]
ARP = {0: [69, 72, 76, 72], 1: [69, 72, 77, 72], 2: [67, 72, 76, 72], 3: [67, 71, 74, 71]}

def chord_at(t, start=6.0):
    return int(((t - start) // 2) % 4)

# Intro 0-6: tense arps opening up, hats, heartbeat kicks
for i in range(int(6 / 0.125)):
    t = i * 0.125
    c = 0 if t < 4 else (1 if t < 5 else 3)
    m = ARP[c][i % 4] - 12
    cut = 700 + 3000 * (t / 6) ** 1.5
    place(lead, pluck(m, 0.2, cut), t, 0.22 + 0.1 * t / 6)
for i in range(int(1.5 / 0.25), int(6 / 0.25)):
    place(drums, hat(0.02, 0.35 if i % 2 else 0.2), i * 0.25)
for b in np.arange(3.0, 5.5, 0.5):
    place(drums, kick(0.55), b)
place(mus, riser(1.5), 4.5, 0.35)
# snare build 5.0-6.0
for k, b in enumerate(np.arange(5.0, 5.95, 0.0625)):
    place(drums, clap(), b, 0.15 + 0.35 * k / 15)

# Main groove 6.0 - 23.0
def groove(a, b, full=True, lead_on=False):
    for beat in np.arange(a, b - 1e-6, 0.5):
        place(drums, kick(), beat)
        k = int(round((beat - 6) / 0.5))
        if k % 2 == 1: place(drums, clap(), beat, 0.7)
        place(drums, openhat(), beat + 0.25, 0.3)
        for s in (0.125, 0.375): place(drums, hat(0.02, 0.22), beat + s)
        place(drums, hat(0.02, 0.25), beat)
        c = chord_at(beat)
        bn, cn = PROG[c]
        # bass: offbeat 8ths octave pump
        place(bassb, sub(bn + 12, 0.22), beat + 0.25, 0.9)
        place(bassb, sub(bn, 0.2), beat, 0.0)
        if full:
            place(chords, stab(cn, 0.24, 3800), beat + 0.25, 0.55)
        if lead_on:
            m = ARP[c][k % 4] + (12 if (k // 8) % 2 else 0)
            place(lead, pluck(m, 0.22, 5000), beat, 0.18)
            place(lead, pluck(ARP[c][(k + 2) % 4], 0.18, 4000), beat + 0.25, 0.1)

groove(6.0, 9.0, full=True)
groove(9.0, 14.0, full=True)
groove(14.0, 18.0, full=True, lead_on=True)
groove(18.0, 23.0, full=True, lead_on=True)
place(mus, impact(1.0), 6.0, 0.9)
# pads under the groove
for s in np.arange(6.0, 23.0, 2.0):
    bn, cn = PROG[chord_at(s)]
    place(chords, pad([n - 12 for n in cn[:3]], 2.0, 1400), s, 0.35)
place(mus, riser(1.0, 400, 8000), 22.0, 0.25)

# Punch section: hits at 23.0, 23.75, 24.5 with tails
for i, h in enumerate((23.0, 23.75, 24.5)):
    bn, cn = PROG[[0, 1, 2][i]]
    place(drums, kick(1.1), h)
    place(chords, reverb(np.concatenate([stab([n + 12 for n in cn], 0.5, 5000), np.zeros(SR)]), 1.2, 0.5), h, 0.8)
    place(bassb, sub(bn, 0.5), h, 1.0)
    place(drums, clap(), h, 0.6)
# marquee 25.25-26.5: drive + build
for beat in np.arange(25.25, 26.5, 0.25):
    place(drums, kick(0.9), beat) if (beat - 25.25) % 0.5 < 0.01 else None
    place(drums, hat(0.02, 0.4), beat)
    place(bassb, sub(31 + 12, 0.2), beat, 0.7)
for k, b in enumerate(np.arange(25.75, 26.45, 0.0625)):
    place(drums, clap(), b, 0.2 + 0.4 * k / 11)
place(mus, riser(1.25, 300, 9000), 25.25, 0.35)

# End card 26.5 - 30.6: big hit, warm pad, light groove fading
place(mus, impact(1.0), 26.5, 1.0)
place(chords, pad([48, 55, 60, 64, 67], 4.1, 2200), 26.5, 0.55)
place(bassb, sub(24, 3.5), 26.5, 0.9)
for beat in np.arange(27.0, 29.5, 0.5):
    place(drums, hat(0.02, 0.3), beat + 0.25)
    place(lead, pluck([72, 76, 79, 76][int((beat - 27) / 0.5) % 4], 0.3, 3000), beat, 0.12)
place(chords, reverb(np.concatenate([stab([60, 64, 67, 72], 0.6, 6000), np.zeros(SR * 2)]), 2.0, 0.5), 29.0, 0.6)

# sidechain on bass/chords from kick times
sc = np.ones(N)
kick_times = [b for b in np.arange(6.0, 23.0, 0.5)] + [23.0, 23.75, 24.5] + list(np.arange(25.25, 26.5, 0.5))
for kt in kick_times:
    i = int(kt * SR); n = int(0.28 * SR)
    curve = 1 - 0.75 * np.exp(-t_(0.28) / 0.07)
    sc[i:i + n] = np.minimum(sc[i:i + n], curve[:len(sc[i:i + n])])
chords = reverb(chords, 1.4, 0.22)
lead = reverb(lead, 1.2, 0.3)
mus += drums * 0.8 + bassb * 0.55 * sc + chords * 0.5 * sc + lead * 0.7

# ---------------- sound effects ----------------
sfx = np.zeros(N)
def pop(f=900, g=1.0):
    d = 0.09; t = t_(d)
    fr = f * (1 + 0.6 * (1 - np.exp(-t / 0.02)))
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * env(d, 0.001, 0.025) * g
def whoosh(d=0.4, up=True, g=1.0):
    n = rng.standard_normal(int(d * SR)); t = t_(d)
    out = np.zeros_like(n); seg = int(0.01 * SR)
    for i in range(0, len(n), seg):
        k = i / len(n); fc = (500 * 10 ** (k * 1.1)) if up else (5000 * 10 ** (-k * 1.1))
        out[i:i + seg] = bp(n[max(0, i - 1500):i + seg], fc * 0.6, min(fc * 1.6, 20000))[-len(n[i:i + seg]):]
    return out * np.sin(np.pi * t / d) ** 2 * g
def tick(g=1.0, f=3000):
    d = 0.02; return bp(rng.standard_normal(int(d * SR)), f, f * 1.8) * env(d, 0.0003, 0.003) * g
def ding(g=1.0):
    d = 0.6; t = t_(d)
    return (np.sin(2 * np.pi * 1318 * t) + 0.5 * np.sin(2 * np.pi * 1760 * t)) * env(d, 0.002, 0.15) * g

# bubbles (match index.html: t = .15 + i*.19)
for i in range(14):
    place(sfx, pop(700 + (i * 137) % 600, 0.5), 0.15 + i * 0.19)
# text slams at 3,4,5
for h in (3.0, 4.0, 5.0):
    place(sfx, whoosh(0.3, True, 0.5), h - 0.12)
# implosion swoosh 5.45-6.0
place(sfx, whoosh(0.55, True, 0.8), 5.45)
# logo pop + wordmark
place(sfx, pop(500, 0.7), 6.08)
for i in range(8): place(sfx, tick(0.25, 2500), 6.35 + i * 0.045)
# wipe up 8.55
place(sfx, whoosh(0.45, True, 0.7), 8.55)
# chat: send / receive
for at, kind in ((9.35, 'out'), (10.65, 'in'), (11.55, 'out'), (12.15, 'in')):
    place(sfx, whoosh(0.18, True, 0.25) if kind == 'out' else ding(0.18), at)
    place(sfx, pop(1200 if kind == 'out' else 800, 0.35), at + 0.02)
# typing clicks
for a, b in ((9.85, 10.6), (11.75, 12.1)):
    for tt in np.arange(a, b, 0.09): place(sfx, tick(0.08 + 0.05 * rng.random(), 4000), tt + 0.02 * rng.random())
# receipt printer 12.75-13.55
for tt in np.arange(12.75, 13.55, 0.03):
    place(sfx, tick(0.3, 1800 + 400 * rng.random()), tt)
pr = bp(rng.standard_normal(int(0.8 * SR)), 300, 900) * 0.08
place(sfx, pr * (np.sin(2 * np.pi * 33 * t_(0.8)) > 0), 12.75)
place(sfx, ding(0.3), 13.55)
# whip to languages
place(sfx, whoosh(0.35, False, 0.7), 13.65)
for i in range(10): place(sfx, tick(0.35, 2200), 14.1 + i * 0.19)
place(sfx, whoosh(0.3, True, 0.6), 15.85)
place(sfx, pop(600, 0.5), 16.15)
for i in range(30): place(sfx, tick(0.1, 5000), 16.9 + i * 0.026)
place(sfx, whoosh(0.35, True, 0.6), 17.8)
# dashboard
place(sfx, whoosh(0.5, True, 0.5), 17.9)
for i in range(36): place(sfx, tick(0.12 * (1 - i / 40), 3500), 18.5 + i * 0.05)
for rt in (19.0, 19.5, 20.0, 20.5, 21.0):
    place(sfx, pop(1000, 0.3), rt); place(sfx, tick(0.4, 2000), rt + 0.03)
for st in (21.6, 21.9, 22.2, 22.35): place(sfx, ding(0.12), st)
place(sfx, whoosh(0.35, True, 0.8), 22.65)
# punch hits
for h in (23.0, 23.75, 24.5): place(sfx, whoosh(0.2, False, 0.4), h - 0.05)
place(sfx, pop(500, 0.6), 25.55)
place(sfx, whoosh(0.3, True, 0.7), 26.25)
# end card
place(sfx, pop(450, 0.6), 26.55)
for i in range(8): place(sfx, tick(0.2, 2600), 26.8 + i * 0.04)
place(sfx, pop(900, 0.5), 27.95)
place(sfx, ding(0.25), 28.0)

# ---------------- mix + master ----------------
mix = mus * 0.9 + sfx * 0.85
mix = hp(mix, 25)
# soft fades
fi = int(0.02 * SR); mix[:fi] *= np.linspace(0, 1, fi)
fo = int(1.2 * SR); mix[-fo:] *= np.linspace(1, 0, fo) ** 1.5
# limiter-ish
mix = mix / (np.percentile(np.abs(mix), 99.9) + 1e-9) * 0.8
mix = np.tanh(mix * 1.15) / np.tanh(1.15)
mix *= 0.93 / np.max(np.abs(mix))
# stereo widen: chords/lead slight haas
L = mix; R = mix.copy()
st = np.stack([L, R], 1)
out = (st * 32767).astype(np.int16)
with wave.open(sys.argv[1] if len(sys.argv) > 1 else 'audio.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(out.tobytes())
print('ok', DUR)
