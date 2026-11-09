// 퍼즐·보스 미니게임. 필드 위에 덮어 띄우고, 끝나면 결과를 돌려준다.
// 키보드(WASD·Space·Esc)와 모바일 버튼(조이스틱·A·≡) 모두 같은 입력으로 조작한다.
import Phaser from 'phaser';
import { Input } from '../systems/InputManager';
import { FONT, FONT_B, UIState } from './UIScene';
import { Audio } from '../systems/AudioManager';
import { CHAR_IDS, charById, type CharId } from '../data/characters';

const W = 960, H = 540;

export type PuzzleResult = 'ok' | 'fail' | 'cancel';
export type PuzzleCfg =
  | { kind: 'order'; title: string; desc: string; items: string[]; answer: number[] }
  | { kind: 'dial'; title: string; desc: string; slots: { label: string; options: string[] }[]; answer: number[] | ((st: number[]) => boolean); view?: (st: number[]) => string; start?: number[] }
  | { kind: 'timing'; title: string; desc: string; rounds: number; lives: number; speed: number; zone: number; labels?: string[] }
  | { kind: 'conveyor'; title: string; desc: string; need: number; time: number; items: { label: string; good: boolean }[] }
  | { kind: 'guard'; title: string; desc: string; entries: { text: string; answer: CharId }[]; lives: number };

export function runPuzzle(scene: Phaser.Scene, cfg: PuzzleCfg): Promise<PuzzleResult> {
  return new Promise(res => { UIState.busy = true; scene.scene.launch('Puzzle', { cfg, done: res }); scene.scene.bringToTop('Puzzle'); });
}

export class PuzzleScene extends Phaser.Scene {
  private cfg!: PuzzleCfg;
  private done!: (r: PuzzleResult) => void;
  private msg!: Phaser.GameObjects.Text;
  private over = false;
  // 공용 상태
  private idx = 0; private picked: number[] = []; private st: number[] = []; private lives = 0; private round = 0;
  private t = 0; private cursor = 0; private dir = 1; private zone = [0, 0];
  private belt: { label: string; good: boolean; x: number; obj: Phaser.GameObjects.Text }[] = []; private saved = 0; private timeLeft = 0; private spawnT = 0; private queue: { label: string; good: boolean }[] = [];
  private gfx!: Phaser.GameObjects.Graphics;
  private dyn: Phaser.GameObjects.GameObject[] = [];

  constructor() { super('Puzzle'); }

  create(data: { cfg: PuzzleCfg; done: (r: PuzzleResult) => void }) {
    this.cfg = data.cfg; this.done = data.done; this.over = false;
    this.idx = 0; this.picked = []; this.round = 0; this.t = 0; this.cursor = 0; this.dir = 1; this.belt = []; this.saved = 0; this.dyn = [];
    const g = this.add.graphics();
    g.fillStyle(0x0b0820, 0.78).fillRect(0, 0, W, H);
    g.fillStyle(0x1a1438, 1).fillRect(40, 28, W - 80, H - 56).lineStyle(3, 0xffd66b, 1).strokeRect(40, 28, W - 80, H - 56);
    this.add.text(W / 2, 46, this.cfg.title, { fontFamily: FONT_B, fontSize: '24px', color: '#ffd66b' }).setOrigin(0.5, 0);
    this.add.text(W / 2, 84, this.cfg.desc, { fontFamily: FONT, fontSize: '12px', color: '#e6e0ff', align: 'center', lineSpacing: 4, wordWrap: { width: W - 160, useAdvancedWrap: true } }).setOrigin(0.5, 0);
    this.msg = this.add.text(W / 2, H - 92, '', { fontFamily: FONT, fontSize: '24px', color: '#ffffff', align: 'center' }).setOrigin(0.5);
    this.add.text(W / 2, H - 52, '이동: WASD / 조이스틱 · 결정: SPACE / A · 그만두기: ESC / ≡', { fontFamily: FONT, fontSize: '12px', color: '#8d84bd' }).setOrigin(0.5);
    this.gfx = this.add.graphics();
    const c = this.cfg;
    if (c.kind === 'dial') this.st = c.start ? [...c.start] : c.slots.map(() => 0);
    if (c.kind === 'timing') { this.lives = c.lives; this.newZone(); }
    if (c.kind === 'conveyor') { this.timeLeft = c.time; this.queue = Phaser.Utils.Array.Shuffle([...c.items]); }
    if (c.kind === 'guard') this.lives = c.lives;
    this.draw();
  }

