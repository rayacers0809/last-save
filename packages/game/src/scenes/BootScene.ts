import Phaser from 'phaser';
import { CHAR_IDS, WALK, DIR_ROW, type Dir } from '../data/characters';
import { makeProps } from '../gfx/paint';

const urls = import.meta.glob('../assets/chars/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const url = (name: string) => urls[`../assets/chars/${name}.png`];
const decoUrls = import.meta.glob('../assets/deco/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const itemUrls = import.meta.glob('../assets/items/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const npcUrls = import.meta.glob('../assets/npc/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
/** NPC 걷기 시트 칸 크기 (3프레임 × 4방향: 아래·왼쪽·오른쪽·위) */
export const NPC_SHEETS: Record<string, [number, number]> = { point: [54, 60], cron: [47, 64], folk: [49, 61], spirit: [64, 66], firefly: [72, 65], cat: [59, 66], kid: [55, 63] };
const walkUrls = import.meta.glob('../assets/walk/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const W = 960, H = 540;
    const bar = this.add.rectangle(W / 2 - 150, H / 2, 0, 8, 0xffd66b).setOrigin(0, 0.5);
    this.add.rectangle(W / 2, H / 2, 304, 14).setStrokeStyle(2, 0xf5f0ff);
    this.load.on('progress', (p: number) => bar.setSize(300 * p, 8));
    // 디자인 소품 PNG: assets/props/<소품이름>.png (예: ferris.png, house_e7799b.png)
    for (const [path, u] of Object.entries(itemUrls)) this.load.image(`item_${path.split('/').pop()!.replace('.png', '')}`, u);
    for (const [path, u] of Object.entries(decoUrls)) this.load.image(`deco_${path.split('/').pop()!.replace('.png', '')}`, u);
    for (const [path, u] of Object.entries(npcUrls)) {
      const name = path.split('/').pop()!.replace('.png', '');
      if (name.endsWith('_walk')) { const k = name.replace('_walk', ''); const [fw, fh] = NPC_SHEETS[k] ?? [48, 64]; this.load.spritesheet(`npc_${name}`, u, { frameWidth: fw, frameHeight: fh }); }
      else this.load.image(`npc_${name}`, u);
    }
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
    for (const k of Object.keys(NPC_SHEETS)) if (this.textures.exists(`npc_${k}_walk`)) (['down', 'left', 'right', 'up'] as const).forEach((d, r) =>
      this.anims.create({ key: `npc_${k}-${d}`, frames: this.anims.generateFrameNumbers(`npc_${k}_walk`, { frames: [r * 3, r * 3 + 1, r * 3 + 2, r * 3 + 1] }), frameRate: 7, repeat: -1 }));
    try {
      await Promise.all([document.fonts.load('24px Galmuri11'), document.fonts.load('24px Galmuri11Bold')]);
    } catch { /* 글꼴 실패 시 시스템 글꼴 */ }
    this.scene.launch('UI');
    this.scene.start('Title');
  }
}
