// 엔딩 화면. 지금은 초기화 엔딩만 (나머지 엔딩은 4막에서 추가)
import Phaser from 'phaser';
import { Input } from '../systems/InputManager';
import { FONT, FONT_B } from './UIScene';
import { starfield } from './TitleScene';

const W = 960, H = 540;

export class EndingScene extends Phaser.Scene {
  private ready = false;
  constructor() { super('Ending'); }

  create(_data: { kind: 'reset' }) {
    this.ready = false;
    const stars = starfield(this);
    // 별이 하나씩 꺼진다
    stars.forEach((s, i) => this.time.delayedCall(400 + i * 40, () => { this.tweens.killTweensOf(s); s.setAlpha(0); }));
    const lines = [
      '별이 끝에서부터 하나씩 꺼졌다.',
      '서로의 이름을 불렀지만, 목소리가 점점 끊겼다.',
      '"미안. 이번에도 못 끝냈어."',
    ];
    lines.forEach((l, i) => {
      const t = this.add.text(W / 2, 190 + i * 44, l, { fontFamily: FONT, fontSize: '24px', color: '#c9c0ef' }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, delay: 1200 + i * 1600, duration: 800 });
    });
    const title = this.add.text(W / 2, 360, '초기화 엔딩 — 처음으로', { fontFamily: FONT_B, fontSize: '24px', color: '#ff8aa0' }).setOrigin(0.5).setAlpha(0);
    const hint = this.add.text(W / 2, 420, 'SPACE / 탭으로 타이틀로', { fontFamily: FONT, fontSize: '12px', color: '#8d84bd' }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: [title, hint], alpha: 1, delay: 6200, duration: 800, onComplete: () => { this.ready = true; } });
    this.input.on('pointerdown', () => { if (this.ready) this.scene.start('Title'); });
  }

  update() { if (this.ready && Input.take('confirm')) this.scene.start('Title'); }
}
