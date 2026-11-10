// BGM·효과음. 음원 파일 없이 WebAudio로 칩튠을 직접 합성한다. (P6에서 실제 음원으로 교체 가능)
type Track = 'title' | 'village' | 'night';
type Sfx = 'blip' | 'get' | 'quest' | 'cloud' | 'dash' | 'switch' | 'glitch' | 'menu' | 'star' | 'save' | 'warp' | 'arrive';

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const MUTE_KEY = 'last-save:muted';

// 구름 마을: 오르골 왈츠 (3/4, 8분음표 6칸 = 1마디)
const VILLAGE = {
  bpm: 112, steps: 6,
  bars: [
    { bass: 48, chord: [60, 64, 67], mel: [76, 0, 79, 0, 84, 83] },
    { bass: 45, chord: [57, 60, 64], mel: [81, 0, 76, 0, 72, 0] },
    { bass: 41, chord: [53, 57, 60], mel: [77, 0, 81, 0, 84, 0] },
    { bass: 43, chord: [55, 59, 62], mel: [83, 81, 79, 0, 74, 0] },
    { bass: 48, chord: [60, 64, 67], mel: [76, 0, 79, 0, 84, 86] },
    { bass: 40, chord: [52, 55, 59], mel: [83, 0, 79, 0, 76, 0] },
    { bass: 41, chord: [53, 57, 60], mel: [77, 81, 84, 0, 83, 79] },
    { bass: 48, chord: [60, 64, 67], mel: [84, 0, 0, 0, 0, 0] },
  ],
};
// 밤 지역: 느린 단조 오르골
const NIGHT = {
  bpm: 84, steps: 6,
  bars: [
    { bass: 45, chord: [57, 60, 64], mel: [76, 0, 72, 0, 69, 0] },
    { bass: 41, chord: [53, 57, 60], mel: [77, 0, 76, 0, 72, 0] },
    { bass: 43, chord: [55, 59, 62], mel: [74, 0, 71, 0, 67, 0] },
    { bass: 40, chord: [52, 56, 59], mel: [76, 0, 75, 0, 71, 0] },
  ],
};
// 타이틀: 느린 아르페지오
const TITLE = {
  bpm: 76, steps: 8,
  bars: [
    { bass: 45, chord: [57, 60, 64], mel: [69, 72, 76, 81, 76, 72, 0, 0] },
    { bass: 41, chord: [53, 57, 60], mel: [65, 69, 72, 77, 72, 69, 0, 0] },
    { bass: 48, chord: [55, 60, 64], mel: [67, 72, 76, 79, 76, 72, 0, 0] },
    { bass: 43, chord: [55, 59, 62], mel: [67, 71, 74, 79, 83, 79, 74, 0] },
  ],
};

