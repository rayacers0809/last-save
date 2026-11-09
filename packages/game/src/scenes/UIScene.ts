// 대화창, HUD, 토스트, 메뉴. 다른 씬 위에 항상 떠 있다.
import Phaser from 'phaser';
import { Input } from '../systems/InputManager';
import { Story1, type Line } from '../systems/StoryRunner';
import { Bus, GameState } from '../systems/GameState';
import { charById, CHAR_IDS, type CharId } from '../data/characters';
import { Audio } from '../systems/AudioManager';

export const UIState = { busy: false };
export const FONT = 'Galmuri11, "Apple SD Gothic Neo", sans-serif';
export const FONT_B = 'Galmuri11Bold, Galmuri11, sans-serif';

const W = 960, H = 540;

/** 대화를 실행하고 끝나면 지나간 태그 목록을 돌려준다 */
export function runDialogue(knot: string): Promise<string[]> {
  return new Promise(res => Bus.emit('dialogue', knot, res));
}
export function toast(text: string) { Bus.emit('toast', text); }

interface MenuOpt { label: string; act: () => void }

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
    hg.fillStyle(0x1a1438, 0.82).fillRect(W - 236, 12, 224, 64).lineStyle(2, 0xf5f0ff, 1).strokeRect(W - 236, 12, 224, 64);
    this.hudPor = this.add.image(44, 44, 'rumung_por').setDisplaySize(52, 52);
    this.hudName = this.add.text(80, 20, '', { fontFamily: FONT_B, fontSize: '24px' });
    this.hudAbility = this.add.text(80, 50, '', { fontFamily: FONT, fontSize: '12px', color: '#c9c0ef' });
    this.hudTime = this.add.text(W - 224, 20, '', { fontFamily: FONT_B, fontSize: '24px', color: '#ffd66b' });
    this.hudParty = this.add.text(W - 224, 50, '', { fontFamily: FONT, fontSize: '12px', color: '#c9c0ef' });
    this.hud.add([hg, this.hudPor, this.hudName, this.hudAbility, this.hudTime, this.hudParty]);

    this.menuBox = this.add.container(0, 0).setDepth(20).setVisible(false);

    Bus.on('dialogue', (knot: string, res: (t: string[]) => void) => this.startDialogue(knot, res));
    Bus.on('lines', (lines: { name: string; por: string; text: string }[], res: () => void) => {
      this.extLines = lines.slice(); this.active = true; UIState.busy = true; this.tags = []; this.done = () => res();
      this.box.setVisible(true); this.step();
    });
    Bus.on('toast', (t: string) => this.showToast(t));
    Bus.on('hud', (on: boolean) => { this.hud.setVisible(on); this.refreshHud(); });
    Bus.on('hud-refresh', () => this.refreshHud());
    Bus.on('ui-reset', () => {
      this.active = false; this.choosing = false; this.box.setVisible(false); this.choiceBox.setVisible(false).removeAll(true);
      this.menuBox.setVisible(false).removeAll(true); UIState.busy = false;
      const d = this.done; this.done = null; d?.(this.tags);
    });
    Bus.on('menu', (title: string, opts: MenuOpt[], body?: string) => this.openMenu(title, opts, body));

    this.input.on('pointerdown', () => { if (this.active && !this.choosing) this.tapQueued = true; });
  }

  // ---------- HUD ----------
  private refreshHud() {
    const d = GameState.data, c = charById(d.leader);
    this.hudPor.setTexture(`${c.id}_por`).setDisplaySize(52, 52);
    this.hudName.setText(c.name).setColor(c.color);
    this.hudAbility.setText(`Q · ${c.ability}`);
    const h = Math.max(0, Math.floor(d.hoursLeft)), m = Math.round((d.hoursLeft - h) * 60);
    this.hudTime.setText(`초기화까지 ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    this.hudParty.setText(`별지기 ${d.party.length}/9 · 기억 ${d.memories?.world ?? 0}/8 · 노트 ${d.bugNotes.length}/30`);
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
    let y = 84;
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
    if (portrait) {
      if (point) this.por.setTexture('point_por').setDisplaySize(104, 104);
      else if (CHAR_IDS.includes(who as CharId)) this.por.setTexture(`${who}_por`).setDisplaySize(104, 104);
      this.porFrame.lineStyle(2, 0x6a5cc0, 1).strokeRect(43, 395, 106, 106);
    }
    let name = '', color = '#ffffff';
    const folk = !CHAR_IDS.includes(who as CharId) && !point && !sys && !narr;
    if (ext) { name = ext.name; color = '#cfe0ff'; this.por.setTexture(ext.por).setDisplaySize(94, 104); }
    else if (point) { name = '포인트'; color = '#ffe27a'; }
    else if (folk) {
      const names: Record<string, string> = { piko: '피코', grandma: '빵집 할머니', nb_a: '구름 주민', nb_b: '구름 주민', nb_c: '구름 주민' };
      name = names[who] ?? '구름 주민'; color = '#cfe0ff';
      this.por.setTexture(`folk_${who}`).setDisplaySize(94, 104);
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
  private openMenu(title: string, opts: MenuOpt[], body?: string) {
    UIState.busy = true; this.menuOpts = opts; this.menuIdx = 0; this.menuBox.removeAll(true); this.menuTexts = [];
    Audio.sfx('menu');
    const w = body ? 640 : 460;
    const bodyT = body ? this.add.text(W / 2, 0, body, { fontFamily: FONT, fontSize: '24px', color: '#e6e0ff', lineSpacing: 6, wordWrap: { width: w - 64, useAdvancedWrap: true } }).setOrigin(0.5, 0) : null;
    const bodyH = bodyT ? Math.min(300, bodyT.height) + 20 : 0;
    const cols = opts.length > 7 ? 2 : 1, perCol = Math.ceil(opts.length / cols);
    const w2 = cols === 2 ? Math.max(w, 720) : w;
    const h = 80 + bodyH + perCol * 44, x = (W - w2) / 2, y = Math.max(12, (H - h) / 2);
    const g = this.add.graphics();
    g.fillStyle(0x0b0820, 0.6).fillRect(0, 0, W, H);
    g.fillStyle(0x1a1438, 1).fillRect(x, y, w2, h).lineStyle(2, 0xf5f0ff, 1).strokeRect(x, y, w2, h);
    this.menuBox.add(g);
    this.menuBox.add(this.add.text(W / 2, y + 22, title, { fontFamily: FONT_B, fontSize: '24px', color: '#ffd66b' }).setOrigin(0.5, 0));
    if (bodyT) {
      bodyT.setPosition(x + 32, y + 64).setOrigin(0, 0);
      if (bodyT.height > 300) bodyT.setFontSize(12).setLineSpacing(4);
      this.menuBox.add(bodyT);
    }
    opts.forEach((o, i) => {
      const col = Math.floor(i / perCol), row = i % perCol;
      const cx = cols === 2 ? W / 2 + (col ? 1 : -1) * w2 / 4 : W / 2;
      const t = this.add.text(cx, y + 68 + bodyH + row * 44, o.label, { fontFamily: FONT, fontSize: cols === 2 ? '20px' : '24px', color: '#f5f0ff' })
        .setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
      t.on('pointerover', () => { this.menuIdx = i; this.paintMenu(); });
      t.on('pointerdown', () => { this.menuIdx = i; this.pickMenu(); });
      this.menuTexts.push(t); this.menuBox.add(t);
    });
    this.menuBox.setVisible(true); this.paintMenu();
  }
  private paintMenu() {
    this.menuTexts.forEach((t, i) => t.setText(i === this.menuIdx ? `▶ ${this.menuOpts[i].label} ◀` : this.menuOpts[i].label)
      .setColor(i === this.menuIdx ? '#ffd66b' : '#f5f0ff'));
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
      if (this.menuOpts.length > 7 && (Input.take('right') || Input.take('left'))) { this.menuIdx = (this.menuIdx + per) % (per * 2); if (this.menuIdx >= this.menuOpts.length) this.menuIdx = this.menuOpts.length - 1; this.paintMenu(); }
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
