import Phaser from 'phaser';
import { CHAR_IDS, WALK, DIR_ROW, type Dir } from '../data/characters';
import { makeProps } from '../gfx/paint';

const urls = import.meta.glob('../assets/chars/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const url = (name: string) => urls[`../assets/chars/${name}.png`];
const walkUrls = import.meta.glob('../assets/walk/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const W = 960, H = 540;
    const bar = this.add.rectangle(W / 2 - 150, H / 2, 0, 8, 0xffd66b).setOrigin(0, 0.5);
    this.add.rectangle(W / 2, H / 2, 304, 14).setStrokeStyle(2, 0xf5f0ff);
    this.load.on('progress', (p: number) => bar.setSize(300 * p, 8));
    for (const id of CHAR_IDS) {
      this.load.image(`${id}_field`, url(`${id}_field`));
      this.load.image(`${id}_card`, url(`${id}_card`));
      this.load.image(`${id}_por`, url(`${id}_por`));
      this.load.spritesheet(`${id}_walk`, walkUrls[`../assets/walk/${id}.png`], { frameWidth: WALK.fw, frameHeight: WALK.fh });
    }
  }

  async create() {
    makeProps(this);
    for (const id of CHAR_IDS) for (const d of Object.keys(DIR_ROW) as Dir[]) {
      const r = DIR_ROW[d];
      this.anims.create({ key: `${id}-${d}`, frames: this.anims.generateFrameNumbers(`${id}_walk`, { start: r * 4, end: r * 4 + 3 }), frameRate: WALK.fps, repeat: -1 });
    }
    try {
      await Promise.all([document.fonts.load('24px Galmuri11'), document.fonts.load('24px Galmuri11Bold')]);
    } catch { /* 글꼴 실패 시 시스템 글꼴 */ }
    this.scene.launch('UI');
    this.scene.start('Title');
  }
}
