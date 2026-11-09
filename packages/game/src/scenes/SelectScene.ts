import Phaser from 'phaser';
import { Input } from '../systems/InputManager';
import { CHARS } from '../data/characters';
import { GameState } from '../systems/GameState';
import { FONT, FONT_B } from './UIScene';
import { starfield } from './TitleScene';

const W = 960, CW = 98, GAP = 6;

export class SelectScene extends Phaser.Scene {
  private idx = 0;
  private cards: { bg: Phaser.GameObjects.Graphics; img: Phaser.GameObjects.Image; label: Phaser.GameObjects.Text; x: number }[] = [];
  private nameT!: Phaser.GameObjects.Text;
  private titleT!: Phaser.GameObjects.Text;
  private abilT!: Phaser.GameObjects.Text;
  private goBtn!: Phaser.GameObjects.Text;

  constructor() { super('Select'); }

  create() {
    starfield(this);
    this.add.text(W / 2, 30, 'SELECT CHARACTER', { fontFamily: FONT, fontSize: '12px', color: '#8d84bd' }).setOrigin(0.5);
    this.add.text(W / 2, 56, '누구로 접속할까?', { fontFamily: FONT_B, fontSize: '24px', color: '#f5f0ff' }).setOrigin(0.5);
    const total = CHARS.length * CW + (CHARS.length - 1) * GAP, x0 = (W - total) / 2;
    this.cards = CHARS.map((c, i) => {
      const x = x0 + i * (CW + GAP);
      const bg = this.add.graphics();
      const img = this.add.image(x + CW / 2, 268, `${c.id}_card`).setOrigin(0.5, 1);
      const s = Math.min(1, (CW - 10) / img.width); img.setScale(s);
      const label = this.add.text(x + CW / 2, 280, c.name, { fontFamily: FONT_B, fontSize: '24px', color: c.color }).setOrigin(0.5, 0);
      const zone = this.add.zone(x, 90, CW, 224).setOrigin(0).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => { if (this.idx === i) this.go(); else { this.idx = i; this.paint(); } });
      return { bg, img, label, x };
    });
    this.nameT = this.add.text(W / 2, 336, '', { fontFamily: FONT_B, fontSize: '24px' }).setOrigin(0.5, 0);
    this.titleT = this.add.text(W / 2, 370, '', { fontFamily: FONT, fontSize: '24px', color: '#c9c0ef' }).setOrigin(0.5, 0);
    this.abilT = this.add.text(W / 2, 410, '', { fontFamily: FONT, fontSize: '24px', color: '#f5f0ff' }).setOrigin(0.5, 0);
    this.goBtn = this.add.text(W / 2, 470, '이 캐릭터로 접속', { fontFamily: FONT_B, fontSize: '24px', color: '#0c0920', backgroundColor: '#ffd66b', padding: { x: 18, y: 10 } })
      .setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
    this.goBtn.on('pointerdown', () => this.go());
    this.paint();
  }

  private paint() {
    this.cards.forEach((cd, i) => {
      const on = i === this.idx, c = CHARS[i];
      cd.bg.clear().fillStyle(on ? 0x2e2366 : 0x1a1438, on ? 1 : 0.8).fillRect(cd.x, 90, CW, 224)
        .lineStyle(2, on ? Phaser.Display.Color.HexStringToColor(c.color).color : 0x4a3d86, 1).strokeRect(cd.x, 90, CW, 224);
      cd.img.setAlpha(on ? 1 : 0.55); cd.label.setAlpha(on ? 1 : 0.6);
      cd.img.y = on ? 262 : 268;
    });
    const c = CHARS[this.idx];
    this.nameT.setText(`${c.name}${c.male ? ' (남)' : ''}`).setColor(c.color);
    this.titleT.setText(c.title);
    this.abilT.setText(`${c.ability} — ${c.abilityDesc}`);
  }

  private go() {
    GameState.startNew(CHARS[this.idx].id);
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Prologue'));
  }

  update() {
    if (Input.take('left')) { this.idx = (this.idx + CHARS.length - 1) % CHARS.length; this.paint(); }
    if (Input.take('right')) { this.idx = (this.idx + 1) % CHARS.length; this.paint(); }
    if (Input.take('confirm')) this.go();
  }
}
