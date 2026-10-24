# Music + SFX for the ConsultaPsi brag video, one grid: 96 BPM, F major, from frame 0.
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile
import sys

SR = 48000
BPM = 96
B = 60 / BPM
DUR = 86 * 60 / 96
N = int(DUR * SR)
rng = np.random.default_rng(7)

def hz(m): return 440 * 2 ** ((m - 69) / 12)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)

def add(buf, sig, t):
    i = int(round(t * SR))
    if i >= len(buf): return
    sig = sig[: len(buf) - i]
    buf[i:i + len(sig)] += sig

def env(n, a, d, s=0.0, r=None):
    t = np.arange(n) / SR
    e = np.minimum(t / max(a, 1e-4), 1.0)
    e *= s + (1 - s) * np.exp(-np.maximum(t - a, 0) / d)
    return e

# chords: Fmaj7, Am7, Bbmaj7, C6sus-ish — one bar (4 beats) each
CH = [[53, 57, 60, 64], [57, 60, 64, 67], [58, 62, 65, 69], [60, 64, 67, 69]]
ROOT = [41, 45, 46, 48]
def chord_at(beat): return int(beat // 4) % 4

pad = np.zeros(N); keys = np.zeros(N); bass = np.zeros(N); drums = np.zeros(N); sfx = np.zeros(N)

END_BEAT = 80  # music plays through beat 80, then rings out
# --- pad: detuned soft saws, low-passed, per bar
for bar in range(0, 22):
    t0 = bar * 4 * B
    n = int((4 * B + 1.2) * SR)
    tt = np.arange(n) / SR
    sig = np.zeros(n)
    for m in CH[bar % 4]:
        for det in (-0.08, 0.08):
            f = hz(m + 12 * 0) * 2 ** (det / 12)
            ph = rng.random()
            sig += 2 * ((tt * f + ph) % 1) - 1
    sig = lp(sig, 1400 if bar >= 2 else 900)
    e = np.minimum(tt / 0.5, 1) * np.clip((4 * B + 1.2 - tt) / 1.2, 0, 1)
    if bar >= 7: e *= np.where(tt < 4 * B, 1, 1)
    add(pad, sig * e * 0.035, t0)

# --- plucked keys: arpeggio on eighths from the reveal (beat 6)
pattern = [0, 2, 1, 3, 2, 1, 3, 2]
for k in range(6 * 2, END_BEAT * 2):
    beat = k / 2
    c = CH[chord_at(beat)]
    m = c[pattern[k % 8]] + 12
    n = int(0.9 * SR); tt = np.arange(n) / SR
    f = hz(m)
    sig = np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(2 * np.pi * 2 * f * tt) * np.exp(-tt * 9) + 0.12 * np.sin(2 * np.pi * 3 * f * tt) * np.exp(-tt * 14)
    sig *= env(n, 0.004, 0.32)
    vel = 0.75 if k % 2 == 0 else 0.55
    add(keys, sig * 0.06 * vel, beat * B)

# --- bass: soft sine roots on beats 1 and 2.5 of each bar from beat 6
for beat in np.arange(6, END_BEAT, 4):
    for off, ln in ((0, 1.4), (2.5, 1.2)):
        b = beat + off
        if b >= END_BEAT: continue
        n = int(ln * B * SR + 0.15 * SR); tt = np.arange(n) / SR
        f = hz(ROOT[chord_at(b)] - 12 + 12)
        sig = np.sin(2 * np.pi * f * tt) + 0.2 * np.sin(2 * np.pi * 2 * f * tt)
        e = np.minimum(tt / 0.01, 1) * np.clip((n / SR - tt) / 0.15, 0, 1)
        add(bass, sig * e * 0.16, b * B)

# --- drums: soft kick, rim on 2 & 4, shaker 16ths; a lighter breath in the Cuidados scene (beats 40-48)
def kick():
    n = int(0.35 * SR); tt = np.arange(n) / SR
    f = 50 + 70 * np.exp(-tt * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 11) * 0.5
def rim():
    n = int(0.18 * SR); tt = np.arange(n) / SR
    s = bp(rng.standard_normal(n), 1500, 4500) * np.exp(-tt * 40) * 0.5 + np.sin(2 * np.pi * 820 * tt) * np.exp(-tt * 60) * 0.25
    return s * 0.35
def shaker(v):
    n = int(0.08 * SR); tt = np.arange(n) / SR
    return hp(rng.standard_normal(n), 6000) * np.minimum(tt / 0.008, 1) * np.exp(-tt * 55) * 0.05 * v
for beat in range(6, END_BEAT):
    breath = 40 <= beat < 48
    if beat % 2 == 0 and not breath: add(drums, kick(), beat * B)
    if beat >= 12 and beat % 2 == 1: add(drums, rim() * (0.6 if breath else 1), beat * B)
    for s_ in range(4):
        add(drums, shaker([0.5, 0.3, 0.8, 0.3][s_]), (beat + s_ / 4) * B)
for i, b in enumerate(np.arange(5, 6, 0.25)): add(drums, rim() * (0.3 + 0.2 * i), b * B)
for i, b in enumerate(np.arange(47, 48, 0.25)): add(drums, rim() * (0.3 + 0.2 * i), b * B)

# --- lead: a soft bell motif from beat 48 to 80 (2-bar phrase over the chords)
motif = [(0, 72), (1.5, 74), (2, 76), (4, 77), (5.5, 76), (6, 72)]
for start in range(48, 80, 8):
    for off_, m in motif:
        bt = start + off_
        n = int(1.2 * SR); tt = np.arange(n) / SR; f = hz(m)
        sig = (np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(2 * np.pi * 3 * f * tt) * np.exp(-tt * 6)) * env(n, 0.01, 0.5)
        add(keys, sig * 0.035, bt * B)

# --- SFX (in key, same space)
def chime(m, amp=0.09):
    n = int(1.6 * SR); tt = np.arange(n) / SR; f = hz(m)
    s = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 3) + 0.4 * np.sin(2 * np.pi * f * 2.76 * tt) * np.exp(-tt * 9) + 0.2 * np.sin(2 * np.pi * f * 5.4 * tt) * np.exp(-tt * 16)
    return s * np.minimum(tt / 0.003, 1) * amp
