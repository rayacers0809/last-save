// 작은 소품·주민 텍스처를 캔버스에 직접 그린다 (그림 파일이 없는 것만)
import Phaser from 'phaser';

const P = 2; // 픽셀 한 칸 = 2px (24px 타일 = 12x12 도트)

function px(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: string) {
  c.fillStyle = col; c.fillRect(x * P, y * P, w * P, h * P);
}

function canvasTex(scene: Phaser.Scene, key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  if (scene.textures.exists(key)) return;
  const t = scene.textures.createCanvas(key, w, h)!; draw(t.getContext()); t.refresh();
}

/** 공용 소품 텍스처 */
export function makeProps(scene: Phaser.Scene) {
  canvasTex(scene, 'rock', 24, 24, c => {
    px(c, 1, 3, 10, 8, '#9c93b8'); px(c, 2, 2, 8, 9, '#b4abd0'); px(c, 3, 2, 5, 2, '#cfc8e6');
    px(c, 5, 4, 1, 2, '#5b5378'); px(c, 6, 6, 1, 2, '#5b5378'); px(c, 5, 8, 1, 2, '#5b5378'); px(c, 7, 5, 2, 1, '#5b5378');
    px(c, 1, 10, 10, 1, '#7a7198');
  });
  canvasTex(scene, 'cloudstep', 24, 24, c => {
    px(c, 0, 3, 12, 7, '#ffffff'); px(c, 1, 2, 10, 9, '#ffffff'); px(c, 0, 9, 12, 2, '#cfd6ff'); px(c, 2, 3, 3, 1, '#eef1ff');
  });
  canvasTex(scene, 'point', 24, 24, c => {
    const s = '#ffe27a', d = '#e8b84a', w = '#fffbe6';
    px(c, 5, 0, 2, 3, s); px(c, 4, 3, 4, 2, s); px(c, 0, 4, 12, 2, s); px(c, 2, 6, 8, 2, s); px(c, 3, 8, 6, 1, s);
    px(c, 2, 9, 3, 2, s); px(c, 7, 9, 3, 2, s); px(c, 1, 11, 2, 1, d); px(c, 9, 11, 2, 1, d);
    px(c, 4, 5, 1, 1, '#4b4670'); px(c, 7, 5, 1, 1, '#4b4670'); px(c, 5, 7, 2, 1, '#e8869a'); px(c, 5, 1, 1, 1, w);
  });
  canvasTex(scene, 'point_por', 112, 112, c => {
    c.fillStyle = '#2a2350'; c.fillRect(0, 0, 112, 112);
    const S = 8, o = 8; const s = '#ffe27a', d = '#e8b84a';
    const r = (x: number, y: number, w: number, h: number, col: string) => { c.fillStyle = col; c.fillRect(o + x * S, o + y * S, w * S, h * S); };
    r(5, 0, 2, 3, s); r(4, 3, 4, 2, s); r(0, 4, 12, 2, s); r(2, 6, 8, 2, s); r(3, 8, 6, 1, s); r(2, 9, 3, 2, s); r(7, 9, 3, 2, s); r(1, 11, 2, 1, d); r(9, 11, 2, 1, d);
    r(4, 5, 1, 1, '#4b4670'); r(7, 5, 1, 1, '#4b4670'); r(5, 7, 2, 1, '#e8869a');
  });
  canvasTex(scene, 'note', 24, 24, c => {
    px(c, 3, 2, 7, 9, '#fff8e8'); px(c, 3, 2, 7, 1, '#ff7aa8'); px(c, 4, 5, 5, 1, '#6f6a88'); px(c, 4, 7, 4, 1, '#6f6a88'); px(c, 9, 3, 1, 8, '#e3d9c4');
  });
  canvasTex(scene, 'shadow', 32, 10, c => { c.fillStyle = 'rgba(40,30,90,0.28)'; c.beginPath(); c.ellipse(16, 5, 15, 4, 0, 0, Math.PI * 2); c.fill(); });
  canvasTex(scene, 'pixel', 2, 2, c => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, 2, 2); });
  canvasTex(scene, 'bloom_yellow', 24, 24, c => bloom(c, '#ffd66b', '#fff3c4'));
  canvasTex(scene, 'bloom_white', 24, 24, c => bloom(c, '#ffffff', '#ffe7f0'));
}

