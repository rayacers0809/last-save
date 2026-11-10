// 엔딩 4종: 초기화 · 노멀 · 트루(+크레딧) · 시크릿
import Phaser from 'phaser';
import { Cloud } from '../systems/Cloud';
import { Input } from '../systems/InputManager';
import { FONT, FONT_B, runDialogue } from './UIScene';
import { starfield } from './TitleScene';
import { GameState, Bus } from '../systems/GameState';
import { CHAR_IDS, charById } from '../data/characters';
import { regionName } from '../data/quests';
import { Audio } from '../systems/AudioManager';
import { glitchBurst } from './PrologueScene';
import { makeThingTextures } from '../gfx/things';

const W = 960, H = 540;
type Kind = 'reset' | 'normal' | 'true' | 'secret';
const TITLE: Record<Kind, [string, string]> = {
  reset: ['초기화 엔딩 — 처음으로', '#ff8aa0'],
  normal: ['노멀 엔딩 — 되돌린 하늘', '#9ec7ff'],
  true: ['트루 엔딩 — 마지막 저장점', '#ffd66b'],
  secret: ['시크릿 엔딩 — 휴지통 섬', '#7cf0c8'],
};
const PHOTO_COUNT: Record<string, number> = { cloud: 4, mirror: 4, park: 4, data: 4, garden: 4, station: 4, photo: 4, shadow: 4, lastsave: 4 };

export class EndingScene extends Phaser.Scene {
  private ready = false;
  private next: () => void = () => {};
  constructor() { super('Ending'); }

