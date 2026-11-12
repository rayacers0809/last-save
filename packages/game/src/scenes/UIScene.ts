// 대화창, HUD, 토스트, 메뉴. 다른 씬 위에 항상 떠 있다.
import Phaser from 'phaser';
import { Input } from '../systems/InputManager';
import { Story1, type Line } from '../systems/StoryRunner';
import { Bus, GameState } from '../systems/GameState';
import { charById, CHAR_IDS, type CharId } from '../data/characters';
import { Audio } from '../systems/AudioManager';
import { folkName, folkPortrait } from '../data/folks';
import { NOTE_TOTAL, countNotes } from '../data/quests';

export const UIState = { busy: false };
export const FONT = 'Galmuri11, "Apple SD Gothic Neo", sans-serif';
export const FONT_B = 'Galmuri11Bold, Galmuri11, sans-serif';

const W = 960, H = 540;

/** 대화를 실행하고 끝나면 지나간 태그 목록을 돌려준다 */
export function runDialogue(knot: string): Promise<string[]> {
  return new Promise(res => Bus.emit('dialogue', knot, res));
}
export function toast(text: string) { Bus.emit('toast', text); }

interface MenuOpt { label: string; act: () => void; icon?: string }
export interface GuideInfo { sx: number; sy: number; lx: number; ly: number; lift: number; label: string; tip: string; far: boolean }
/** 메뉴 위에 깔리는 아이콘 칸 (가방) */
export interface GridCell { icon: string; name: string; count?: number; desc?: string; on?: boolean }

export class UIScene extends Phaser.Scene {
  private box!: Phaser.GameObjects.Container;
  private boxBg!: Phaser.GameObjects.Graphics;
  private por!: Phaser.GameObjects.Image;
  private porFrame!: Phaser.GameObjects.Graphics;
  private nameT!: Phaser.GameObjects.Text;
  private bodyT!: Phaser.GameObjects.Text;
  private moreT!: Phaser.GameObjects.Text;
  private choiceBox!: Phaser.GameObjects.Container;

  private hud!: Phaser.GameObjects.Container;
  private hudPor!: Phaser.GameObjects.Image;
  private hudName!: Phaser.GameObjects.Text;
  private hudAbility!: Phaser.GameObjects.Text;
  private hudTime!: Phaser.GameObjects.Text;
  private hudParty!: Phaser.GameObjects.Text;

  private menuBox!: Phaser.GameObjects.Container;
  private menuOpts: MenuOpt[] = [];
  private menuIdx = 0;
  private menuTexts: Phaser.GameObjects.Text[] = [];

  private full = ''; private shown = 0; private typing = false; private typeAcc = 0;
  private choiceIdx = 0; private choiceTexts: Phaser.GameObjects.Text[] = []; private choosing = false;
  private active = false; private tags: string[] = []; private done: ((t: string[]) => void) | null = null;
  private tapQueued = false;

  constructor() { super({ key: 'UI', active: false }); }

