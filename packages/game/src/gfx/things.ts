// 퀘스트 오브젝트 텍스처 (코드로 그린 임시 도트. 그림이 오면 assets/props/<이름>.png로 바꿔 끼운다)
import Phaser from 'phaser';

const P = 2;
type Ctx = CanvasRenderingContext2D;
const px = (c: Ctx, x: number, y: number, w: number, h: number, col: string) => { c.fillStyle = col; c.fillRect(x * P, y * P, w * P, h * P); };

const DRAW: Record<string, [number, number, (c: Ctx) => void]> = {
  mirror: [24, 32, c => { px(c, 2, 0, 8, 14, '#b9b0dc'); px(c, 3, 1, 6, 12, '#cfe6ff'); px(c, 4, 2, 2, 5, '#ffffff'); px(c, 1, 14, 10, 2, '#8a7fb8'); }],
  mirror_dark: [24, 32, c => { px(c, 2, 0, 8, 14, '#5b5378'); px(c, 3, 1, 6, 12, '#1a1438'); px(c, 4, 3, 1, 1, '#7cf0c8'); px(c, 7, 8, 1, 1, '#ff5c7a'); px(c, 1, 14, 10, 2, '#3b3560'); }],
  echo: [24, 24, c => { px(c, 5, 0, 2, 12, '#e6dcff'); px(c, 0, 5, 12, 2, '#e6dcff'); px(c, 4, 4, 4, 4, '#b49cff'); px(c, 5, 5, 2, 2, '#ffffff'); }],
  terminal: [24, 28, c => { px(c, 1, 0, 10, 8, '#3b3560'); px(c, 2, 1, 8, 6, '#1b2440'); px(c, 3, 2, 4, 1, '#7cf0c8'); px(c, 3, 4, 6, 1, '#7cf0c8'); px(c, 4, 8, 4, 4, '#5b5378'); px(c, 2, 12, 8, 2, '#3b3560'); }],
  console: [24, 24, c => { px(c, 1, 3, 10, 8, '#e6bd4a'); px(c, 1, 3, 10, 2, '#b8902e'); px(c, 5, 6, 2, 3, '#3b2a10'); px(c, 2, 4, 1, 1, '#fff1b8'); px(c, 0, 0, 2, 2, '#ff5c7a'); px(c, 10, 1, 2, 2, '#7cf0c8'); }],
  gear: [24, 24, c => { px(c, 3, 1, 6, 10, '#b4abd0'); px(c, 1, 3, 10, 6, '#b4abd0'); px(c, 5, 0, 2, 12, '#9c93b8'); px(c, 0, 5, 12, 2, '#9c93b8'); px(c, 4, 4, 4, 4, '#5b5378'); px(c, 5, 5, 2, 2, '#1a1438'); }],
  balloon: [24, 32, c => { px(c, 3, 0, 6, 8, '#ff7aa8'); px(c, 2, 2, 8, 4, '#ff7aa8'); px(c, 4, 1, 2, 2, '#ffd0e0'); px(c, 5, 8, 2, 1, '#d4567f'); px(c, 6, 9, 1, 6, '#e6e0ff'); }],
  shard: [24, 24, c => { px(c, 4, 2, 3, 2, '#e6f4ff'); px(c, 3, 4, 5, 3, '#cfe6ff'); px(c, 5, 7, 3, 3, '#9ec7ff'); px(c, 4, 3, 1, 2, '#ffffff'); }],
  page: [24, 24, c => { px(c, 2, 2, 8, 9, '#fff8e8'); px(c, 3, 4, 6, 1, '#6f6a88'); px(c, 3, 6, 5, 1, '#6f6a88'); px(c, 3, 8, 4, 1, '#6f6a88'); px(c, 9, 2, 1, 4, '#e3d9c4'); }],
  seed: [24, 24, c => { px(c, 4, 4, 4, 5, '#b98763'); px(c, 5, 3, 2, 1, '#8a5f45'); px(c, 5, 5, 1, 2, '#e5cbb8'); px(c, 6, 1, 1, 2, '#7cc06a'); }],
  bed: [24, 24, c => { px(c, 0, 6, 12, 5, '#6d5146'); px(c, 1, 5, 10, 2, '#8b6b5c'); px(c, 3, 3, 1, 3, '#7cc06a'); px(c, 8, 4, 1, 2, '#7cc06a'); }],
  moonflower: [24, 24, c => { px(c, 5, 6, 1, 6, '#7cc06a'); px(c, 3, 2, 6, 5, '#5d5a7a'); px(c, 4, 3, 4, 3, '#8d84bd'); }],
  moonflower_on: [24, 24, c => { px(c, 5, 6, 1, 6, '#7cc06a'); px(c, 2, 1, 8, 6, '#fff6d6'); px(c, 3, 2, 6, 4, '#ffffff'); px(c, 5, 3, 2, 2, '#ffe27a'); }],
  firefly: [24, 24, c => { px(c, 4, 4, 4, 4, '#fff1b8'); px(c, 5, 5, 2, 2, '#ffffff'); px(c, 2, 3, 2, 2, '#e6e0ff'); px(c, 8, 3, 2, 2, '#e6e0ff'); }],
  rail: [24, 24, c => { px(c, 0, 3, 12, 1, '#9c93b8'); px(c, 0, 8, 12, 1, '#9c93b8'); for (let i = 0; i < 12; i += 3) px(c, i, 2, 2, 8, '#8a5f45'); px(c, 5, 0, 2, 12, '#ff5c7a'); }],
  rail_ok: [24, 24, c => { px(c, 0, 3, 12, 1, '#d7d2ee'); px(c, 0, 8, 12, 1, '#d7d2ee'); for (let i = 0; i < 12; i += 3) px(c, i, 2, 2, 8, '#b98763'); }],
  lost: [24, 24, c => { px(c, 2, 4, 8, 6, '#a07a6a'); px(c, 4, 2, 4, 2, '#7a5a4a'); px(c, 5, 6, 2, 2, '#ffd66b'); }],
  frame: [24, 24, c => { px(c, 1, 1, 10, 10, '#b98763'); px(c, 3, 3, 6, 6, '#2a2150'); px(c, 1, 1, 10, 1, '#d9a983'); }],
  photo: [24, 24, c => { px(c, 1, 3, 10, 7, '#3b3560'); px(c, 4, 2, 4, 1, '#3b3560'); px(c, 4, 4, 4, 4, '#a68cf2'); px(c, 5, 5, 2, 2, '#e6dcff'); px(c, 9, 4, 1, 1, '#ffd66b'); }],
  blur: [24, 24, c => { for (let i = 0; i < 12; i += 2) for (let j = 0; j < 12; j += 2) if ((i + j) % 4 === 0) px(c, i, j, 2, 2, 'rgba(230,220,200,.7)'); px(c, 4, 4, 4, 4, 'rgba(166,140,242,.8)'); }],
  lamp: [24, 32, c => { px(c, 5, 4, 2, 12, '#5b5378'); px(c, 3, 1, 6, 4, '#3b3560'); px(c, 4, 2, 4, 2, '#5d5a7a'); }],
  lamp_on: [24, 32, c => { px(c, 5, 4, 2, 12, '#5b5378'); px(c, 2, 0, 8, 5, '#ffd66b'); px(c, 3, 1, 6, 3, '#fff6d6'); px(c, 4, 5, 1, 1, '#f4c15a'); px(c, 7, 5, 1, 1, '#f4c15a'); }],
  signboard: [24, 24, c => { px(c, 0, 2, 12, 7, '#3b3560'); px(c, 1, 3, 10, 5, '#1a1438'); px(c, 2, 5, 8, 1, '#5d5a7a'); px(c, 5, 9, 2, 3, '#5b5378'); }],
  signboard_on: [24, 24, c => { px(c, 0, 2, 12, 7, '#ff7aa8'); px(c, 1, 3, 10, 5, '#ffd0e0'); px(c, 2, 5, 8, 1, '#ff5fa2'); px(c, 5, 9, 2, 3, '#5b5378'); }],
  kitten: [24, 24, c => { px(c, 3, 5, 6, 5, '#1d1a52'); px(c, 3, 3, 2, 2, '#1d1a52'); px(c, 7, 3, 2, 2, '#1d1a52'); px(c, 4, 6, 1, 1, '#ffd66b'); px(c, 7, 6, 1, 1, '#ffd66b'); px(c, 9, 7, 2, 1, '#1d1a52'); }],
  file: [24, 24, c => { px(c, 2, 1, 7, 10, '#e6e0ff'); px(c, 7, 1, 2, 2, '#b9b0dc'); px(c, 3, 4, 5, 1, '#5b5378'); px(c, 3, 6, 5, 1, '#5b5378'); px(c, 3, 8, 3, 1, '#ff5c7a'); }],
  folder: [24, 24, c => { px(c, 0, 3, 5, 2, '#f4c15a'); px(c, 0, 4, 12, 7, '#ffd66b'); px(c, 1, 6, 10, 1, '#f4c15a'); px(c, 4, 7, 4, 2, '#7cf0c8'); }],
  record: [24, 24, c => { px(c, 2, 2, 8, 8, '#2a2150'); px(c, 3, 3, 6, 6, '#e6bd4a'); px(c, 4, 5, 4, 1, '#3b2a10'); px(c, 4, 7, 3, 1, '#3b2a10'); }],
  flag: [24, 32, c => { px(c, 2, 0, 1, 16, '#e6e0ff'); px(c, 3, 0, 7, 5, '#ff6b9b'); px(c, 4, 1, 2, 2, '#ffd0e0'); }],
  goal: [24, 24, c => { px(c, 0, 0, 12, 12, 'rgba(124,240,200,.35)'); px(c, 2, 2, 8, 8, 'rgba(124,240,200,.6)'); px(c, 5, 3, 2, 6, '#ffffff'); px(c, 3, 5, 6, 2, '#ffffff'); }],
  memory: [24, 24, c => { px(c, 5, 0, 2, 12, '#ffffff'); px(c, 0, 5, 12, 2, '#ffffff'); px(c, 2, 2, 8, 8, 'rgba(255,255,255,.35)'); px(c, 4, 4, 4, 4, '#ffffff'); }],
  clock: [24, 24, c => { px(c, 2, 2, 8, 8, '#fff8e8'); px(c, 1, 3, 10, 6, '#fff8e8'); px(c, 5, 3, 1, 3, '#3b3560'); px(c, 5, 5, 3, 1, '#3b3560'); px(c, 2, 2, 8, 1, '#b98763'); }],
  core: [24, 32, c => { px(c, 3, 2, 6, 10, '#e6dcff'); px(c, 2, 4, 8, 6, '#b49cff'); px(c, 4, 5, 4, 4, '#ffffff'); px(c, 1, 13, 10, 3, '#5b5378'); }],
  step: [24, 24, c => { px(c, 0, 4, 12, 6, 'rgba(255,240,180,.55)'); px(c, 1, 5, 10, 4, 'rgba(255,255,255,.8)'); }],
  chair: [24, 24, c => { px(c, 3, 1, 6, 6, '#8a5f45'); px(c, 3, 7, 6, 2, '#b98763'); px(c, 3, 9, 1, 3, '#8a5f45'); px(c, 8, 9, 1, 3, '#8a5f45'); }],
  box: [24, 24, c => { px(c, 1, 3, 10, 8, '#b98763'); px(c, 1, 3, 10, 2, '#d9a983'); px(c, 5, 3, 2, 8, '#8a5f45'); }],
};

export function makeThingTextures(scene: Phaser.Scene) {
  for (const [k, [w, h, draw]] of Object.entries(DRAW)) {
    const key = `th_${k}`; if (scene.textures.exists(key)) continue;
    const t = scene.textures.createCanvas(key, w, h)!; draw(t.getContext()); t.refresh();
  }
  // 크론: 얼굴 없는 픽셀 실루엣
  if (!scene.textures.exists('cron')) {
    const t = scene.textures.createCanvas('cron', 28, 64)!; const c = t.getContext();
    const b = '#0b0820', e = '#3d4793';
    px(c, 4, 0, 6, 6, b); px(c, 3, 6, 8, 2, b); px(c, 2, 8, 10, 12, b); px(c, 1, 10, 2, 9, b); px(c, 11, 10, 2, 9, b);
    px(c, 3, 20, 3, 10, b); px(c, 8, 20, 3, 10, b); px(c, 5, 2, 4, 1, e); px(c, 2, 12, 1, 1, '#7cf0c8'); px(c, 10, 15, 1, 1, '#ff5c7a');
    t.refresh();
  }
}