  async create(data: { kind: Kind; secret?: boolean }) {
    this.ready = false;
    const kind = data.kind;
    const onTag = (t: string) => { if (t === 'glitch') { glitchBurst(this, 0.6); Audio.sfx('glitch'); } if (t === 'tower_light') { this.cameras.main.flash(600, 255, 240, 180); Audio.sfx('star'); } };
    Bus.on('tag', onTag); this.events.once('shutdown', () => Bus.off('tag', onTag));
    const stars = starfield(this);
    if (kind === 'reset') {
      stars.forEach((s, i) => this.time.delayedCall(400 + i * 40, () => { this.tweens.killTweensOf(s); s.setAlpha(0); }));
      await this.wait(800); await runDialogue('ending_reset');
      this.next = () => this.scene.start('Title', { noStars: true });
    }
    if (kind === 'normal') {
      Audio.bgm('cloud');
      stars.forEach((s, i) => { if (i % 4 === 0) { this.tweens.killTweensOf(s); s.setAlpha(0.1); } });
      await this.wait(600); await runDialogue('ending_normal');
      this.studio(false);
      this.next = () => this.scene.start('Title');
    }
    if (kind === 'true') {
      Audio.bgm('lastsave');
      await this.wait(600); await runDialogue('ending_true');
      this.studio(true);
      await this.wait(3600);
      await this.credits();
      if (data.secret) {
        this.next = () => this.scene.start('World', { from: 'travel', map: 'trash' });
        this.add.text(W / 2, 420, '…그런데, 아직 끝이 아니다.', { fontFamily: FONT, fontSize: '12px', color: '#7cf0c8' }).setOrigin(0.5);
      } else this.next = () => this.scene.start('Title');
    }
    if (kind === 'secret') {
      Audio.bgm('trash');
      makeThingTextures(this);
      const cron = this.add.image(W / 2, 420, this.textures.exists('npc_cron') ? 'npc_cron' : 'cron').setScale(2.4).setOrigin(0.5, 1);
      this.tweens.add({ targets: cron, angle: { from: -6, to: 6 }, duration: 500, yoyo: true, repeat: -1 });
      const t2 = this.add.text(W / 2, 460, 'LAST SAVE 2', { fontFamily: FONT_B, fontSize: '24px', color: '#ffd66b' }).setOrigin(0.5);
      this.tweens.add({ targets: t2, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });
      this.next = () => this.scene.start('Title');
    }
    const [title, col] = TITLE[kind];
    const tt = this.add.text(W / 2, kind === 'true' ? 470 : kind === 'secret' ? 140 : 200, title, { fontFamily: FONT_B, fontSize: '24px', color: col, backgroundColor: '#0b0820cc', padding: { x: 10, y: 4 } }).setOrigin(0.5).setAlpha(0);
    const hint = this.add.text(W / 2, kind === 'true' ? 505 : kind === 'secret' ? 180 : 250, 'SPACE / 탭으로 계속', { fontFamily: FONT, fontSize: '12px', color: '#8d84bd' }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: [tt, hint], alpha: 1, duration: 800, onComplete: () => { this.ready = true; } });
    void Cloud.stats().then(r => {
      const n = r.endings?.[kind]; if (!n || !this.sys.isActive()) return;
      const st = this.add.text(W / 2, hint.y + 18, `이 엔딩을 본 사람 ${n}명${r.players ? ` · 전체 ${r.players}명 중` : ''}`, { fontFamily: FONT, fontSize: '12px', color: '#c9c0ef' }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: st, alpha: 1, duration: 600 });
    });
    this.input.on('pointerdown', () => { if (this.ready) this.go(); });
  }

  private go() { if (!this.ready) return; this.ready = false; this.cameras.main.fadeOut(600); this.cameras.main.once('camerafadeoutcomplete', () => this.next()); }
  private wait(ms: number) { return new Promise(r => this.time.delayedCall(ms, r)); }

  /** 현실의 작업실: 모니터와 액자 */
  private studioC?: Phaser.GameObjects.Container;
  private studio(full: boolean) {
    const box = this.add.container(0, 0); this.studioC = box;
    const g = this.add.graphics(); box.add(g);
    g.fillStyle(0x17122e, 0.92).fillRect(0, 280, W, 260);
    g.fillStyle(0x0b0820).fillRect(260, 300, 260, 150).lineStyle(4, 0x4a3d86).strokeRect(260, 300, 260, 150);
    box.add(this.add.text(390, 375, full ? 'LAST SAVE\n저장 완료 100%' : 'savria_v0.9\n저장됨', { fontFamily: FONT_B, fontSize: '24px', color: full ? '#7cf0c8' : '#9ec7ff', align: 'center' }).setOrigin(0.5));
    g.lineStyle(6, 0xb98763).strokeRect(600, 310, 200, 130).fillStyle(0x2a2150).fillRect(604, 314, 192, 122);
    if (full) {
      const first = String(GameState.flag('choice.photo_first') || '');
      const order = first && CHAR_IDS.includes(first as any) ? [...CHAR_IDS.filter(c => c !== first)] : [...CHAR_IDS];
      if (first && CHAR_IDS.includes(first as any)) order.splice(4, 0, first as any);
      order.forEach((id, i) => box.add(this.add.image(620 + i * 20, 432, `${id}_field`).setOrigin(0.5, 1).setScale(0.42)));
      this.cameras.main.flash(300, 255, 255, 255);
    }
  }

  /** 크레딧: 으네 앨범 36장 (못 찍은 자리는 실루엣) */
  private async credits() {
    const d = GameState.data;
    this.studioC?.destroy();
    const c = this.add.container(0, 0);
    const bg = this.add.graphics(); bg.fillStyle(0x0b0820, 0.94).fillRect(0, 0, W, H); c.add(bg);
    c.add(this.add.text(W / 2, 24, '으네의 앨범', { fontFamily: FONT_B, fontSize: '24px', color: '#ffd66b' }).setOrigin(0.5, 0));
    let i = 0;
    for (const [map, n] of Object.entries(PHOTO_COUNT)) for (let k = 0; k < n; k++, i++) {
      const id = `${map}_${k}`, got = d.album.includes(id);
      const x = 60 + (i % 9) * 100, y = 90 + Math.floor(i / 9) * 92;
      const g = this.add.graphics();
      g.fillStyle(got ? 0xfff8e8 : 0x241b4a, 1).fillRect(x - 40, y - 4, 80, 74);
      g.fillStyle(got ? Phaser.Display.Color.HSVToRGB((i * 37 % 360) / 360, 0.35, 0.85).color : 0x1a1438, 1).fillRect(x - 34, y + 2, 68, 46);
      if (!got) g.fillStyle(0x0b0820, 1).fillCircle(x, y + 18, 10).fillRect(x - 12, y + 28, 24, 18);
      c.add(g);
      c.add(this.add.text(x, y + 58, got ? String(GameState.flag(`photo.${id}`) ?? '') : regionName(map), { fontFamily: FONT, fontSize: '12px', color: got ? '#3b3560' : '#5d5a7a', fixedWidth: 78, align: 'center' }).setOrigin(0.5).setScale(0.8));
      c.setAlpha(1);
      g.setAlpha(0); this.tweens.add({ targets: g, alpha: 1, delay: i * 60, duration: 200 });
    }
    await this.wait(36 * 60 + 2500);
    const station = String(GameState.flag('choice.station_name') || '');
    const lines = [
      'LAST SAVE : 마지막 저장점',
      '',
      `별지기  ${CHAR_IDS.map(id => charById(id).name).join(' · ')}`,
      `첫 접속자  ${charById(d.firstPlayer).name}`,
      station ? `종착역  ${charById(station).name} 역` : '',
      `앨범 ${d.album.length}/36 · 핵심 기억 ${d.memories.core.length}/9`,
      '',
      '함께 플레이해 줘서 고마워.',
    ].filter((l, k) => l || k === 1 || k === 6);
    c.destroy();
    const bg2 = this.add.graphics(); bg2.fillStyle(0x0b0820, 0.9).fillRect(0, 0, W, H);
    lines.forEach((l, k) => {
      const t = this.add.text(W / 2, 110 + k * 36, l, { fontFamily: k === 0 ? FONT_B : FONT, fontSize: '24px', color: k === 0 ? '#ffd66b' : '#e6e0ff' }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, delay: k * 500, duration: 600 });
    });
    await this.wait(lines.length * 500 + 1200);
  }

  update() { if (this.ready && Input.take('confirm')) this.go(); }
}
