// 타일과 소품을 캔버스에 직접 그려 텍스처로 만든다. (P2에서 실제 타일셋 이미지로 교체)
import Phaser from 'phaser';
import { TILE, COLS, ROWS, BUILDINGS, type Tile } from '../world/cloudVillage';

const P = 2; // 픽셀 한 칸 = 2px (24px 타일 = 12x12 도트)

function px(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: string) {
  c.fillStyle = col; c.fillRect(x * P, y * P, w * P, h * P);
}
function hash(x: number, y: number) { let h = x * 374761393 + y * 668265263; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967295; }

const PAL = {
  cloud: '#f4f5ff', cloudDot: '#e3e6fb', cloudEdge: '#c6ccf3', cloudUnder: '#a9b1e6', cloudUnder2: '#8e97d6',
  stone: '#d7d2ee', stoneLine: '#b9b2dc', stoneHi: '#e9e6f8',
  wall: '#fbe9dc', wallLine: '#e5cbb8', window: '#9ec7ff', windowHi: '#d8ebff', door: '#a2745e', doorHi: '#c08e74',
  bush: '#ffffff', bushShade: '#d4d9f6', bushDeep: '#b3bbe9',
  soil: '#8b6b5c', soilDark: '#6d5146', stem: '#9a9a8e',
  wood: '#b98763', woodDark: '#8a5f45', paper: '#fff8e8', ink: '#6f6a88',
  water: '#cfe6ff', waterHi: '#ffffff', basin: '#c9c3e6', basinDark: '#a39cc8',
  screen: '#1b2440', screenGlow: '#7cf0c8',
};

