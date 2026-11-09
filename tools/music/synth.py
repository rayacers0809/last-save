# LAST SAVE 지역 BGM 6곡 합성기 (numpy). 각 곡은 루프 가능한 길이로 렌더.
import numpy as np, subprocess, sys
SR = 32000
rng = np.random.default_rng(7)
mtof = lambda m: 440.0 * 2 ** ((m - 69) / 12)

def env_adsr(n, a, d, s, r, sr=SR):
    a, d, r = int(a*sr), int(d*sr), int(r*sr)
    e = np.ones(n) * s
    if a: e[:min(a,n)] = np.linspace(0, 1, a)[:min(a,n)]
    if d and a < n: k = min(d, n-a); e[a:a+k] = np.linspace(1, s, d)[:k]
    if r and n > r: e[-r:] *= np.linspace(1, 0, r)
    return e

def osc(f, t, kind):
    ph = 2*np.pi*f*t
    if kind == 'sine': return np.sin(ph)
    if kind == 'tri': return 2/np.pi*np.arcsin(np.sin(ph))
    if kind == 'saw': return 2*((f*t) % 1) - 1
    if kind == 'sq': return np.sign(np.sin(ph)) * 0.6
    raise ValueError(kind)

def lowpass(x, fc):
    a = np.exp(-2*np.pi*fc/SR); y = np.empty_like(x); z = 0.0
    for i in range(len(x)): z = (1-a)*x[i] + a*z; y[i] = z
    return y

def lp_fast(x, fc):  # 1-pole via cumulative trick (approx with FFT)
    X = np.fft.rfft(x); fr = np.fft.rfftfreq(len(x), 1/SR)
    X *= 1/np.sqrt(1+(fr/fc)**4); return np.fft.irfft(X, len(x))

# ─── 악기 ───
def bell(f, dur, vel=1.0):  # 오르골/첼레스타
    n = int((dur+1.6)*SR); t = np.arange(n)/SR
    x = (np.sin(2*np.pi*f*t) + 0.45*np.sin(2*np.pi*f*2.0*t)*np.exp(-t*3) + 0.25*np.sin(2*np.pi*f*3.01*t)*np.exp(-t*5)
         + 0.12*np.sin(2*np.pi*f*4.2*t)*np.exp(-t*8))
    return x * np.exp(-t*2.2) * env_adsr(n, 0.002, 0, 1, 0.05) * vel * 0.5

def harp(f, dur, vel=1.0):  # 카플러스-스트롱 현
    n = int((dur+1.2)*SR); p = max(2, int(SR/f))
    buf = rng.uniform(-1, 1, p); out = np.empty(n)
    for i in range(n):
        out[i] = buf[i % p]; buf[i % p] = 0.5*(buf[i % p] + buf[(i+1) % p]) * 0.996
    return lp_fast(out, 5000) * vel * 0.55 * env_adsr(n, 0.001, 0, 1, 0.08)

def epiano(f, dur, vel=1.0):  # 로즈풍 전자피아노
    n = int((dur+0.8)*SR); t = np.arange(n)/SR
    mod = np.sin(2*np.pi*f*t) * 1.8*np.exp(-t*4)
    x = np.sin(2*np.pi*f*t + mod) + 0.2*np.sin(2*np.pi*2*f*t)*np.exp(-t*6)
    return x * np.exp(-t*1.4) * env_adsr(n, 0.004, 0, 1, 0.25) * vel * 0.35 * (1+0.15*np.sin(2*np.pi*4.5*t))

def pad(f, dur, vel=1.0, bright=1800):
    n = int((dur+1.0)*SR); t = np.arange(n)/SR
    x = sum(osc(f*(1+d), t + rng.uniform(0, 1), 'saw') for d in (-0.006, 0, 0.0055)) / 3
    x = lp_fast(x, bright)
    return x * env_adsr(n, 0.6, 0.4, 0.8, 0.9) * vel * 0.18

def flute(f, dur, vel=1.0):
    n = int((dur+0.3)*SR); t = np.arange(n)/SR
    vib = 1 + 0.004*np.sin(2*np.pi*5.2*t)*np.clip(t*2, 0, 1)
    x = np.sin(2*np.pi*f*t*vib) + 0.15*np.sin(4*np.pi*f*t*vib) + 0.03*rng.standard_normal(n)
    return lp_fast(x, 3500) * env_adsr(n, 0.06, 0.1, 0.85, 0.2) * vel * 0.26

def toypiano(f, dur, vel=1.0):
    n = int((dur+0.9)*SR); t = np.arange(n)/SR
    x = np.sin(2*np.pi*f*t) + 0.6*np.sin(2*np.pi*f*2.76*t)*np.exp(-t*9) + 0.3*np.sin(2*np.pi*f*5.4*t)*np.exp(-t*14)
    return x * np.exp(-t*3.5) * env_adsr(n, 0.001, 0, 1, 0.05) * vel * 0.4