  private finish(r: PuzzleResult) {
    if (this.over) return; this.over = true;
    Audio.sfx(r === 'ok' ? 'star' : r === 'fail' ? 'glitch' : 'menu');
    this.time.delayedCall(r === 'cancel' ? 0 : 700, () => {
      this.scene.stop();
      this.time.delayedCall(0, () => {});
      setTimeout(() => { UIState.busy = false; }, 120);
      this.done(r);
    });
  }
  private say(t: string, col = '#ffffff') { this.msg.setText(t).setColor(col); }
  private clearDyn() { this.dyn.forEach(o => o.destroy()); this.dyn = []; }
  private txt(x: number, y: number, s: string, size = 24, col = '#f5f0ff', o = 0.5) {
    const t = this.add.text(x, y, s, { fontFamily: FONT, fontSize: `${size}px`, color: col, align: 'center' }).setOrigin(o, 0.5); this.dyn.push(t); return t;
  }

  // ---------- 그리기 ----------
  private draw() {
    this.clearDyn(); const g = this.gfx; g.clear();
    const c = this.cfg;
    if (c.kind === 'order') {
      const n = c.items.length, per = Math.min(n, 5), rows = Math.ceil(n / per), cw = 150, ch = 70;
      c.items.forEach((it, i) => {
        const col = i % per, row = Math.floor(i / per);
        const x = W / 2 + (col - (Math.min(per, n - row * per) - 1) / 2) * (cw + 14), y = 190 + row * (ch + 18) + (rows === 1 ? 30 : 0);
        const used = this.picked.indexOf(i);
        g.fillStyle(used >= 0 ? 0x2c2460 : 0x3a2f7a, 1).fillRect(x - cw / 2, y - ch / 2, cw, ch);
        g.lineStyle(3, i === this.idx ? 0xffd66b : 0x6a5cc0, 1).strokeRect(x - cw / 2, y - ch / 2, cw, ch);
        this.txt(x, y, it, it.length > 7 ? 12 : 24, used >= 0 ? '#8d84bd' : '#f5f0ff');
        if (used >= 0) this.txt(x - cw / 2 + 14, y - ch / 2 + 12, String(used + 1), 12, '#ffd66b');
      });
      this.txt(W / 2, 390, `고른 순서: ${this.picked.map(i => c.items[i]).join(' → ') || '-'}`, 12, '#c9c0ef');
    }
    if (c.kind === 'dial') {
      const n = c.slots.length, top = 160, gap = Math.min(52, 200 / n);
      c.slots.forEach((s, i) => {
        const y = top + i * gap, sel = i === this.idx;
        g.fillStyle(sel ? 0x3a2f7a : 0x2a2258, 1).fillRect(160, y - 20, W - 320, 40);
        if (sel) g.lineStyle(2, 0xffd66b, 1).strokeRect(160, y - 20, W - 320, 40);
        this.txt(180, y, s.label, 24, '#c9c0ef', 0);
        this.txt(W - 260, y, `◀ ${s.options[this.st[i]]} ▶`, 24, sel ? '#ffd66b' : '#f5f0ff');
      });
      if (c.view) this.txt(W / 2, top + n * gap + 24, c.view(this.st), 12, '#9fe0c4');
    }
    if (c.kind === 'timing') {
      const x0 = 180, x1 = W - 180, y = 270;
      g.fillStyle(0x2a2258, 1).fillRect(x0, y - 18, x1 - x0, 36);
      g.fillStyle(0x7cf0c8, 0.8).fillRect(x0 + this.zone[0] * (x1 - x0), y - 18, (this.zone[1] - this.zone[0]) * (x1 - x0), 36);
      g.lineStyle(2, 0xf5f0ff, 1).strokeRect(x0, y - 18, x1 - x0, 36);
      g.fillStyle(0xffd66b, 1).fillRect(x0 + this.cursor * (x1 - x0) - 3, y - 28, 6, 56);
      const lab = c.labels?.[this.round] ?? `${this.round + 1} / ${c.rounds}`;
      this.txt(W / 2, 190, lab, 24, '#ffffff');
      this.gauge(c.lives);
    }
    if (c.kind === 'conveyor') {
      g.fillStyle(0x2a2258, 1).fillRect(80, 250, W - 160, 50);
      for (let x = 80; x < W - 80; x += 24) g.fillStyle(0x3a2f7a, 1).fillRect(x + ((this.t * 60) % 24), 296, 12, 4);
      g.lineStyle(3, 0xffd66b, 1).strokeRect(W / 2 - 60, 240, 120, 70);
      this.txt(W / 2, 222, '▼ 백업 집게', 12, '#ffd66b');
      this.txt(W / 2, 360, `백업 ${this.saved} / ${c.need}    남은 시간 ${Math.max(0, Math.ceil(this.timeLeft))}초`, 24, '#ffffff');
      this.txt(W / 2, 396, '중요 파일(★)만 집자. 잘못 집으면 3초가 줄어든다.', 12, '#c9c0ef');
    }
    if (c.kind === 'guard') {
      const e = c.entries[this.round];
      g.fillStyle(0x12081a, 1).fillRect(110, 150, W - 220, 70).lineStyle(2, 0xff5c7a, 1).strokeRect(110, 150, W - 220, 70);
      this.txt(W / 2, 172, `크론: 정리 대상 ${this.round + 1}/${c.entries.length}`, 12, '#ff8aa0');
      this.txt(W / 2, 198, e ? `「${e.text}」` : '', 24, '#ffffff');
      this.txt(W / 2, 246, '누가 이 기억을 지킬까?', 12, '#c9c0ef');
      CHAR_IDS.forEach((id, i) => {
        const x = W / 2 + (i - 4) * 86, y = 314, sel = i === this.idx;
        const img = this.add.image(x, y, `${id}_por`).setDisplaySize(64, 64).setAlpha(sel ? 1 : 0.55); this.dyn.push(img);
        if (sel) g.lineStyle(3, 0xffd66b, 1).strokeRect(x - 35, y - 35, 70, 70);
        this.txt(x, y + 46, charById(id).name, 12, sel ? charById(id).color : '#8d84bd');
      });
      this.gauge(c.lives);
    }
  }
  private gauge(max: number) {
    const g = this.gfx;
    this.txt(W / 2 - 150, 128, '안정도', 12, '#c9c0ef');
    for (let i = 0; i < max; i++) g.fillStyle(i < this.lives ? 0xff7aa8 : 0x3a2f7a, 1).fillRect(W / 2 - 110 + i * 40, 120, 32, 16);
  }