function bloom(c: CanvasRenderingContext2D, petal: string, hi: string) {
  for (let i = 0; i < 3; i++) {
    const x = 1 + i * 4, y = 3 + (i % 2) * 3;
    px(c, x + 1, y, 1, 3, petal); px(c, x, y + 1, 3, 1, petal); px(c, x + 1, y + 1, 1, 1, hi);
    px(c, x + 1, y + 3, 1, 3, '#7cc06a');
  }
}

/** 구름 주민 (몽글몽글한 구름 몸 + 모자 색으로 구분) */
export type FolkKind = 'piko' | 'grandma' | 'folk' | 'robot' | 'cat' | 'spirit' | 'cron' | 'kid';
export function makeFolk(scene: Phaser.Scene, key: string, hat: string, kind: FolkKind) {
  if (scene.textures.exists(key)) return;
  const t = scene.textures.createCanvas(key, 36, 40)!; const c = t.getContext();
  if (kind === 'robot') {
    px(c, 4, 3, 10, 9, '#b9c3dc'); px(c, 5, 4, 8, 6, '#1b2440'); px(c, 6, 6, 2, 2, '#7cf0c8'); px(c, 10, 6, 2, 2, '#7cf0c8');
    px(c, 8, 0, 2, 3, '#8a93b0'); px(c, 8, 0, 2, 1, hat); px(c, 5, 12, 8, 5, '#9aa3c4'); px(c, 3, 13, 2, 3, '#8a93b0'); px(c, 13, 13, 2, 3, '#8a93b0');
    px(c, 6, 17, 2, 2, '#6f7896'); px(c, 10, 17, 2, 2, '#6f7896'); t.refresh(); return;
  }
  if (kind === 'cat') {
    px(c, 4, 8, 10, 9, '#1d1a52'); px(c, 4, 5, 3, 3, '#1d1a52'); px(c, 11, 5, 3, 3, '#1d1a52'); px(c, 6, 10, 2, 2, '#ffd66b'); px(c, 10, 10, 2, 2, '#ffd66b');
    px(c, 8, 13, 2, 1, '#e8869a'); px(c, 14, 14, 3, 1, '#1d1a52'); px(c, 16, 11, 1, 3, '#1d1a52'); t.refresh(); return;
  }
  if (kind === 'cron') {
    px(c, 6, 0, 6, 6, '#0b0820'); px(c, 4, 6, 10, 12, '#0b0820'); px(c, 5, 18, 3, 2, '#0b0820'); px(c, 10, 18, 3, 2, '#0b0820');
    px(c, 7, 2, 4, 1, hat); px(c, 5, 9, 1, 1, '#7cf0c8'); px(c, 12, 13, 1, 1, '#ff5c7a'); t.refresh(); return;
  }
  if (kind === 'spirit') {
    px(c, 5, 2, 8, 12, 'rgba(201,232,255,.75)'); px(c, 4, 5, 10, 8, 'rgba(201,232,255,.75)'); px(c, 6, 3, 3, 4, '#ffffff');
    px(c, 7, 7, 1, 2, '#3b3560'); px(c, 10, 7, 1, 2, '#3b3560'); px(c, 5, 14, 2, 3, 'rgba(201,232,255,.5)'); px(c, 11, 14, 2, 4, 'rgba(201,232,255,.5)'); t.refresh(); return;
  }
  const W = '#ffffff', S = '#d4d9f6', D = '#9aa3dd', E = '#3b3560';
  // 몸
  px(c, 3, 8, 12, 9, S); px(c, 2, 10, 14, 6, S); px(c, 4, 7, 10, 9, W); px(c, 3, 9, 12, 6, W);
  px(c, 4, 17, 3, 2, D); px(c, 11, 17, 3, 2, D);
  // 얼굴
  px(c, 6, 10, 1, 2, E); px(c, 11, 10, 1, 2, E); px(c, 8, 13, 2, 1, '#e8869a'); px(c, 5, 12, 1, 1, '#ffc2d4'); px(c, 12, 12, 1, 1, '#ffc2d4');
  if (kind === 'piko') { // 우체부 모자와 가방
    px(c, 4, 4, 10, 3, hat); px(c, 3, 6, 12, 1, hat); px(c, 7, 3, 4, 1, hat);
    px(c, 13, 12, 4, 4, '#b98763'); px(c, 14, 13, 2, 1, '#fff8e8'); px(c, 12, 9, 1, 4, '#8a5f45');
  } else if (kind === 'grandma') { // 머릿수건과 앞치마
    px(c, 4, 5, 10, 2, '#f2b8c6'); px(c, 3, 6, 12, 1, '#f2b8c6');
    px(c, 6, 14, 6, 4, hat); px(c, 6, 14, 6, 1, '#e5cbb8');
    px(c, 5, 9, 3, 1, '#bfb6e0'); px(c, 10, 9, 3, 1, '#bfb6e0');
  } else if (kind === 'kid') { // 작은 몸 + 리본
    px(c, 4, 6, 3, 2, hat); px(c, 11, 6, 3, 2, hat); px(c, 8, 6, 2, 1, hat);
  } else { // 작은 모자
    px(c, 6, 4, 6, 3, hat); px(c, 5, 6, 8, 1, hat);
  }
  t.refresh();
}

