import Phaser from 'phaser';
import { Input } from '../systems/InputManager';
import { SaveManager } from '../systems/SaveManager';
import { GameState } from '../systems/GameState';
import { FONT, FONT_B, UIState } from './UIScene';
import { CHAR_IDS } from '../data/characters';
import { isTouchDevice } from '../ui/TouchPad';
import { Audio } from '../systems/AudioManager';
import { Bus } from '../systems/GameState';
import { MAP_ORDER } from '../world/maps';

const W = 960, H = 540;

export function starfield(scene: Phaser.Scene, dark = true) {
  const g = scene.add.graphics();
  const top = dark ? 0x0c0920 : 0x8fb3ff, bot = dark ? 0x2a1f5c : 0xc7c2ff;
  g.fillGradientStyle(top, top, bot, bot, 1).fillRect(0, 0, W, H);
  const stars: Phaser.GameObjects.Rectangle[] = [];
  for (let i = 0; i < 90; i++) {
    const s = scene.add.rectangle(Phaser.Math.Between(0, W / 2) * 2, Phaser.Math.Between(0, H / 2) * 2, 2, 2, i % 5 ? 0x9d93c7 : 0xfff6d6);
    stars.push(s);
    scene.tweens.add({ targets: s, alpha: 0.2, duration: Phaser.Math.Between(600, 1800), yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 1500) });
  }
  return stars;
}

export class TitleScene extends Phaser.Scene {
  private opts: { label: string; act: () => void }[] = [];
  private texts: Phaser.GameObjects.Text[] = [];
  private idx = 0;

  constructor() { super('Title'); }

  async create(data?: { noStars?: boolean }) {
    const stars = starfield(this);
    if (data?.noStars) stars.forEach(s => { this.tweens.killTweensOf(s); s.setAlpha(0); });
    let secret = false; try { secret = localStorage.getItem('last-save:end-secret') === '1'; } catch { /* 없음 */ }
    if (secret) {
      const t2 = this.add.text(W - 20, 20, 'LAST SAVE 2', { fontFamily: FONT, fontSize: '12px', color: '#7cf0c8' }).setOrigin(1, 0);
      this.tweens.add({ targets: t2, alpha: 0.15, duration: 700, yoyo: true, repeat: -1 });
    }
    Audio.bgm('title');
    // 아홉 명 실루엣 라인업
    CHAR_IDS.forEach((id, i) => {
      const img = this.add.image(W / 2 + (i - 4) * 74, 470, `${id}_card`).setOrigin(0.5, 1).setScale(0.62);
      img.setAlpha(0);
      this.tweens.add({ targets: img, alpha: 1, y: 466, delay: 200 + i * 70, duration: 400 });
    });
    this.add.text(W / 2, 92, 'LAST SAVE', { fontFamily: FONT_B, fontSize: '48px', color: '#ffd66b' }).setOrigin(0.5).setShadow(4, 4, '#ff5fa2', 0, false, true);
    this.add.text(W / 2, 140, '마지막 저장점', { fontFamily: FONT, fontSize: '24px', color: '#f5f0ff' }).setOrigin(0.5);
    this.add.text(W / 2, 520, isTouchDevice() ? 'A 버튼으로 결정 · ⚙ 설정' : 'WASD 이동 · SPACE 결정 · Q 능력 · M 지도 · F 전체화면', { fontFamily: FONT, fontSize: '12px', color: '#8d84bd' }).setOrigin(0.5);

    const save = await SaveManager.load();
    this.opts = [{ label: '새로 시작', act: () => this.scene.start('Select') }];
    const browse = { label: '맵 둘러보기', act: () => Bus.emit('menu', '맵 둘러보기', [
      ...MAP_ORDER.map(m => ({ label: `${m.act === 5 ? '시크릿' : m.act === 0 ? '프롤로그' : m.act + '막'} · ${m.name}`, act: () => { GameState.startPreview(); this.scene.start('World', { from: 'travel', map: m.id }); } })),
      { label: '닫기', act: () => {} },
    ], '9명 모두 데리고 자유롭게 걸어 볼 수 있어요. 시간이 흐르지 않고 저장되지 않아요.') };
    if (save) this.opts.push({ label: '이어하기', act: () => { GameState.loadFrom(save); this.scene.start('World', { from: 'load' }); } });
    this.opts.push(browse);
    this.texts = this.opts.map((o, i) => {
      const t = this.add.text(W / 2, 196 + i * 40, o.label, { fontFamily: FONT, fontSize: '24px', color: '#f5f0ff' })
        .setOrigin(0.5).setInteractive({ useHandCursor: true });
      t.on('pointerover', () => { this.idx = i; this.paint(); });
      t.on('pointerdown', () => { this.idx = i; o.act(); });
      return t;
    });
    this.idx = save ? 1 : 0;
    this.paint();
  }

  private paint() {
    this.texts.forEach((t, i) => t.setText(i === this.idx ? `▶ ${this.opts[i].label} ◀` : this.opts[i].label).setColor(i === this.idx ? '#ffd66b' : '#f5f0ff'));
  }

  update() {
    if (!this.texts.length || UIState.busy) return;
    if (Input.take('up')) { this.idx = (this.idx + this.opts.length - 1) % this.opts.length; this.paint(); }
    if (Input.take('down')) { this.idx = (this.idx + 1) % this.opts.length; this.paint(); }
    if (Input.take('confirm')) this.opts[this.idx].act();
  }
}
