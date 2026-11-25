"""Final audio mix for the TillText ad: ElevenLabs voiceover + Epidemic Sound music and SFX.
Every time below is video time (seconds), matched to edl.js and the voiceover word timings."""
import numpy as np, subprocess, wave, sys
SR = 48000
DUR = 31.2
N = int(DUR * SR)
D = 'snd/'

def load(name):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', D + name, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()

def seg(x, a, b=None, fi=0.005, fo=0.01):
    y = x[int(a * SR):(int(b * SR) if b else None)].copy()
    n = len(y)
    i = min(int(fi * SR), n); o = min(int(fo * SR), n)
    if i: y[:i] *= np.linspace(0, 1, i)[:, None]
    if o: y[-o:] *= np.linspace(1, 0, o)[:, None]
    return y

def db(g): return 10 ** (g / 20)

def place(buf, y, at, gain_db=0.0):
    i = int(round(at * SR))
    if i < 0: y = y[-i:]; i = 0
    n = min(len(y), len(buf) - i)
    if n > 0: buf[i:i + n] += y[:n] * db(gain_db)

vo_buf = np.zeros((N, 2), np.float32)
mus = np.zeros((N, 2), np.float32)
sfx = np.zeros((N, 2), np.float32)
amb = np.zeros((N, 2), np.float32)

# ---------------- voiceover, sentence by sentence ----------------
vo = load('vo.mp3')
cuts = [0.0, 3.58, 7.5, 8.83, 14.8, 16.86, 19.1, 22.44, len(vo) / SR]
offs = [0.4, 0.5, 0.6, 1.4, 1.8, 2.3, 2.9, 3.7]
for k in range(8):
    place(vo_buf, seg(vo, cuts[k], cuts[k + 1], 0.012, 0.015), cuts[k] + offs[k])

# ---------------- music (Epidemic: Yeah You, 31 s edit) ----------------
music = load('music.wav')
place(mus, seg(music, 0, None, 0.02, 0.05), 0.2)
# gentle fade out at the very end
fo = int(0.8 * SR); mus[-fo:] *= np.linspace(1, 0, fo)[:, None]

# duck music under the voice (smoothed envelope sidechain)
env = np.abs(vo_buf).mean(1)
win = int(0.12 * SR)
env = np.convolve(env, np.ones(win) / win, mode='same')
speech = np.clip(env / 0.02, 0, 1)             # 0 = silence, 1 = talking
att = int(0.06 * SR); rel = int(0.35 * SR)      # attack/release smoothing
g = np.zeros(N); cur = 0.0
for i in range(0, N, 240):                       # 5 ms steps
    target = speech[i]
    coef = 240 / (att if target > cur else rel)
    cur += (target - cur) * min(1, coef)
    g[i:i + 240] = cur
duck = db(-12.0 * g)                             # up to 12 dB under the voice
mus *= duck[:, None]

# ---------------- ambience: busy restaurant, lunch rush ----------------
ambx = load('ambience.wav')
a = seg(ambx, 10, 18.3, 0.4, 0.6)
place(amb, a, 0.0, -10)

# ---------------- sound effects ----------------
vib = load('vibrate.wav'); ping = load('ping.wav'); notif = load('notif_long.wav')
whoosh = load('whoosh_med.wav'); swish = load('swish.wav'); swoosh = load('swoosh_light.wav')
printer = load('printer.wav'); impact = load('impact.wav'); popup = load('popup.wav'); typing = load('typing.wav')

# phone buzzing on the counter
place(sfx, seg(vib, 0.05, 1.75, 0.01, 0.08), 0.35, -4)
place(sfx, seg(vib, 2.62, 3.9, 0.01, 0.15), 2.35, -6)
# message pings for every bubble (bubble i pops at orig .15+i*.19, V = orig*1.3933)
for i in range(14):
    t = (0.15 + i * 0.19) * 1.3933
    place(sfx, ping, t, -9 - (i % 3) * 2)
# problem lines (swish on each), implode whoosh, logo hit
for t in (4.18, 5.62, 6.5):
    place(sfx, swish, t - 0.45, -13)
place(sfx, whoosh, 8.2 - 0.85 - 0.1, -8)
place(sfx, impact, 8.2 - 1.15, -3)
# paper wipe into the chat
place(sfx, swoosh, 10.12 - 0.7, -11)
# chat: customer sends, TillText replies, customer, confirmation
place(sfx, seg(typing, 0.0, 0.8, 0.005, 0.1), 9.85, -14)
place(sfx, swish, 10.5 - 0.45, -16)
place(sfx, notif, 12.3, -10)
place(sfx, swish, 13.6 - 0.45, -16)
place(sfx, notif, 14.45, -10)
# receipt printing
place(sfx, seg(printer, 0.0, 1.6, 0.01, 0.2), 15.02, -4)
# whip to dashboard, rows arriving
place(sfx, whoosh, 16.35 - 0.85, -10)
for t in (17.18, 17.49, 17.79, 18.1, 18.4):
    place(sfx, seg(popup, 0.0, 0.45), t - 0.05, -17)
place(sfx, seg(popup, 1.15, 1.6), 18.7 - 0.05, -18)
# languages, voice note, transcript typing
place(sfx, swish, 19.25 - 0.45, -12)
place(sfx, swoosh, 20.32 - 0.7, -12)
place(sfx, seg(popup, 2.3, 2.75), 20.42, -15)
place(sfx, seg(typing, 1.9, 2.6, 0.005, 0.08), 20.93, -16)
# into the photos, a push on every business
place(sfx, whoosh, 21.98 - 0.85, -10)
for t in (22.68, 23.35, 24.32):
    place(sfx, swish, t - 0.42, -12)
# end card hit, CTA pop
place(sfx, swoosh, 25.95 - 0.7, -12)
place(sfx, impact, 26.18 - 1.15, -6)
place(sfx, seg(popup, 3.45, 3.9), 28.7, -12)

mix = vo_buf * db(0) + mus * db(-12) + amb * db(4) + sfx * db(-2)
mix[:int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))[:, None]
peak = np.max(np.abs(mix))
mix *= 0.89 / peak
out = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(out.tobytes())
print('ok, peak before norm', peak)