def swell(length, amp=0.05, lo=300, hi=3000):
    n = int(length * SR); tt = np.arange(n) / SR
    return bp(rng.standard_normal(n), lo, hi) * (tt / length) ** 2 * amp
def click():
    n = int(0.06 * SR); tt = np.arange(n) / SR
    return (np.sin(2 * np.pi * 2100 * tt) * np.exp(-tt * 120) + bp(rng.standard_normal(n), 2000, 6000) * np.exp(-tt * 150) * 0.4) * 0.07
def tap():
    n = int(0.08 * SR); tt = np.arange(n) / SR
    return np.sin(2 * np.pi * 1400 * tt) * np.exp(-tt * 70) * 0.06
def tick(m):
    n = int(0.25 * SR); tt = np.arange(n) / SR
    return np.sin(2 * np.pi * hz(m) * tt) * np.exp(-tt * 25) * 0.035

for i, m in enumerate([72, 76, 77, 79, 81]):
    add(sfx, chime(m, 0.075), (0.5 + i) * B)
for beat in (6, 12, 16, 20, 24, 32, 40, 48, 56, 64, 70, 80):
    L = 1.0 if beat == 6 else 0.6
    add(sfx, swell(L, 0.06 if beat == 6 else 0.03), beat * B - L)
n = int(2.5 * SR); tt = np.arange(n) / SR
add(sfx, (np.sin(2 * np.pi * hz(41) * tt) + 0.5 * np.sin(2 * np.pi * hz(53) * tt)) * np.minimum(tt / 0.02, 1) * np.exp(-tt * 1.6) * 0.18, 6 * B)
add(sfx, chime(84, 0.05), 6 * B)
# mouse clicks, with a confirmation chime where something completes
for beat, conf in ((14.5, 81), (22, 84), (25, None), (25.5, None), (26.5, 81), (29, 84), (33, None), (34, 79),
                   (42, 81), (53, 84), (62, 81), (68, 79)):
    add(sfx, click(), beat * B)
    if conf: add(sfx, chime(conf, 0.045), beat * B + B / 2)
# phone taps
for beat, conf in ((17, None), (18.5, 84), (44.25, None), (45, 81), (74, None), (77, None)):
    add(sfx, tap(), beat * B)
    if conf: add(sfx, chime(conf, 0.045), beat * B + B / 2)
add(sfx, chime(76, 0.04), 20.5 * B)            # nova solicitação
add(sfx, tick(79), 43.5 * B); add(sfx, chime(84, 0.04), 45.5 * B)  # aberto / respondido
add(sfx, tick(77), 49.5 * B)                    # sala ocupada
for i, beat in enumerate((35, 36, 37, 38)): add(sfx, chime([77, 79, 81, 84][i], 0.03), beat * B)
add(sfx, swell(2.5 * B, 0.02, 1500, 6000), 57 * B)   # scan
for i in range(6): add(sfx, tick([72, 74, 76, 77, 79, 81][i]), (58 + i * 0.5) * B)
for m in (53, 60, 64, 67, 69, 72): add(sfx, chime(m, 0.03), 80 * B)
n = int(3.4 * SR); tt = np.arange(n) / SR
fin = sum(np.sin(2 * np.pi * hz(m) * tt) for m in (41, 53, 57, 60, 64))
add(sfx, lp(fin, 2000) * np.minimum(tt / 0.05, 1) * np.exp(-tt * 0.9) * 0.05, 80 * B)

# --- shared room reverb
def reverb(x, wet, length=1.8):
    n = int(length * SR); tt = np.arange(n) / SR
    ir = rng.standard_normal(n) * np.exp(-tt * 3.2)
    ir = lp(ir, 5000)
    ir /= np.sqrt(np.sum(ir ** 2))
    return x + wet * fftconvolve(x, ir)[: len(x)]

music = pad + keys * 1.0 + bass + drums
music = reverb(music, 0.18)
fx = reverb(sfx, 0.35)
mix = music + fx * 0.85
# gentle end fade over the last 0.6s
tt = np.arange(N) / SR
mix *= np.clip((DUR - tt) / 0.6, 0, 1) ** 0.5
mix = hp(mix, 30)
# soft limiting
peak = np.max(np.abs(mix))
mix = mix / peak * 0.89
mix = np.tanh(mix * 1.15) / np.tanh(1.15)
st = np.stack([mix, mix], 1)
# subtle stereo width on keys/sfx via small delay on one side
d = int(0.012 * SR)
side = np.concatenate([np.zeros(d), (keys + fx * 0.5)[:-d]])
st[:, 0] += side * 0.15 / peak; st[:, 1] -= side * 0.15 / peak
st = np.clip(st, -1, 1)
wavfile.write(sys.argv[1] if len(sys.argv) > 1 else 'audio.wav', SR, (st * 32767).astype(np.int16))
print('ok', st.shape[0] / SR)