def sqlead(f, dur, vel=1.0):
    n = int((dur+0.2)*SR); t = np.arange(n)/SR
    x = lp_fast(osc(f, t, 'sq') + 0.5*osc(f*1.003, t, 'saw'), 2600)
    return x * env_adsr(n, 0.01, 0.15, 0.6, 0.12) * vel * 0.17

def bass(f, dur, vel=1.0, kind='tri'):
    n = int((dur+0.15)*SR); t = np.arange(n)/SR
    x = osc(f, t, kind) + 0.4*np.sin(2*np.pi*f*t)
    if kind != 'tri': x = lp_fast(x, 700)
    return x * env_adsr(n, 0.005, 0.2, 0.7, 0.08) * vel * 0.32

def kick(vel=1.0):
    n = int(0.35*SR); t = np.arange(n)/SR
    f = 110*np.exp(-t*28) + 42
    return np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-t*9) * vel * 0.7

def snare(vel=1.0):
    n = int(0.25*SR); t = np.arange(n)/SR
    x = lp_fast(rng.standard_normal(n), 6000) * np.exp(-t*18) * 0.5 + np.sin(2*np.pi*190*t)*np.exp(-t*25)*0.4
    return x * vel * 0.45

def hat(vel=1.0, open_=False):
    n = int((0.25 if open_ else 0.06)*SR); t = np.arange(n)/SR
    x = rng.standard_normal(n); X = np.fft.rfft(x); fr = np.fft.rfftfreq(n, 1/SR); X[fr < 7000] = 0
    return np.fft.irfft(X, n) * np.exp(-t*(10 if open_ else 60)) * vel * 0.18

def shaker(vel=1.0):
    n = int(0.09*SR); t = np.arange(n)/SR
    x = rng.standard_normal(n); X = np.fft.rfft(x); fr = np.fft.rfftfreq(n, 1/SR); X[fr < 4500] = 0
    return np.fft.irfft(X, n) * np.sin(np.pi*t/t[-1]) * vel * 0.12

# ─── 믹스 ───
class Track:
    def __init__(self, bpm, bars, beats=4):
        self.bpm, self.beats = bpm, beats
        self.spb = 60/bpm
        self.len = int(bars*beats*self.spb*SR)
        self.buses = {}
    def add(self, bus, x, beat, pan=0.0):
        L = self.buses.setdefault(bus, np.zeros((2, self.len + SR*4)))
        i = int(beat*self.spb*SR)
        if i >= self.len: return
        x = x[:L.shape[1]-i]
        L[0, i:i+len(x)] += x*np.sqrt(0.5*(1-pan)); L[1, i:i+len(x)] += x*np.sqrt(0.5*(1+pan))
    def render(self, mix, reverb):
        out = np.zeros((2, self.len + SR*4))
        for b, sig in self.buses.items():
            g, rv = mix.get(b, (1.0, 0.2)); out += sig*g
            if rv: out += reverb_(sig, rv)*g
        # 루프: 꼬리를 앞쪽에 겹쳐서 이음새 없이
        body = out[:, :self.len].copy(); tail = out[:, self.len:]
        body[:, :tail.shape[1]] += tail
        body = body / (np.max(np.abs(body))+1e-9) * 0.89
        return body

_IR = None
def reverb_(x, amt):
    global _IR
    if _IR is None:
        n = int(2.6*SR); t = np.arange(n)/SR
        _IR = np.stack([rng.standard_normal(n)*np.exp(-t*2.3), rng.standard_normal(n)*np.exp(-t*2.3)])
        _IR = np.stack([lp_fast(c, 6000) for c in _IR]); _IR /= np.sqrt((_IR**2).sum(1, keepdims=True))
    out = np.zeros_like(x)
    for c in range(2):
        N = len(x[c]) + _IR.shape[1]; n2 = 1 << (N-1).bit_length()
        y = np.fft.irfft(np.fft.rfft(x[c], n2)*np.fft.rfft(_IR[c], n2), n2)[:len(x[c])]
        out[c] = y
    return out*amt

def save(name, st):
    pcm = (np.clip(st.T, -1, 1)*32767).astype('<i2').tobytes()
    p = subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', '-',
                        '-codec:a', 'libmp3lame', '-b:a', '128k', f'out/{name}.mp3'], input=pcm)
    print(name, st.shape[1]/SR, 's', p.returncode)

# 화음 이름 → 음 (루트 MIDI + 구성)
Q = {'M': [0, 4, 7], 'm': [0, 3, 7], 'M7': [0, 4, 7, 11], 'm7': [0, 3, 7, 10], '7': [0, 4, 7, 10], 'add9': [0, 4, 7, 14], 'sus2': [0, 2, 7], 'm9': [0, 3, 7, 10, 14]}
def ch(root, q): return [root + i for i in Q[q]]