  create() {
    // 대화창
    this.box = this.add.container(0, 0).setVisible(false).setDepth(10);
    this.boxBg = this.add.graphics();
    this.porFrame = this.add.graphics();
    this.por = this.add.image(96, 448, 'rumung_por').setDisplaySize(104, 104);
    this.nameT = this.add.text(168, 384, '', { fontFamily: FONT_B, fontSize: '24px', color: '#ffffff' });
    this.bodyT = this.add.text(168, 420, '', { fontFamily: FONT, fontSize: '24px', color: '#f5f0ff', lineSpacing: 8, wordWrap: { width: 740, useAdvancedWrap: true } });
    this.moreT = this.add.text(W - 60, H - 52, '▼', { fontFamily: FONT, fontSize: '24px', color: '#ffd66b' });
    this.box.add([this.boxBg, this.porFrame, this.por, this.nameT, this.bodyT, this.moreT]);
    this.choiceBox = this.add.container(0, 0).setDepth(11).setVisible(false);
    this.tweens.add({ targets: this.moreT, alpha: 0, duration: 400, yoyo: true, repeat: -1 });

    // HUD
    this.hud = this.add.container(0, 0).setVisible(false).setDepth(5);
    const hg = this.add.graphics();
    hg.fillStyle(0x1a1438, 0.82).fillRect(12, 12, 236, 64).lineStyle(2, 0xf5f0ff, 1).strokeRect(12, 12, 236, 64);
    hg.fillStyle(0x1a1438, 0.82).fillRect(W - 312, 12, 300, 64).lineStyle(2, 0xf5f0ff, 1).strokeRect(W - 312, 12, 300, 64);
    this.hudPor = this.add.image(44, 44, 'rumung_por').setDisplaySize(52, 52);
    this.hudName = this.add.text(80, 20, '', { fontFamily: FONT_B, fontSize: '24px' });
    this.hudAbility = this.add.text(80, 50, '', { fontFamily: FONT, fontSize: '12px', color: '#c9c0ef' });
    this.hudTime = this.add.text(W - 300, 20, '', { fontFamily: FONT_B, fontSize: '24px', color: '#ffd66b' });
    this.hudParty = this.add.text(W - 300, 50, '', { fontFamily: FONT, fontSize: '12px', color: '#c9c0ef' });
    this.hud.add([hg, this.hudPor, this.hudName, this.hudAbility, this.hudTime, this.hudParty]);

    this.menuBox = this.add.container(0, 0).setDepth(20).setVisible(false);

    Bus.on('dialogue', (knot: string, res: (t: string[]) => void) => this.startDialogue(knot, res));
    Bus.on('lines', (lines: { name: string; por: string; text: string }[], res: () => void) => {
      this.extLines = lines.slice(); this.active = true; UIState.busy = true; this.tags = []; this.done = () => res();
      this.box.setVisible(true); this.step();
    });
    Bus.on('toast', (t: string) => this.showToast(t));
    Bus.on('guide', (g: GuideInfo | null) => this.drawGuide(g));
    Bus.on('hud', (on: boolean) => { if (!on) this.drawGuide(null); });
    Bus.on('item-get', (k: string, n: number) => this.itemPop(k, n));
    Bus.on('wipe', (dir: 'out' | 'in', done?: () => void) => this.wipe(dir, done));
    Bus.on('title-card', (kicker: string, name: string, sub?: string) => this.titleCard(kicker, name, sub));
    Bus.on('hud', (on: boolean) => { this.hud.setVisible(on); this.refreshHud(); });
    Bus.on('hud-refresh', () => this.refreshHud());
    Bus.on('ui-reset', () => {
      this.active = false; this.choosing = false; this.box.setVisible(false); this.choiceBox.setVisible(false).removeAll(true);
      this.menuBox.setVisible(false).removeAll(true); UIState.busy = false;
      const d = this.done; this.done = null; d?.(this.tags);
    });
    Bus.on('menu', (title: string, opts: MenuOpt[], body?: string, grid?: GridCell[]) => this.openMenu(title, opts, body, grid));

    this.input.on('pointerdown', () => { if (this.active && !this.choosing) this.tapQueued = true; });
  }

