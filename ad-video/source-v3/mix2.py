"""TillText ad v3 mix: processed ElevenLabs VO (Hale) + Epidemic music/SFX, measured levels."""
import numpy as np, subprocess, wave, sys, re
SR = 48000
DUR = 54.0
N = int(DUR * SR)
D = 'snd/'

def load(name, filt=None):
    cmd = ['ffmpeg', '-v', 'error', '-i', D + name]
    if filt: cmd += ['-af', filt]
    cmd += ['-ac', '2', '-ar', str(SR), '-f', 'f32le', '-']
    return np.frombuffer(subprocess.run(cmd, capture_output=True).stdout, np.float32).reshape(-1, 2).copy()

def seg(x, a, b=None, fi=0.005, fo=0.01):
    y = x[int(a * SR):(int(b * SR) if b else None)].copy(); n = len(y)
    i = min(int(fi * SR), n); o = min(int(fo * SR), n)
    if i: y[:i] *= np.linspace(0, 1, i)[:, None]
    if o: y[-o:] *= np.linspace(1, 0, o)[:, None]
    return y

def db(g): return 10 ** (g / 20)

def place(buf, y, at, g=0.0):
    i = int(round(at * SR))
    if i < 0: y = y[-i:]; i = 0
    n = min(len(y), len(buf) - i)
    if n > 0: buf[i:i + n] += y[:n] * db(g)

def write(path, x):
    out = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(out.tobytes())

def lufs(path):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', path, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', r)[-1])

# ---------- voice: clarity chain ----------
VO_CHAIN = ('highpass=f=90:poles=2,'
            'equalizer=f=300:width_type=o:width=1:g=-2.5,'
            'equalizer=f=3500:width_type=o:width=1.2:g=2,'
            'deesser=i=0.35:m=0.5:f=0.5:s=o,'
            'acompressor=threshold=0.125:ratio=3:attack=8:release=120:makeup=1.6')
vo = load('vo_hale.mp3', VO_CHAIN)
vob = np.zeros((N, 2), np.float32)
place(vob, seg(vo, 0.0, 39.85, 0.01, 0.02), 0.6)          # up to "...get to work."
place(vob, seg(vo, 43.27, None, 0.02, 0.05), 0.6 + 39.85)  # "Restaurants..." onwards (number line removed)
vob = (vob.mean(1, keepdims=True) * np.ones((1, 2))).astype(np.float32)  # dry, centred, mono VO

# ---------- music: chorus on the reveal, real ending on the end card ----------
m = load('music53.wav', 'equalizer=f=2500:width_type=o:width=1:g=-3')
mus = np.zeros((N, 2), np.float32)
place(mus, seg(m, 6.3, 30.0, 0.4, 0.025), 0.0)
place(mus, seg(m, 22.0, 30.0, 0.025, 0.025), 23.7)
place(mus, seg(m, 30.0, None, 0.025, 0.2), 31.7)

# duck a little more while the voice talks (on top of the measured bed level)
env = np.abs(vob).mean(1); win = int(0.1 * SR)
env = np.convolve(env, np.ones(win) / win, mode='same')
speech = np.clip(env / 0.015, 0, 1)
g = np.zeros(N); cur = 0.0; step = 240
for i in range(0, N, step):
    tgt = speech[i]; coef = step / (int(0.05 * SR) if tgt > cur else int(0.4 * SR))
    cur += (tgt - cur) * min(1, coef); g[i:i + step] = cur
mus *= db(-5.0 * g)[:, None]

# ---------- sound: a few hero moments only ----------
sfx = np.zeros((N, 2), np.float32)
vib = load('vibrate.wav'); ping = load('ping.wav'); woody = load('click_woody.wav'); conf = load('click_confirm.wav')
air = load('whoosh_airy.wav'); riser = load('riser_tonal.wav'); stamp = load('stamp.wav'); marker = load('marker_circle.wav')
place(sfx, seg(vib, 0.05, 0.62, 0.005, 0.08), 1.95, -6)      # one buzz on the first notification
place(sfx, ping, 1.95, -10)                                  # first ping only
place(sfx, seg(riser, 0, None, 0.01, 0.05), 11.55 - 0.825, -8)  # tonal swell into the reveal
place(sfx, seg(woody, 0, 0.35), 14.95, -14)                  # reply lands
place(sfx, conf, 20.5, -18); place(sfx, conf, 20.85, -18)    # prices drop in
place(sfx, seg(marker, 0.3, 0.95, 0.02, 0.1), 21.75, -10)   # marker circles the total
place(sfx, stamp, 22.45, -4)                                 # stamp: from your menu
place(sfx, seg(marker, 1.05, 1.4, 0.01, 0.08), 24.15, -12)  # strike through "Pay now"
place(sfx, conf, 26.12, -12)                                 # take over chat tap
place(sfx, conf, 35.81, -12)                                 # order card lands
place(sfx, air, 36.32 - 0.375, -12)                          # card travels into the dashboard
place(sfx, seg(woody, 0, 0.35), 38.72, -18); place(sfx, seg(woody, 0, 0.35), 39.52, -18)  # status clicks

# ---------- measured balance: music bed 18 LU under the voice ----------
write('st_vo.wav', vob); write('st_mus.wav', mus); write('st_sfx.wav', sfx)
Lv, Lm = lufs('st_vo.wav'), lufs('st_mus.wav')
mg = (Lv - 18.0) - Lm
print(f'VO {Lv:.1f} LUFS, music {Lm:.1f} LUFS -> music gain {mg:+.1f} dB')
tail = np.ones(N); i0, i1 = int(50.1 * SR), int(50.8 * SR)
tail[i0:i1] = np.linspace(1, db(6), i1 - i0); tail[i1:] = db(6)
mus *= tail[:, None]
mix = vob + mus * db(mg) + sfx * db(-3)
fo = int(0.25 * SR); mix[-fo:] *= np.linspace(1, 0, fo)[:, None]
write(sys.argv[1], mix * (0.9 / np.max(np.abs(mix))))
write('st_mus_g.wav', mus * db(mg))
print('Music under VO now', f"{lufs('st_mus_g.wav') - Lv:+.1f} LU")