export function makeQuestProps(scene: Phaser.Scene) {
  const ct = (key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
    if (scene.textures.exists(key)) return; const t = scene.textures.createCanvas(key, w, h)!; draw(t.getContext()); t.refresh();
  };
  ct('starpiece', 24, 24, c => {
    const s = '#fff1a6', d = '#ffd66b';
    px(c, 5, 1, 2, 2, s); px(c, 4, 3, 4, 2, s); px(c, 1, 4, 10, 2, d); px(c, 3, 6, 6, 2, d); px(c, 2, 8, 3, 2, d); px(c, 7, 8, 3, 2, d);
    px(c, 5, 4, 2, 2, '#ffffff');
  });
  ct('letter', 24, 24, c => {
    px(c, 2, 4, 9, 6, '#fff8e8'); px(c, 2, 4, 9, 1, '#e5cbb8'); px(c, 3, 5, 1, 1, '#e5cbb8'); px(c, 9, 5, 1, 1, '#e5cbb8');
    px(c, 4, 6, 1, 1, '#e5cbb8'); px(c, 8, 6, 1, 1, '#e5cbb8'); px(c, 5, 7, 3, 1, '#e5cbb8'); px(c, 6, 8, 1, 1, '#ff7aa8');
  });
  ct('vine', 24, 24, c => {
    px(c, 0, 0, 12, 12, '#5d4a52');
    for (let i = 0; i < 12; i += 3) { px(c, i, 0, 1, 12, '#3f2f36'); px(c, i + 1, (i * 5) % 9, 2, 1, '#8a8a7a'); px(c, i + 2, (i * 7) % 11, 1, 2, '#6f6f60'); }
    px(c, 4, 5, 1, 1, '#c9a0dc'); px(c, 8, 8, 1, 1, '#c9a0dc');
  });
  ct('skystar', 16, 16, c => { px(c, 3, 0, 2, 8, '#fff6d6'); px(c, 0, 3, 8, 2, '#fff6d6'); px(c, 3, 3, 2, 2, '#ffffff'); });
}
