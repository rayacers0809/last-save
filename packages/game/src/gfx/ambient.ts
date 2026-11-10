// 지역마다 화면에 떠다니는 분위기 입자 (화면 좌표에 고정)
import Phaser from 'phaser';

const W = 960, H = 540;

function makeTextures(scene: Phaser.Scene) {
  const mk = (key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void) => {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0 }, false); draw(g); g.generateTexture(key, w, h); g.destroy();
  };
  mk('pt_dot', 4, 4, g => g.fillStyle(0xffffff, 1).fillRect(0, 0, 4, 4));
  mk('pt_star', 7, 7, g => g.fillStyle(0xffffff, 1).fillRect(3, 0, 1, 7).fillRect(0, 3, 7, 1).fillRect(2, 2, 3, 3));
  mk('pt_petal', 6, 4, g => g.fillStyle(0xffffff, 1).fillRect(1, 0, 4, 4).fillRect(0, 1, 6, 2));
  mk('pt_rain', 2, 14, g => g.fillStyle(0xffffff, 1).fillRect(0, 0, 2, 14));
  mk('pt_bit', 4, 6, g => g.fillStyle(0xffffff, 1).fillRect(0, 0, 4, 6));
}

type Cfg = Phaser.Types.GameObjects.Particles.ParticleEmitterConfig & { key: string };
const area = (x: number, y: number, w: number, h: number) => ({ type: 'random' as const, source: new Phaser.Geom.Rectangle(x, y, w, h) as unknown as Phaser.Types.GameObjects.Particles.RandomZoneSource });

const CONFIG: Record<string, Cfg[]> = {
  cloud: [{ key: 'pt_petal', emitZone: area(0, -20, W, 10), lifespan: 9000, speedY: { min: 25, max: 45 }, speedX: { min: -30, max: 10 }, rotate: { min: 0, max: 360 }, scale: { min: 1.8, max: 2.8 }, alpha: { start: 0.95, end: 0.5 }, tint: [0xffc7dc, 0xffe2ee, 0xf6b3cf], frequency: 230, quantity: 1 }],
  mirror: [{ key: 'pt_star', emitZone: area(0, 0, W, H), lifespan: { min: 1400, max: 2600 }, speed: 4, scale: { values: [0, 2, 0], interpolation: 'linear' }, alpha: { start: 1, end: 0 }, tint: [0xcfe6ff, 0xe6dcff, 0xffffff], frequency: 110, quantity: 1 }],
  park: [{ key: 'pt_petal', emitZone: area(0, -20, W, 10), lifespan: 8000, speedY: { min: 30, max: 55 }, speedX: { min: -20, max: 20 }, rotate: { min: 0, max: 360 }, scale: { min: 1.6, max: 2.4 }, alpha: 0.9, tint: [0xff6b9b, 0xffd66b, 0x7cf0c8, 0xb49cff], frequency: 200, quantity: 1 }],
  data: [{ key: 'pt_bit', emitZone: area(0, H, W, 10), lifespan: 6000, speedY: { min: -60, max: -30 }, scale: { min: 1.2, max: 2 }, alpha: { start: 0.8, end: 0 }, tint: [0x7cf0c8, 0x6fd3ff], frequency: 90, quantity: 1 }],
  garden: [{ key: 'pt_dot', emitZone: area(0, 60, W, H - 60), lifespan: { min: 3000, max: 5000 }, speedX: { min: -14, max: 14 }, speedY: { min: -14, max: 6 }, scale: { min: 1.4, max: 2.4 }, alpha: { values: [0, 1, 0.3, 1, 0], interpolation: 'linear' }, tint: 0xfff1b8, frequency: 140, quantity: 1, blendMode: 'ADD' }],
  station: [{ key: 'pt_rain', emitZone: area(-100, -30, W + 100, 10), lifespan: 1600, speedY: { min: 420, max: 520 }, speedX: 90, rotate: -11, scaleY: { min: 1, max: 1.6 }, scaleX: 1.4, alpha: 0.6, tint: 0xeef6ff, frequency: 9, quantity: 1 }],
  photo: [{ key: 'pt_dot', emitZone: area(0, 0, W, H), lifespan: 6000, speedX: { min: 4, max: 14 }, speedY: { min: -6, max: 6 }, scale: { min: 1, max: 1.8 }, alpha: { values: [0, 0.7, 0], interpolation: 'linear' }, tint: 0xf3dfb8, frequency: 140, quantity: 1 }],
  shadow: [{ key: 'pt_dot', emitZone: area(0, H, W, 10), lifespan: 7000, speedY: { min: -40, max: -18 }, speedX: { min: -10, max: 10 }, scale: { start: 2.2, end: 0.6 }, alpha: { start: 0.9, end: 0 }, tint: [0xb06cff, 0xff5fa2], frequency: 140, quantity: 1, blendMode: 'ADD' }],
  lastsave: [{ key: 'pt_star', emitZone: area(0, H, W, 10), lifespan: 8000, speedY: { min: -45, max: -20 }, scale: { min: 1.2, max: 2 }, alpha: { start: 0.95, end: 0 }, tint: [0xffd66b, 0xfff6d6, 0xe6dcff], frequency: 140, quantity: 1, blendMode: 'ADD' }],
  trash: [{ key: 'pt_dot', emitZone: area(0, -10, W, 10), lifespan: 7000, speedY: { min: 30, max: 60 }, speedX: { min: -15, max: 15 }, scale: { min: 1.2, max: 2 }, alpha: 0.7, tint: [0x8d84bd, 0x5b5378, 0xff5c7a], frequency: 220, quantity: 1 }],
};

/** 지역 분위기 입자를 깔고, 정리 함수를 돌려준다 */
export function ambient(scene: Phaser.Scene, mapId: string): () => void {
  const list = CONFIG[mapId];
  if (!list) return () => {};
  makeTextures(scene);
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ems = list.map(({ key, ...cfg }) => {
    const em = scene.add.particles(0, 0, key, cfg).setScrollFactor(0).setDepth(8800);
    if (reduce) em.frequency = (em.frequency as number) * 4;
    em.fastForward(4000);
    return em;
  });
  return () => ems.forEach(e => e.destroy());
}