/** 음원 파일이 있으면 합성음 대신 재생: assets/audio/bgm/<키>.ogg|mp3|m4a */
const FILES = import.meta.glob('../assets/audio/bgm/*.{ogg,mp3,m4a,wav}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const fileFor = (k: string) => Object.entries(FILES).find(([p]) => p.split('/').pop()!.replace(/\.[^.]+$/, '') === k)?.[1];
/** 음원이 없을 때 쓰는 합성곡 */
const FALLBACK: Record<string, Track> = {
  title: 'title', village: 'village', cloud: 'village', studio: 'title', lastsave: 'title',
  mirror: 'night', garden: 'night', shadow: 'night', data: 'night',
  park: 'village', station: 'village', photo: 'village', trash: 'village',
};

class AudioImpl {
  private el?: HTMLAudioElement;
  private wanted: string | null = null;
  private ctx?: AudioContext;
  private master?: GainNode;
  private music?: GainNode;
  private noise?: AudioBuffer;
  private track: Track | null = null;
  private step = 0;
  private nextT = 0;
  private timer?: number;
  muted = false;

  constructor() {
    try { this.muted = localStorage.getItem(MUTE_KEY) === '1'; } catch { /* 무시 */ }
    const unlock = () => { this.ensure(); this.ctx?.resume(); };
    window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock);
  }

  private ensure() {
    if (this.ctx) return;
    try { this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { return; }
    this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.5; this.master.connect(this.ctx.destination);
    this.music = this.ctx.createGain(); this.music.gain.value = 0.55; this.music.connect(this.master);
    this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.4, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    if (this.track) this.startLoop();
  }

  setMuted(m: boolean) {
    this.muted = m;
    try { localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch { /* 무시 */ }
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
    if (this.el) this.el.volume = m ? 0 : 0.45;
  }

  private tone(f: number, t: number, dur: number, type: OscillatorType, vol: number, out?: AudioNode, to?: number) {
    const c = this.ctx!; const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out ?? this.master!); o.start(t); o.stop(t + dur + 0.03);
  }
  private hiss(t: number, dur: number, vol: number, hp: number) {
    const c = this.ctx!; const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise!; f.type = 'highpass'; f.frequency.value = hp;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master!); s.start(t); s.stop(t + dur + 0.02);
  }

  bgm(key: string | null) {
    if (key === this.wanted) return;
    this.wanted = key;
    const ALIAS: Record<string, string> = { title: 'studio', cloud: 'village' };
    const url = key ? (fileFor(key) ?? (ALIAS[key] ? fileFor(ALIAS[key]) : undefined)) : undefined;
    if (this.el) { const old = this.el; this.el = undefined; this.fade(old, 0, 500, () => old.pause()); }
    if (url) {
      this.stopSynth();
      const el = new window.Audio(url); el.loop = true; el.volume = 0; this.el = el;
      if (!this.muted) this.fade(el, 0.45, 900);
      el.play().catch(() => { const go = () => { if (this.el === el) el.play().catch(() => {}); }; window.addEventListener('pointerdown', go, { once: true }); window.addEventListener('keydown', go, { once: true }); });
      return;
    }
    this.synth(key ? (FALLBACK[key] ?? 'village') : null);
  }
  /** 음원 볼륨을 천천히 바꾼다 (지역 전환 크로스페이드) */
  private fade(el: HTMLAudioElement, to: number, ms: number, done?: () => void) {
    const from = el.volume, t0 = performance.now();
    const id = window.setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      try { el.volume = Math.max(0, Math.min(1, from + (to - from) * k)); } catch { /* 무시 */ }
      if (k >= 1) { clearInterval(id); done?.(); }
    }, 40);
  }
  private stopSynth() { this.track = null; if (this.timer) { clearInterval(this.timer); this.timer = undefined; } }
  private synth(name: Track | null) {
    if (name === this.track) return;
    this.track = name;
    if (this.timer) { clearInterval(this.timer); this.timer = undefined; }
    if (name && this.ctx) this.startLoop();
  }
  private startLoop() {
    this.step = 0; this.nextT = this.ctx!.currentTime + 0.1;
    this.timer = window.setInterval(() => this.pump(), 50);
  }
  private pump() {
    if (!this.ctx || !this.track) return;
    const song = this.track === 'title' ? TITLE : this.track === 'night' ? NIGHT : VILLAGE;
    const stepDur = 60 / song.bpm / 2;
    while (this.nextT < this.ctx.currentTime + 0.2) {
      const bar = song.bars[Math.floor(this.step / song.steps) % song.bars.length], i = this.step % song.steps, t = this.nextT;
      const m = bar.mel[i];
      if (this.track === 'village' || this.track === 'night') {
        if (m) { this.tone(mtof(m), t, 0.5, 'triangle', 0.22, this.music); this.tone(mtof(m + 12), t, 0.25, 'sine', 0.05, this.music); }
        if (i === 0) this.tone(mtof(bar.bass), t, stepDur * 2, 'triangle', 0.3, this.music);
        if (i === 2 || i === 4) bar.chord.forEach(n => this.tone(mtof(n), t, stepDur * 1.4, 'square', 0.018, this.music));
      } else {
        if (m) this.tone(mtof(m), t, 1.2, 'triangle', 0.14, this.music);
        if (i === 0) { this.tone(mtof(bar.bass), t, stepDur * 8, 'sine', 0.22, this.music); bar.chord.forEach(n => this.tone(mtof(n), t, stepDur * 8, 'sine', 0.03, this.music)); }
      }
      this.nextT += stepDur; this.step++;
    }
  }

  sfx(name: Sfx) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    switch (name) {
      case 'blip': this.tone(1100 + Math.random() * 80, t, 0.035, 'square', 0.025); break;
      case 'menu': this.tone(880, t, 0.05, 'square', 0.05); break;
      case 'get': this.tone(mtof(84), t, 0.09, 'square', 0.08); this.tone(mtof(91), t + 0.07, 0.16, 'square', 0.08); break;
      case 'quest': [72, 76, 79, 84].forEach((n, i) => this.tone(mtof(n), t + i * 0.08, 0.25, 'triangle', 0.18)); break;
      case 'cloud': this.tone(300, t, 0.35, 'sine', 0.2, undefined, 900); this.hiss(t, 0.3, 0.05, 3000); break;
      case 'dash': this.hiss(t, 0.25, 0.35, 200); this.tone(160, t, 0.2, 'square', 0.12, undefined, 50); break;
      case 'switch': this.tone(mtof(79), t, 0.08, 'triangle', 0.15); this.tone(mtof(86), t + 0.06, 0.12, 'triangle', 0.15); break;
      case 'glitch': this.hiss(t, 0.3, 0.25, 800); for (let i = 0; i < 5; i++) this.tone(100 + Math.random() * 900, t + i * 0.04, 0.05, 'square', 0.06); break;
      case 'star': [79, 84, 88, 91, 96].forEach((n, i) => this.tone(mtof(n), t + i * 0.09, 0.6, 'triangle', 0.15)); break;
      case 'warp': this.tone(220, t, 0.55, 'sine', 0.14, undefined, 1400); this.hiss(t, 0.5, 0.06, 2500); [84, 88, 91].forEach((n, i) => this.tone(mtof(n), t + 0.12 + i * 0.07, 0.3, 'triangle', 0.06)); break;
      case 'arrive': [76, 83, 88].forEach((n, i) => this.tone(mtof(n), t + i * 0.12, 0.7, 'sine', 0.1)); break;
      case 'save': this.tone(mtof(88), t, 0.15, 'sine', 0.15); this.tone(mtof(95), t + 0.12, 0.4, 'sine', 0.15); break;
    }
  }
}

export const Audio = new AudioImpl();