  // ---------- HUD ----------
  private refreshHud() {
    const d = GameState.data, c = charById(d.leader);
    this.hudPor.setTexture(`${c.id}_por`).setDisplaySize(52, 52);
    this.hudName.setText(c.name).setColor(c.color);
    this.hudAbility.setText(`Q · ${c.ability}${c.id === 'bigwin' ? ` (${GameState.bwCharges()}/${GameState.bwMax()})` : ''}`);
    const h = Math.max(0, Math.floor(d.hoursLeft)), m = Math.round((d.hoursLeft - h) * 60);
    this.hudTime.setText(`초기화까지 ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    this.hudParty.setText(`동료 ${d.party.length}/9 · 기억 ${d.memories?.world ?? 0}/8 · 핵심 ${d.memories?.core?.length ?? 0} · 노트 ${countNotes(d.bugNotes)}/${NOTE_TOTAL}`);
  }

  // ---------- 토스트 ----------
  private toasts: Phaser.GameObjects.Text[] = [];
  private showToast(text: string) {
    const t = this.add.text(W / 2, 0, text, {
      fontFamily: FONT, fontSize: '24px', color: '#ffffff', backgroundColor: '#1a1438ee',
      padding: { x: 14, y: 8 }, wordWrap: { width: 760, useAdvancedWrap: true }, align: 'center',
    }).setOrigin(0.5, 0).setDepth(30).setAlpha(0);
    if (this.toasts.length >= 3) { const old = this.toasts.shift()!; old.destroy(); }
    this.toasts.push(t);
    this.layoutToasts();
    this.tweens.add({ targets: t, alpha: 1, duration: 160 });
    this.tweens.add({ targets: t, alpha: 0, delay: 2400, duration: 300, onComplete: () => { this.toasts = this.toasts.filter(x => x !== t); t.destroy(); this.layoutToasts(); } });
  }
  private layoutToasts() {
    let y = this.guideBox?.visible ? 136 : 84;
    for (const t of this.toasts) { this.tweens.add({ targets: t, y, duration: 120 }); y += t.height + 6; }
  }

  // ---------- 대화 ----------
  private startDialogue(knot: string, res: (t: string[]) => void) {
    this.active = true; UIState.busy = true; this.tags = []; this.done = res;
    Story1.go(knot);
    this.box.setVisible(true);
    this.step();
  }

  private extLines: { name: string; por: string; text: string }[] | null = null;
  private step() {
    if (this.extLines) {
      const l = this.extLines.shift();
      if (!l) { this.extLines = null; this.finish(); return; }
      this.show({ speaker: '__ext', text: l.text, tags: [] }, l);
      return;
    }
    const line = Story1.next();
    if (line) { this.show(line); return; }
    const ch = Story1.choices();
    if (ch.length) { this.showChoices(ch.map(c => c.text)); return; }
    this.finish();
  }

  private show(l: Line, ext?: { name: string; por: string }) {
    this.tags.push(...l.tags);
    l.tags.forEach(t => Bus.emit('tag', t));
    const who = l.speaker === 'me' ? GameState.data.firstPlayer : l.speaker;
    const g = this.boxBg; g.clear();
    const sys = who === 'sys', narr = who === 'narr', point = who === 'point';
    g.fillStyle(sys ? 0x12081a : 0x1a1438, 0.95).fillRect(24, 370, W - 48, 150);
    g.lineStyle(2, sys ? 0xff5c7a : 0xf5f0ff, 1).strokeRect(24, 370, W - 48, 150);
    const portrait = !sys && !narr;
    this.por.setVisible(portrait); this.porFrame.clear();
    const expr = l.tags.find(t => t.startsWith('e_'))?.slice(2);
    const fitPor = (key: string) => { this.por.setTexture(key); const f = this.por.frame; const k = Math.min(104 / f.width, 104 / f.height); this.por.setDisplaySize(f.width * k, f.height * k); };
    if (portrait) {
      if (point) fitPor(folkPortrait(this, 'point', expr) ?? 'point_por');
      else if (CHAR_IDS.includes(who as CharId)) this.por.setTexture(`${who}_por`).setDisplaySize(104, 104);
      this.porFrame.lineStyle(2, 0x6a5cc0, 1).strokeRect(43, 395, 106, 106);
    }
    let name = '', color = '#ffffff';
    const folk = !CHAR_IDS.includes(who as CharId) && !point && !sys && !narr;
    if (ext) { name = ext.name; color = '#cfe0ff'; fitPor(folkPortrait(this, ext.por.replace(/^folk_/, ''), expr) ?? ext.por); }
    else if (point) { name = '포인트'; color = '#ffe27a'; }
    else if (folk) {
      name = folkName(who); color = who === 'cron' ? '#9aa6ff' : '#cfe0ff';
      fitPor(folkPortrait(this, who, expr) ?? 'point_por');
    }
    else if (!sys && !narr) { const c = charById(who as CharId); name = c.name; color = c.color; }
    this.nameT.setText(name).setColor(color).setX(portrait ? 168 : 56);
    this.bodyT.setX(portrait ? 168 : 56).setY(name ? 420 : 392)
      .setColor(sys ? '#ff8aa0' : narr ? '#c9c0ef' : '#f5f0ff')
      .setWordWrapWidth(portrait ? 740 : 850, true);
    this.full = l.text; this.shown = 0; this.typing = true; this.typeAcc = 0; this.bodyT.setText('');
    this.moreT.setVisible(false);
  }

  private showChoices(list: string[]) {
    this.choosing = true; this.choiceIdx = 0; this.choiceBox.removeAll(true); this.choiceTexts = [];
    const w = 360, h = 44 * list.length + 16, x = W - 24 - w, y = 370 - h - 8;
    const g = this.add.graphics();
    g.fillStyle(0x241b4a, 0.97).fillRect(x, y, w, h).lineStyle(2, 0xffd66b, 1).strokeRect(x, y, w, h);
    this.choiceBox.add(g);
    list.forEach((txt, i) => {
      const t = this.add.text(x + 20, y + 14 + i * 44, txt, { fontFamily: FONT, fontSize: '24px', color: '#f5f0ff', fixedWidth: w - 40 })
        .setInteractive({ useHandCursor: true });
      t.on('pointerover', () => { this.choiceIdx = i; this.paintChoices(); });
      t.on('pointerdown', () => { this.choiceIdx = i; this.pickChoice(); });
      this.choiceTexts.push(t); this.choiceBox.add(t);
    });
    this.choiceBox.setVisible(true); this.paintChoices();
  }
  private paintChoices() {
    this.choiceTexts.forEach((t, i) => {
      const raw = t.text.replace(/^▶ /, '');
      t.setText(i === this.choiceIdx ? `▶ ${raw}` : raw).setColor(i === this.choiceIdx ? '#ffd66b' : '#f5f0ff');
    });
  }
  private pickChoice() {
    Audio.sfx('menu');
    const i = this.choiceIdx; this.choosing = false; this.choiceBox.setVisible(false).removeAll(true);
    Story1.choose(i); this.step();
  }

  private finish() {
    this.active = false; this.box.setVisible(false);
    this.time.delayedCall(120, () => { if (!this.active && !this.menuBox.visible) UIState.busy = false; });
    const d = this.done; this.done = null; d?.(this.tags);
  }

  // ---------- 메뉴 ----------
  // ---------- 길 안내 ----------
  private guideBox?: Phaser.GameObjects.Container;
  private guideLabel?: Phaser.GameObjects.Text;
  private guideTip?: Phaser.GameObjects.Text;
  private guideArrow?: Phaser.GameObjects.Container;
  private drawGuide(g: GuideInfo | null) {
    if (!this.guideBox) {
      this.guideLabel = this.add.text(0, 0, '', { fontFamily: FONT_B, fontSize: '18px', color: '#ffd66b', stroke: '#160f33', strokeThickness: 5 }).setOrigin(0, 0);
      this.guideTip = this.add.text(0, 26, '', { fontFamily: FONT, fontSize: '15px', color: '#7cf0c8', stroke: '#160f33', strokeThickness: 4, wordWrap: { width: 420, useAdvancedWrap: true } }).setOrigin(0, 0);
      this.guideBox = this.add.container(16, 86, [this.guideLabel, this.guideTip]).setDepth(25);
      const tri = this.add.triangle(0, 0, 0, -14, 22, 0, 0, 14, 0xffd66b).setStrokeStyle(3, 0x160f33);
      const dot = this.add.circle(-6, 0, 3, 0x160f33);
      this.guideArrow = this.add.container(0, 0, [tri, dot]).setDepth(25);
      this.tweens.add({ targets: tri, scale: 1.18, duration: 450, yoyo: true, repeat: -1 });
    }
    const on = !!g && this.hud.visible && !UIState.busy;
    this.guideBox.setVisible(on); this.guideArrow!.setVisible(false);
    if (!g || !on) return;
    this.guideLabel!.setText(`▶ ${g.label}`);
    this.guideTip!.setText(g.tip).setVisible(!!g.tip);
    if (!g.far) return;
    const M = 46, inside = g.sx > M && g.sx < W - M && g.sy > 140 && g.sy < H - M;
    const a = this.guideArrow!;
    if (inside) {
      // 화면 안: 목표 바로 위에서 아래를 가리킨다
      a.setPosition(g.sx, g.sy - g.lift).setRotation(Math.PI / 2).setVisible(true);
    } else {
      const ang = Math.atan2(g.sy - g.ly, g.sx - g.lx);
      const cx = W / 2, cy = (H + 140) / 2, hw = W / 2 - M, hh = (H - 140) / 2 - M;
      const k = Math.min(hw / Math.abs(Math.cos(ang) || 1e-6), hh / Math.abs(Math.sin(ang) || 1e-6));
      a.setPosition(cx + Math.cos(ang) * k, cy + Math.sin(ang) * k).setRotation(ang).setVisible(true);
    }
  }

  // ---------- 지역 전환 ----------
  private wipeG?: Phaser.GameObjects.Graphics;
  private wipeCells: { x: number; y: number; t: number; star: boolean }[] = [];
  /** 픽셀 마름모가 대각선으로 번지며 화면을 덮고(out) 걷히는(in) 전환 */
  private wipe(dir: 'out' | 'in', done?: () => void) {
    const S = 40;
    if (!this.wipeCells.length) for (let y = 0; y <= H / S; y++) for (let x = 0; x <= W / S; x++)
      this.wipeCells.push({ x: x * S + S / 2, y: y * S + S / 2, t: ((x / (W / S)) * 0.55 + (y / (H / S)) * 0.25) + Math.random() * 0.2, star: Math.random() < 0.06 });
    this.wipeG?.destroy();
    const g = this.wipeG = this.add.graphics().setDepth(5000);
    const draw = (p: number) => {
      g.clear();
      for (const c of this.wipeCells) {
        let k = Math.max(0, Math.min(1, (p - c.t * 0.8) / 0.2));
        if (dir === 'in') k = 1 - Math.max(0, Math.min(1, (p - c.t * 0.8) / 0.2));
        if (k <= 0) continue;
        const r = (S * 0.75) * k;
        g.fillStyle(0x0f0a26, 1).fillPoints([{ x: c.x, y: c.y - r }, { x: c.x + r, y: c.y }, { x: c.x, y: c.y + r }, { x: c.x - r, y: c.y }], true);
        if (c.star && k > 0.4 && k < 1) g.fillStyle(0xffd66b, k).fillRect(c.x - 2, c.y - 2, 4, 4);
      }
    };
    draw(0);
    this.tweens.addCounter({ from: 0, to: 1, duration: dir === 'out' ? 520 : 620, ease: 'Sine.inOut', onUpdate: tw => draw(tw.getValue()),
      onComplete: () => { if (dir === 'in') { g.destroy(); if (this.wipeG === g) this.wipeG = undefined; } else draw(1); done?.(); } });
  }
  /** 아이템을 얻으면 화면 가운데(플레이어 위)에서 아이콘이 튀어 올라 HUD 쪽으로 날아간다 */
  private popCount = 0;
  private itemPop(k: string, n: number) {
    if (!this.textures.exists(`item_${k}`)) return;
    const i = this.popCount++ % 4, x = W / 2 + (i - 1.5) * 26, y = H / 2 - 40;
    const ic = this.add.image(x, y, `item_${k}`).setDepth(4500).setDisplaySize(8, 8).setAlpha(0);
    const tx = this.add.text(x, y - 34, n > 1 ? `+${n}` : '+1', { fontFamily: FONT_B, fontSize: '16px', color: '#ffd66b', stroke: '#160f33', strokeThickness: 4 }).setOrigin(0.5).setDepth(4501).setAlpha(0);
    this.tweens.chain({ targets: ic, tweens: [
      { displayWidth: 56, displayHeight: 56, alpha: 1, y: y - 18, duration: 260, ease: 'Back.out' },
      { y: y - 24, duration: 420 },
      { x: W - 150, y: 46, displayWidth: 20, displayHeight: 20, alpha: 0.2, duration: 520, ease: 'Cubic.in', onComplete: () => ic.destroy() },
    ] });
    this.tweens.add({ targets: tx, alpha: 1, y: y - 50, duration: 300, yoyo: true, hold: 500, onComplete: () => tx.destroy() });
    for (let j = 0; j < 8; j++) {
      const a = (j / 8) * Math.PI * 2, sp = this.add.rectangle(x, y - 18, 4, 4, 0xfff6d6).setDepth(4499);
      this.tweens.add({ targets: sp, x: x + Math.cos(a) * 40, y: y - 18 + Math.sin(a) * 40, alpha: 0, duration: 500, ease: 'Cubic.out', onComplete: () => sp.destroy() });
    }
  }
  /** 도착한 지역 이름 카드 */
  private titleCard(kicker: string, name: string, sub = '') {
    const c = this.add.container(W / 2, 118).setDepth(4000).setAlpha(0);
    const k = this.add.text(0, -26, kicker, { fontFamily: FONT, fontSize: '16px', color: '#ffd66b' }).setOrigin(0.5);
    const t = this.add.text(0, 6, name, { fontFamily: FONT_B, fontSize: '32px', color: '#f5f0ff', stroke: '#160f33', strokeThickness: 6 }).setOrigin(0.5);
    const lw = t.width / 2 + 40;
    const g = this.add.graphics();
    g.fillStyle(0xffd66b, 1).fillRect(-lw, 32, lw - 14, 2).fillRect(14, 32, lw - 14, 2);
    g.fillPoints([{ x: 0, y: 27 }, { x: 6, y: 33 }, { x: 0, y: 39 }, { x: -6, y: 33 }], true);
    c.add([g, k, t]);
    if (sub) c.add(this.add.text(0, 50, sub, { fontFamily: FONT, fontSize: '17px', color: '#e6e0ff', stroke: '#160f33', strokeThickness: 5 }).setOrigin(0.5, 0));
    this.tweens.add({ targets: c, alpha: 1, y: 128, duration: 500, ease: 'Sine.out' });
    this.tweens.add({ targets: c, alpha: 0, y: 112, delay: sub ? 3300 : 2300, duration: 600, onComplete: () => c.destroy() });
  }

  private grid: GridCell[] = [];
  private gridIdx = 0;
  private gridFrames: Phaser.GameObjects.Rectangle[] = [];
  private gridCap?: Phaser.GameObjects.Text;
  private openMenu(title: string, opts: MenuOpt[], body?: string, grid?: GridCell[]) {
    UIState.busy = true; this.menuOpts = opts; this.menuIdx = 0; this.menuBox.removeAll(true); this.menuTexts = [];
    this.grid = grid ?? []; this.gridIdx = 0; this.gridFrames = []; this.gridCap = undefined;
    Audio.sfx('menu');
    const w = body || this.grid.length ? 640 : 460;
    const gCols = 8, cell = 72, gRows = Math.ceil(this.grid.length / gCols);
    const gridH = this.grid.length ? gRows * cell + 52 : 0;
    const bodyT = body ? this.add.text(W / 2, 0, body, { fontFamily: FONT, fontSize: this.grid.length ? '16px' : '24px', color: '#e6e0ff', lineSpacing: 6, wordWrap: { width: w - 64, useAdvancedWrap: true } }).setOrigin(0.5, 0) : null;
    const bodyH = bodyT ? Math.min(300 - gridH / 2, bodyT.height) + 20 : 0;
    const cols = opts.length > 7 || (this.grid.length && opts.length > 2) ? 2 : 1, rowH = this.grid.length ? 38 : 44, perCol = Math.ceil(opts.length / cols);
    const w2 = cols === 2 ? Math.max(w, 720) : w;
    const h = 80 + gridH + bodyH + perCol * rowH, x = (W - w2) / 2, y = Math.max(12, (H - h) / 2);
    const g = this.add.graphics();
    g.fillStyle(0x0b0820, 0.6).fillRect(0, 0, W, H);
    g.fillStyle(0x1a1438, 1).fillRect(x, y, w2, h).lineStyle(2, 0xf5f0ff, 1).strokeRect(x, y, w2, h);
    this.menuBox.add(g);
    this.menuBox.add(this.add.text(W / 2, y + 22, title, { fontFamily: FONT_B, fontSize: '24px', color: '#ffd66b' }).setOrigin(0.5, 0));
    if (this.grid.length) {
      const gx = W / 2 - (Math.min(gCols, this.grid.length) * cell) / 2;
      this.grid.forEach((c, i) => {
        const cx = gx + (i % gCols) * cell + cell / 2, cy = y + 64 + Math.floor(i / gCols) * cell + cell / 2;
        const fr = this.add.rectangle(cx, cy, cell - 8, cell - 8, 0x0f0a26).setStrokeStyle(2, c.on ? 0x7cf0c8 : 0x4a3d86).setInteractive({ useHandCursor: true });
        fr.on('pointerover', () => { this.gridIdx = i; this.paintGrid(); });
        fr.on('pointerdown', () => { this.gridIdx = i; this.paintGrid(); });
        this.gridFrames.push(fr); this.menuBox.add(fr);
        if (this.textures.exists(c.icon)) this.menuBox.add(this.add.image(cx, cy - 4, c.icon).setDisplaySize(52, 52));
        if ((c.count ?? 1) > 1) this.menuBox.add(this.add.text(cx + cell / 2 - 10, cy + cell / 2 - 10, `×${c.count}`, { fontFamily: FONT_B, fontSize: '14px', color: '#ffffff', stroke: '#0b0820', strokeThickness: 4 }).setOrigin(1, 1));
        if (c.on) this.menuBox.add(this.add.text(cx - cell / 2 + 8, cy - cell / 2 + 6, 'E', { fontFamily: FONT_B, fontSize: '14px', color: '#7cf0c8', stroke: '#0b0820', strokeThickness: 3 }));
      });
      this.gridCap = this.add.text(W / 2, y + 64 + gRows * cell + 8, '', { fontFamily: FONT, fontSize: '16px', color: '#e6e0ff', align: 'center', wordWrap: { width: w2 - 48, useAdvancedWrap: true } }).setOrigin(0.5, 0);
      this.menuBox.add(this.gridCap); this.paintGrid();
    }
    if (bodyT) {
      bodyT.setPosition(x + 32, y + 64 + gridH).setOrigin(0, 0);
      if (bodyT.height > 300 - gridH / 2) bodyT.setFontSize(this.grid.length ? 16 : 12).setLineSpacing(4);
      this.menuBox.add(bodyT);
    }
    opts.forEach((o, i) => {
      const col = Math.floor(i / perCol), row = i % perCol;
      const cx = cols === 2 ? W / 2 + (col ? 1 : -1) * w2 / 4 : W / 2;
      const ty = y + 68 + gridH + bodyH + row * rowH;
      const t = this.add.text(cx, ty, o.label, { fontFamily: FONT, fontSize: cols === 2 ? '20px' : '24px', color: '#f5f0ff' })
        .setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
      t.on('pointerover', () => { this.menuIdx = i; this.paintMenu(); });
      t.on('pointerdown', () => { this.menuIdx = i; this.pickMenu(); });
      if (o.icon && this.textures.exists(o.icon)) {
        const ic = this.add.image(0, ty + 15, o.icon).setDisplaySize(32, 32);
        (t as any).__icon = ic; this.menuBox.add(ic);
      }
      this.menuTexts.push(t); this.menuBox.add(t);
    });
    this.menuBox.setVisible(true); this.paintMenu();
  }
  private paintGrid() {
    this.gridFrames.forEach((f, i) => f.setStrokeStyle(i === this.gridIdx ? 3 : 2, i === this.gridIdx ? 0xffd66b : this.grid[i].on ? 0x7cf0c8 : 0x4a3d86));
    const c = this.grid[this.gridIdx];
    if (c && this.gridCap) this.gridCap.setText(`${c.name}${(c.count ?? 1) > 1 ? ` ×${c.count}` : ''}${c.on ? ' [장착]' : ''}\n${c.desc ?? ''}`);
  }
  private paintMenu() {
    this.menuTexts.forEach((t, i) => {
      t.setText(i === this.menuIdx ? `▶ ${this.menuOpts[i].label} ◀` : this.menuOpts[i].label).setColor(i === this.menuIdx ? '#ffd66b' : '#f5f0ff');
      const ic = (t as any).__icon as Phaser.GameObjects.Image | undefined;
      if (ic) ic.setX(t.x - t.width / 2 - 22);
    });
  }
  private pickMenu() {
    const o = this.menuOpts[this.menuIdx];
    this.menuBox.setVisible(false).removeAll(true);
    this.time.delayedCall(120, () => { if (!this.active && !this.menuBox.visible) UIState.busy = false; });
    o.act();
  }

  update(_t: number, dms: number) {
    if (this.menuBox.visible) {
      if (Input.take('up')) { this.menuIdx = (this.menuIdx + this.menuOpts.length - 1) % this.menuOpts.length; this.paintMenu(); }
      if (Input.take('down')) { this.menuIdx = (this.menuIdx + 1) % this.menuOpts.length; this.paintMenu(); }
      const per = Math.ceil(this.menuOpts.length / 2);
      if (this.grid.length) {
        if (Input.take('right')) { this.gridIdx = (this.gridIdx + 1) % this.grid.length; this.paintGrid(); }
        if (Input.take('left')) { this.gridIdx = (this.gridIdx + this.grid.length - 1) % this.grid.length; this.paintGrid(); }
      }
      if (!this.grid.length && this.menuOpts.length > 7 && (Input.take('right') || Input.take('left'))) { this.menuIdx = (this.menuIdx + per) % (per * 2); if (this.menuIdx >= this.menuOpts.length) this.menuIdx = this.menuOpts.length - 1; this.paintMenu(); }
      if (Input.take('confirm')) this.pickMenu();
      if (Input.take('menu')) { const close = this.menuOpts.findIndex(o => o.label === '닫기' || o.label === '계속하기'); if (close >= 0) { this.menuIdx = close; this.pickMenu(); } }
      return;
    }
    if (!this.active) return;
    if (this.choosing) {
      if (Input.take('up')) { this.choiceIdx = (this.choiceIdx + this.choiceTexts.length - 1) % this.choiceTexts.length; this.paintChoices(); }
      if (Input.take('down')) { this.choiceIdx = (this.choiceIdx + 1) % this.choiceTexts.length; this.paintChoices(); }
      if (Input.take('confirm')) this.pickChoice();
      return;
    }
    if (this.typing) {
      this.typeAcc += dms;
      while (this.typeAcc > 24 && this.shown < this.full.length) { this.typeAcc -= 24; this.shown++; if (this.shown % 3 === 0 && this.full[this.shown] !== ' ') Audio.sfx('blip'); }
      this.bodyT.setText(this.full.slice(0, this.shown));
      if (this.shown >= this.full.length) { this.typing = false; this.moreT.setVisible(true); }
    }
    const go = Input.take('confirm') || this.tapQueued;
    this.tapQueued = false;
    if (!go) return;
    if (this.typing) { this.shown = this.full.length; this.bodyT.setText(this.full); this.typing = false; this.moreT.setVisible(true); }
    else this.step();
  }
}