function drawTile(c: CanvasRenderingContext2D, g: Tile[][], tx: number, ty: number, roofOf: (x: number, y: number) => string) {
  const t = g[ty][tx];
  const ox = tx * 12, oy = ty * 12; // 도트 좌표
  const at = (x: number, y: number): Tile => (y < 0 || y >= ROWS || x < 0 || x >= COLS) ? ' ' : g[y][x];
  const ground = (tt: Tile) => tt !== ' ';
  if (t === ' ') {
    // 위 칸이 땅이면 구름 아랫면을 그린다
    if (ground(at(tx, ty - 1))) {
      for (let x = 0; x < 12; x++) {
        const d = 3 + Math.floor(hash(tx * 12 + x, ty) * 3);
        px(c, ox + x, oy, 1, d, PAL.cloudUnder);
        px(c, ox + x, oy + d, 1, 1, PAL.cloudUnder2);
      }
    }
    return;
  }
  // 바닥
  px(c, ox, oy, 12, 12, PAL.cloud);
  for (let i = 0; i < 5; i++) { const r = hash(tx * 31 + i, ty * 17 + i); if (r > 0.45) px(c, ox + Math.floor(r * 11), oy + Math.floor(hash(tx + i, ty * 3) * 11), 1, 1, PAL.cloudDot); }
  if (!ground(at(tx, ty - 1))) px(c, ox, oy, 12, 1, PAL.cloudEdge);
  if (!ground(at(tx - 1, ty))) px(c, ox, oy, 1, 12, PAL.cloudEdge);
  if (!ground(at(tx + 1, ty))) px(c, ox + 11, oy, 1, 12, PAL.cloudEdge);
  if (!ground(at(tx, ty + 1))) px(c, ox, oy + 11, 12, 1, PAL.cloudEdge);

  switch (t) {
    case '=': {
      px(c, ox + 1, oy + 1, 10, 10, PAL.stone);
      px(c, ox + 1, oy + 6, 10, 1, PAL.stoneLine); px(c, ox + 6, oy + 1, 1, 5, PAL.stoneLine); px(c, ox + 3, oy + 7, 1, 4, PAL.stoneLine);
      px(c, ox + 2, oy + 2, 2, 1, PAL.stoneHi); px(c, ox + 8, oy + 8, 2, 1, PAL.stoneHi);
      break;
    }
    case '^': {
      const roof = roofOf(tx, ty);
      px(c, ox, oy, 12, 12, roof);
      for (let y = 0; y < 12; y += 3) px(c, ox, oy + y + 2, 12, 1, shade(roof, -0.18));
      if (at(tx, ty - 1) !== '^') px(c, ox, oy, 12, 2, shade(roof, 0.2));
      break;
    }
    case '#': case 'D': {
      px(c, ox, oy, 12, 12, PAL.wall);
      px(c, ox, oy + 11, 12, 1, PAL.wallLine);
      if (t === 'D') { px(c, ox + 3, oy + 2, 6, 10, PAL.door); px(c, ox + 4, oy + 3, 4, 8, PAL.doorHi); px(c, ox + 7, oy + 7, 1, 1, PAL.wallLine); }
      else if ((tx + ty) % 2 === 0) { px(c, ox + 3, oy + 3, 6, 5, PAL.wallLine); px(c, ox + 4, oy + 4, 4, 3, PAL.window); px(c, ox + 4, oy + 4, 2, 1, PAL.windowHi); }
      break;
    }
    case '*': {
      px(c, ox + 2, oy + 3, 8, 8, PAL.bushShade); px(c, ox + 1, oy + 5, 10, 5, PAL.bushShade);
      px(c, ox + 3, oy + 2, 6, 7, PAL.bush); px(c, ox + 2, oy + 4, 8, 4, PAL.bush);
      px(c, ox + 3, oy + 10, 6, 1, PAL.bushDeep);
      break;
    }
    case 'f': {
      px(c, ox + 1, oy + 2, 10, 9, PAL.soil); px(c, ox + 1, oy + 10, 10, 1, PAL.soilDark);
      for (let i = 0; i < 3; i++) { const sx = ox + 2 + i * 3 + (ty % 2); px(c, sx, oy + 4, 1, 5, PAL.stem); px(c, sx + 1, oy + 4, 1, 1, PAL.stem); }
      break;
    }
    case 'W': {
      px(c, ox, oy, 12, 12, PAL.basin);
      const lx = at(tx - 1, ty) === 'W', ly = at(tx, ty - 1) === 'W';
      px(c, ox + (lx ? 0 : 2), oy + (ly ? 0 : 2), lx ? 10 : 10, ly ? 10 : 10, PAL.water);
      px(c, ox + 4, oy + 5, 3, 1, PAL.waterHi);
      if (!ly) px(c, ox, oy, 12, 1, PAL.basinDark);
      break;
    }
    case 'B': case 'M': {
      px(c, ox + 2, oy + 8, 1, 4, PAL.woodDark); px(c, ox + 9, oy + 8, 1, 4, PAL.woodDark);
      px(c, ox + 1, oy + 1, 10, 8, PAL.wood); px(c, ox + 2, oy + 2, 8, 6, PAL.paper);
      if (t === 'M') { px(c, ox + 3, oy + 3, 3, 2, '#9fd39a'); px(c, ox + 6, oy + 5, 3, 2, '#9ec7ff'); px(c, ox + 4, oy + 5, 2, 1, PAL.ink); }
      else for (let y = 3; y < 8; y += 2) px(c, ox + 3, oy + y, 6, 1, PAL.ink);
      break;
    }
    case 'C': {
      px(c, ox + 1, oy + 1, 10, 9, '#5a5f80'); px(c, ox + 2, oy + 2, 8, 6, PAL.screen);
      px(c, ox + 3, oy + 3, 4, 1, PAL.screenGlow); px(c, ox + 3, oy + 5, 6, 1, PAL.screenGlow);
      px(c, ox + 4, oy + 10, 4, 2, '#5a5f80');
      break;
    }
    case 'S': {
      px(c, ox + 1, oy, 10, 12, '#d7d2ee'); px(c, ox + 1, oy + 11, 10, 1, '#a39cc8');
      const left = at(tx - 1, ty) !== 'S';
      if (left) { px(c, ox + 3, oy - 10, 1, 12, '#8b80c4'); px(c, ox + 1, oy - 12, 14, 6, '#7fb2ff'); px(c, ox + 2, oy - 11, 12, 4, '#e1ecff'); px(c, ox + 4, oy - 10, 8, 2, '#7fb2ff'); }
      break;
    }
    case 'T': {
      px(c, ox, oy, 12, 12, '#cfc6ea'); px(c, ox, oy + 11, 12, 1, '#a39cc8');
      px(c, ox + 1, oy + 1, 10, 1, '#e2dcf6');
      break;
    }
  }
}

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + (amt > 0 ? (255 - v) * amt : v * amt))));
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function paintMap(scene: Phaser.Scene, key: string, g: Tile[][]) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, COLS * TILE, ROWS * TILE)!;
  const c = tex.getContext();
  const roofOf = (x: number, y: number) => BUILDINGS.find(b => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1)?.roof ?? '#c9a0dc';
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) drawTile(c, g, x, y, roofOf);
  tex.refresh();
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
  canvasTex(scene, 'tower', 48, 120, c => {
    px(c, 2, 14, 20, 46, '#e9e3fb'); px(c, 2, 14, 1, 46, '#cfc6ea'); px(c, 21, 14, 1, 46, '#b9b0dc');
    px(c, 0, 8, 24, 7, '#7fa7e6'); px(c, 3, 3, 18, 6, '#7fa7e6'); px(c, 7, 0, 10, 4, '#7fa7e6'); px(c, 0, 14, 24, 1, '#5d82c4');
    px(c, 6, 18, 12, 12, '#fff8e8'); px(c, 7, 19, 10, 10, '#ffffff'); px(c, 11, 20, 1, 5, '#4b4670'); px(c, 11, 24, 4, 1, '#4b4670');
    for (let y = 34; y < 56; y += 7) { px(c, 8, y, 8, 4, '#9ec7ff'); px(c, 8, y, 3, 1, '#d8ebff'); }
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
  canvasTex(scene, 'blackpx', 4, 4, c => { c.fillStyle = '#0b0820'; c.fillRect(0, 0, 4, 4); });
  canvasTex(scene, 'bloom_yellow', 24, 24, c => bloom(c, '#ffd66b', '#fff3c4'));
  canvasTex(scene, 'bloom_white', 24, 24, c => bloom(c, '#ffffff', '#ffe7f0'));
  // 하늘 배경 (반복)
  canvasTex(scene, 'sky', 256, 256, c => {
    const gr = c.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#8fb3ff'); gr.addColorStop(1, '#c7c2ff');
    c.fillStyle = gr; c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 40; i++) { c.fillStyle = i % 3 ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.9)'; c.fillRect(Math.floor(hash(i, 3) * 128) * 2, Math.floor(hash(i, 9) * 128) * 2, 2, 2); }
  });
  canvasTex(scene, 'farcloud', 128, 48, c => {
    c.fillStyle = 'rgba(255,255,255,.55)';
    const b = (x: number, y: number, w: number, h: number) => c.fillRect(x * 2, y * 2, w * 2, h * 2);
    b(8, 12, 48, 10); b(14, 8, 30, 6); b(20, 5, 14, 4); b(40, 10, 16, 4);
  });
}

function bloom(c: CanvasRenderingContext2D, petal: string, hi: string) {
  for (let i = 0; i < 3; i++) {
    const x = 1 + i * 4, y = 3 + (i % 2) * 3;
    px(c, x + 1, y, 1, 3, petal); px(c, x, y + 1, 3, 1, petal); px(c, x + 1, y + 1, 1, 1, hi);
    px(c, x + 1, y + 3, 1, 3, '#7cc06a');
  }
}

/** 구름 주민 (몽글몽글한 구름 몸 + 모자 색으로 구분) */
export function makeFolk(scene: Phaser.Scene, key: string, hat: string, kind: 'piko' | 'grandma' | 'folk') {
  if (scene.textures.exists(key)) return;
  const t = scene.textures.createCanvas(key, 36, 40)!; const c = t.getContext();
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
