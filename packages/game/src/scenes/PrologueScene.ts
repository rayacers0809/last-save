import Phaser from 'phaser';
import { CHAR_IDS } from '../data/characters';
import { Bus } from '../systems/GameState';
import { runDialogue } from './UIScene';
import { Audio } from '../systems/AudioManager';

const W = 960, H = 540;

export function glitchBurst(scene: Phaser.Scene, strength = 1) {
  const cam = scene.cameras.main;
  cam.shake(260 * strength, 0.008 * strength);
  cam.flash(120, 255, 90, 130);
  for (let i = 0; i < 40 * strength; i++) {
    const x = scene.cameras.main.scrollX + Phaser.Math.Between(0, W), y = scene.cameras.main.scrollY + Phaser.Math.Between(0, H);
    const r = scene.add.rectangle(x, y, Phaser.Math.Between(4, 40), Phaser.Math.Between(4, 12), Phaser.Math.RND.pick([0x0b0820, 0xff5c7a, 0x7cf0c8]))
      .setDepth(5000);
    scene.tweens.add({ targets: r, alpha: 0, duration: Phaser.Math.Between(150, 420), onComplete: () => r.destroy() });
  }
}

export class PrologueScene extends Phaser.Scene {
  constructor() { super('Prologue'); }

  async create() {
    this.cameras.main.fadeIn(300);
    const g = this.add.graphics();
    g.fillStyle(0x17122e).fillRect(0, 0, W, H);
    g.fillStyle(0x221a42).fillRect(0, 300, W, 240);
    // 책상과 모니터
    g.fillStyle(0x3a2f6b).fillRect(300, 250, 360, 16);
    g.fillStyle(0x0b0820).fillRect(380, 96, 200, 140).lineStyle(4, 0x4a3d86).strokeRect(380, 96, 200, 140);
    g.fillStyle(0x4a3d86).fillRect(468, 236, 24, 14);
    const screen = this.add.rectangle(480, 166, 192, 132, 0x8fb3ff).setAlpha(0.85);
    this.tweens.add({ targets: screen, alpha: 0.65, duration: 900, yoyo: true, repeat: -1 });
    // 빈 액자 (복선)
    g.lineStyle(4, 0xb98763).strokeRect(700, 120, 72, 56).fillStyle(0x2a2150).fillRect(704, 124, 64, 48);
    CHAR_IDS.forEach((id, i) => this.add.image(150 + i * 82, 420, `${id}_field`).setOrigin(0.5, 1).setScale(1.1));

    const onTag = (t: string) => {
      if (t === 'glitch') { glitchBurst(this, 1.2); Audio.sfx('glitch'); Audio.bgm(null); screen.setFillStyle(Phaser.Math.RND.pick([0xff5c7a, 0x0b0820, 0x7cf0c8])); }
    };
    Bus.on('tag', onTag);
    this.events.once('shutdown', () => Bus.off('tag', onTag));

    await runDialogue('prologue');
    this.cameras.main.flash(600, 255, 255, 255);
    this.cameras.main.fadeOut(700, 255, 255, 255);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('World', { from: 'new' }));
  }
}