  private newZone() {
    const c = this.cfg as Extract<PuzzleCfg, { kind: 'timing' }>;
    const a = Phaser.Math.FloatBetween(0.1, 0.9 - c.zone); this.zone = [a, a + c.zone];
  }

  update(_t: number, dms: number) {
    if (this.over) return;
    const dt = dms / 1000; this.t += dt;
    const c = this.cfg;
    if (Input.take('menu')) { this.finish('cancel'); return; }
    if (c.kind === 'order') {
      if (Input.take('left') || Input.take('up')) { this.idx = (this.idx + c.items.length - 1) % c.items.length; this.draw(); }
      if (Input.take('right') || Input.take('down')) { this.idx = (this.idx + 1) % c.items.length; this.draw(); }
      if (Input.take('confirm')) {
        if (!this.picked.includes(this.idx)) { this.picked.push(this.idx); Audio.sfx('menu'); }
        if (this.picked.length === c.answer.length) {
          if (this.picked.every((v, i) => v === c.answer[i])) { this.say('맞았다!', '#7cf0c8'); this.draw(); this.finish('ok'); return; }
          this.say('순서가 아니야. 다시 해 보자.', '#ff8aa0'); Audio.sfx('glitch'); this.cameras.main.shake(150, 0.006); this.picked = [];
        }
        this.draw();
      }
    }
    if (c.kind === 'dial') {
      if (Input.take('up')) { this.idx = (this.idx + c.slots.length - 1) % c.slots.length; this.draw(); }
      if (Input.take('down')) { this.idx = (this.idx + 1) % c.slots.length; this.draw(); }
      const n = c.slots[this.idx].options.length;
      if (Input.take('left')) { this.st[this.idx] = (this.st[this.idx] + n - 1) % n; Audio.sfx('blip'); this.draw(); }
      if (Input.take('right')) { this.st[this.idx] = (this.st[this.idx] + 1) % n; Audio.sfx('blip'); this.draw(); }
      if (Input.take('confirm')) {
        const ok = typeof c.answer === 'function' ? c.answer(this.st) : this.st.every((v, i) => v === (c.answer as number[])[i]);
        if (ok) { this.say('맞았다!', '#7cf0c8'); this.finish('ok'); return; }
        this.say('반응이 없다. 다시 맞춰 보자.', '#ff8aa0'); Audio.sfx('glitch'); this.cameras.main.shake(150, 0.006);
      }
    }
    if (c.kind === 'timing') {
      this.cursor += this.dir * dt * c.speed;
      if (this.cursor > 1) { this.cursor = 1; this.dir = -1; } if (this.cursor < 0) { this.cursor = 0; this.dir = 1; }
      if (Input.take('confirm') || Input.take('ability')) {
        if (this.cursor >= this.zone[0] && this.cursor <= this.zone[1]) {
          this.round++; Audio.sfx('dash'); this.cameras.main.shake(120, 0.008); this.say('명중!', '#7cf0c8');
          if (this.round >= c.rounds) { this.draw(); this.finish('ok'); return; }
          this.newZone();
        } else {
          this.lives--; Audio.sfx('glitch'); this.say('빗나갔다! 안정도가 떨어졌다.', '#ff8aa0');
          if (this.lives <= 0) { this.draw(); this.finish('fail'); return; }
        }
      }
      this.draw();
    }
    if (c.kind === 'conveyor') {
      this.timeLeft -= dt; this.spawnT -= dt;
      if (this.spawnT <= 0 && this.queue.length) {
        this.spawnT = 1.05; const it = this.queue.shift()!; this.queue.push(it);
        const obj = this.add.text(70, 275, (it.good ? '★ ' : '') + it.label, { fontFamily: FONT, fontSize: '12px', color: it.good ? '#ffd66b' : '#c9c0ef', backgroundColor: '#0b0820', padding: { x: 4, y: 3 } }).setOrigin(0.5);
        this.belt.push({ ...it, x: 70, obj });
      }
      for (const b of this.belt) { b.x += dt * 150; b.obj.setX(b.x); }
      this.belt = this.belt.filter(b => { if (b.x > W - 60) { b.obj.destroy(); return false; } return true; });
      if (Input.take('confirm') || Input.take('ability')) {
        const hit = this.belt.find(b => Math.abs(b.x - W / 2) < 62);
        if (!hit) this.say('집게가 허공을 집었다.', '#c9c0ef');
        else {
          hit.obj.destroy(); this.belt = this.belt.filter(b => b !== hit);
          if (hit.good) { this.saved++; Audio.sfx('get'); this.say(`「${hit.label}」 백업 완료!`, '#7cf0c8'); }
          else { this.timeLeft -= 3; Audio.sfx('glitch'); this.say('정리 대상 파일이었다! 3초 손해.', '#ff8aa0'); }
        }
      }
      if (this.saved >= c.need) { this.belt.forEach(b => b.obj.destroy()); this.belt = []; this.draw(); this.finish('ok'); return; }
      if (this.timeLeft <= 0) { this.belt.forEach(b => b.obj.destroy()); this.belt = []; this.draw(); this.finish('fail'); return; }
      this.draw();
    }
    if (c.kind === 'guard') {
      if (Input.take('left')) { this.idx = (this.idx + 8) % 9; this.draw(); }
      if (Input.take('right')) { this.idx = (this.idx + 1) % 9; this.draw(); }
      if (Input.take('up')) { this.idx = (this.idx + 5) % 9; this.draw(); }
      if (Input.take('down')) { this.idx = (this.idx + 4) % 9; this.draw(); }
      if (Input.take('confirm')) {
        const e = c.entries[this.round];
        if (CHAR_IDS[this.idx] === e.answer) {
          this.round++; Audio.sfx('star'); this.say(`${charById(e.answer).name}: 이건 내가 지킬게!`, charById(e.answer).color);
          if (this.round >= c.entries.length) { this.draw(); this.finish('ok'); return; }
        } else {
          this.lives--; Audio.sfx('glitch'); this.cameras.main.shake(150, 0.008); this.say('기억이 흔들린다… 이 기억을 만든 사람이 아니야.', '#ff8aa0');
          if (this.lives <= 0) { this.draw(); this.finish('fail'); return; }
        }
        this.draw();
      }
    }
  }
}
