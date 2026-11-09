// 지역 맵 그리기: 테마 팔레트 + 기본 타일 + 큰 소품. 타일 24px = 12×12 도트.
import Phaser from 'phaser';

const P = 2;
type Ctx = CanvasRenderingContext2D;
function px(c: Ctx, x: number, y: number, w: number, h: number, col: string) { c.fillStyle = col; c.fillRect(x * P, y * P, w * P, h * P); }
function hash(x: number, y: number) { let h = x * 374761393 + y * 668265263; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967295; }
function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + (amt > 0 ? (255 - v) * amt : v * amt))));
  return `#${((f(n >> 16) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).padStart(6, '0')}`;
}

export interface Theme {
  ground: string; groundDot: string; alt: string; altDot: string;
  path: string; pathLine: string;
  wall: string; wallLine: string; window: string;
  tree: [string, string, string]; trunk: string;
  bush: string; bushDark: string;
  water: string; waterHi: string; waterDeep: string;
  fence: string; lamp: string; crystal: string; crystalHi: string;
  dark: string; under: string; under2: string;
  wood: string; woodDark: string;
  edge: 'cloud' | 'cliff' | 'indoor';
  sky: [string, string]; stars: boolean; moon?: boolean;
  floorGrid?: string;
}

/** 시트에서 잘라 온 장식 스프라이트 (assets/deco). 지역마다 어울리는 걸 고른다 */
export interface DecoSet { trees: string[]; bushes: string[]; lamp: string; fence: string; bridge: string; ground?: string; path?: string }
export const DECO: Record<string, DecoSet> = {
  cloud:    { trees: ['tree_pink', 'tree_white'], bushes: ['bush_b', 'bush_c'], lamp: 'lamp', fence: 'fence_white', bridge: 'bridge_stone' },
  studio:   { trees: [], bushes: [], lamp: 'lamp', fence: 'fence_dark', bridge: 'bridge_wood' },
  mirror:   { trees: ['tree_purple', 'tree_blue'], bushes: ['bush_c', 'bush_d'], lamp: 'lamp', fence: 'fence_dark', bridge: 'bridge_wood' },
  park:     { trees: ['tree_pink', 'tree_purple'], bushes: ['bush_b', 'bush_a'], lamp: 'lamp', fence: 'fence_white', bridge: 'bridge_wood' },
  data:     { trees: [], bushes: [], lamp: 'lamp2', fence: 'fence_dark', bridge: 'bridge_stone' },
  garden:   { trees: ['tree_white', 'tree_pink'], bushes: ['bush_a'], lamp: 'lamp', fence: 'fence_white', bridge: 'bridge_stone' },
  station:  { trees: ['tree_pink'], bushes: ['bush_b', 'bush_a'], lamp: 'lamp', fence: 'fence_dark', bridge: 'bridge_wood' },
  photo:    { trees: ['tree_pink', 'tree_white', 'tree_blue'], bushes: ['bush_a', 'bush_b'], lamp: 'lamp', fence: 'fence_white', bridge: 'bridge_wood' },
  shadow:   { trees: ['tree_purple'], bushes: ['bush_d'], lamp: 'lamp2', fence: 'fence_dark', bridge: 'bridge_stone' },
  lastsave: { trees: ['tree_blue'], bushes: ['bush_c'], lamp: 'lamp2', fence: 'fence_white', bridge: 'bridge_stone' },
  trash:    { trees: ['tree_pink', 'tree_white'], bushes: ['bush_a', 'bush_c'], lamp: 'lamp', fence: 'fence_white', bridge: 'bridge_wood' },
};
/** 장식 스프라이트로 그리는 타일 (코드 그림은 건너뜀) */
export const DECO_TILES = new Set(['T', '*', 'i', 'c', 'b', 'B', 'X', '|', 'H', 'L']);

export const THEMES: Record<string, Theme> = {
  studio: {
    ground: '#3b3478', groundDot: '#463f8c', alt: '#4a3f8f', altDot: '#5a4ea6', path: '#2f2a64', pathLine: '#25204f',
    wall: '#211c4f', wallLine: '#4c4189', window: '#8d84ce', tree: ['#7cc06a', '#5a9a52', '#3d7040'], trunk: '#8a5f45',
    bush: '#5a9a52', bushDark: '#3d7040', water: '#4e51a5', waterHi: '#bebee5', waterDeep: '#2c307c',
    fence: '#6c5ba5', lamp: '#ffd9a8', crystal: '#c58cff', crystalHi: '#f2dcff', dark: '#1f1e58', under: '#1f1e58', under2: '#141238',
    wood: '#6c5ba5', woodDark: '#4c4189', edge: 'indoor', sky: ['#0c0920', '#1f1e58'], stars: false, floorGrid: '#2f2a64',
  },
  mirror: {
    ground: '#cbbfe6', groundDot: '#b9abdc', alt: '#97b0ac', altDot: '#84a29c', path: '#e2d8f2', pathLine: '#b3a6d6',
    wall: '#d8cfee', wallLine: '#9789bc', window: '#8fd0ff', tree: ['#c9a6f0', '#9b74d6', '#5b4a9a'], trunk: '#47457e',
    bush: '#597f9a', bushDark: '#3d5c74', water: '#4f8fd8', waterHi: '#c9e8ff', waterDeep: '#254a7a',
    fence: '#9789bc', lamp: '#ffe7a3', crystal: '#b88cff', crystalHi: '#f2dcff', dark: '#47457e', under: '#57639a', under2: '#1e295a',
    wood: '#8a6a8f', woodDark: '#5b4370', edge: 'cliff', sky: ['#1e295a', '#57639a'], stars: true,
  },
  park: {
    ground: '#c9b7e4', groundDot: '#b7a2d9', alt: '#957fb6', altDot: '#8470a8', path: '#e6d6ef', pathLine: '#b996c9',
    wall: '#f8ced8', wallLine: '#915ea7', window: '#ffe2a8', tree: ['#d6b3dc', '#a77fcf', '#5e4f9b'], trunk: '#3f439c',
    bush: '#6f7fbf', bushDark: '#3f439c', water: '#6a8fe0', waterHi: '#d8ecff', waterDeep: '#3f439c',
    fence: '#915ea7', lamp: '#ffd38a', crystal: '#d08cc7', crystalHi: '#f8ced8', dark: '#2e2a79', under: '#5e4f9b', under2: '#2e2a79',
    wood: '#a07a9a', woodDark: '#6b4f7a', edge: 'cliff', sky: ['#2e2a79', '#d08cc7'], stars: true,
  },
  data: {
    ground: '#26386c', groundDot: '#2c4278', alt: '#1d2753', altDot: '#26326a', path: '#3a4d82', pathLine: '#4165a7',
    wall: '#141c40', wallLine: '#3a4d82', window: '#8dc7e9', tree: ['#4165a7', '#2c447a', '#1d2753'], trunk: '#1d2753',
    bush: '#2c447a', bushDark: '#1d2753', water: '#4165a7', waterHi: '#8dc7e9', waterDeep: '#1d2753',
    fence: '#6a749f', lamp: '#8dc7e9', crystal: '#8dc7e9', crystalHi: '#e4f6ff', dark: '#161f45', under: '#1d2753', under2: '#0d1330',
    wood: '#3a4d82', woodDark: '#263867', edge: 'indoor', sky: ['#0b0f26', '#1d2753'], stars: false, floorGrid: '#3a5a9a',
  },
  garden: {
    ground: '#4b6a8f', groundDot: '#56779c', alt: '#6d8cb5', altDot: '#7b9ac0', path: '#bbbfd3', pathLine: '#8a8fb5',
    wall: '#e9e2f2', wallLine: '#aa99ca', window: '#9ec7ff', tree: ['#f0d9eb', '#d4b4e2', '#9a83c4'], trunk: '#384185',
    bush: '#3f5f86', bushDark: '#2b4468', water: '#3462a4', waterHi: '#bfe0ff', waterDeep: '#1c316d',
    fence: '#aa99ca', lamp: '#fff1b8', crystal: '#bfe0ff', crystalHi: '#ffffff', dark: '#1c316d', under: '#384185', under2: '#1c316d',
    wood: '#8a7aa8', woodDark: '#5b4f80', edge: 'cliff', sky: ['#0f1640', '#384185'], stars: true, moon: true,
  },
  station: {
    ground: '#cdb2cf', groundDot: '#bfa1c2', alt: '#a390a2', altDot: '#957f95', path: '#ecd4dc', pathLine: '#b98fa8',
    wall: '#f8dece', wallLine: '#9b73a0', window: '#ffd38a', tree: ['#f2b8d6', '#dd98c6', '#a0659a'], trunk: '#5b4a7f',
    bush: '#7d7aa6', bushDark: '#5b4a7f', water: '#6a658c', waterHi: '#e6b6ba', waterDeep: '#39356a',
    fence: '#6a658c', lamp: '#ffcf8a', crystal: '#dd98c6', crystalHi: '#f8dece', dark: '#39356a', under: '#5b4a7f', under2: '#39356a',
    wood: '#8a6a6f', woodDark: '#5b4a5f', edge: 'cliff', sky: ['#5b4a7f', '#f0a6b0'], stars: false,
  },
  photo: {
    ground: '#a9c79a', groundDot: '#98b98a', alt: '#c5d9b6', altDot: '#b4cba6', path: '#e2d6dc', pathLine: '#bc9aa6',
    wall: '#f7efea', wallLine: '#bc9aa6', window: '#a2c3cf', tree: ['#9ed08f', '#6fae6a', '#3e7a52'], trunk: '#866e87',
    bush: '#7fae78', bushDark: '#4f8058', water: '#8fc3e0', waterHi: '#ffffff', waterDeep: '#5f93b5',
    fence: '#866e87', lamp: '#ffe2a8', crystal: '#eecbd0', crystalHi: '#ffffff', dark: '#3e4d6e', under: '#866e87', under2: '#3e4d6e',
    wood: '#a07a6a', woodDark: '#6b5048', edge: 'cliff', sky: ['#a2c3cf', '#f7efea'], stars: false,
  },
  shadow: {
    ground: '#323989', groundDot: '#3a4296', alt: '#282669', altDot: '#2f2d78', path: '#413c95', pathLine: '#5551b4',
    wall: '#1d1a52', wallLine: '#5940a9', window: '#9fc3ff', tree: ['#8556d3', '#5940a9', '#323989'], trunk: '#282669',
    bush: '#413c95', bushDark: '#282669', water: '#1b1a4f', waterHi: '#8556d3', waterDeep: '#120f38',
    fence: '#5551b4', lamp: '#d3a9e1', crystal: '#9b6ed8', crystalHi: '#d3a9e1', dark: '#17143f', under: '#282669', under2: '#120f38',
    wood: '#413c95', woodDark: '#282669', edge: 'cliff', sky: ['#0d0a2a', '#413c95'], stars: true, moon: true,
  },
  lastsave: {
    ground: '#d0c6e3', groundDot: '#c0b6dc', alt: '#9fbff5', altDot: '#8fb0ee', path: '#ebe9f1', pathLine: '#91a1e9',
    wall: '#ebe9f1', wallLine: '#8489cf', window: '#9fbff5', tree: ['#9fbff5', '#5f7ad6', '#2d3b8a'], trunk: '#2d3b8a',
    bush: '#8489cf', bushDark: '#4358b5', water: '#5f7ad6', waterHi: '#ebe9f1', waterDeep: '#2d3b8a',
    fence: '#91a1e9', lamp: '#d8f0ff', crystal: '#9fbff5', crystalHi: '#ffffff', dark: '#4358b5', under: '#91a1e9', under2: '#5f7ad6',
    wood: '#8489cf', woodDark: '#4358b5', edge: 'cloud', sky: ['#4358b5', '#d0c6e3'], stars: true,
  },
  trash: {
    ground: '#b4d99a', groundDot: '#a3cb8c', alt: '#cbd7f4', altDot: '#bac8ee', path: '#f0e9f4', pathLine: '#9895d1',
    wall: '#c6bfe4', wallLine: '#9895d1', window: '#9bbaee', tree: ['#9ed08f', '#6fae6a', '#3e7a52'], trunk: '#3d4793',
    bush: '#7fae78', bushDark: '#4f8058', water: '#658bd6', waterHi: '#f0e9f4', waterDeep: '#3d4793',
    fence: '#9895d1', lamp: '#fff1b8', crystal: '#9bbaee', crystalHi: '#ffffff', dark: '#3d4793', under: '#9895d1', under2: '#5970c2',
    wood: '#9895d1', woodDark: '#5970c2', edge: 'cliff', sky: ['#5970c2', '#f0e9f4'], stars: false,
  },
};

export type RTile = ' ' | '.' | ',' | '=' | '#' | 'T' | '*' | '~' | 'H' | 'L' | '|' | 'i' | 'c' | 'X' | '?' | 'k' | 'g' | 'V' | 'r' | 'S' | 'P' | 'b' | 'f' | 'B';

/** 기본 타일 그리기 (1패스: 바닥, 2패스: 위로 솟는 것) */
export function paintRegionMap(scene: Phaser.Scene, key: string, g: RTile[][], th: Theme, secretAs: RTile = 'T', skipDeco = false) {
  const rows = g.length, cols = g[0].length;
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, cols * 24, rows * 24)!; const c = tex.getContext();
  const at = (x: number, y: number): RTile => (y < 0 || y >= rows || x < 0 || x >= cols) ? ' ' : g[y][x];
  const isGround = (t: RTile) => t !== ' ';
  const vis = (t: RTile): RTile => t === '?' ? secretAs : t;

  for (let ty = 0; ty < rows; ty++) for (let tx = 0; tx < cols; tx++) {
    const t = vis(g[ty][tx]); const ox = tx * 12, oy = ty * 12;
    if (t === ' ') {
      if (th.edge !== 'indoor' && isGround(at(tx, ty - 1))) {
        for (let x = 0; x < 12; x++) {
          const d = (th.edge === 'cloud' ? 3 : 6) + Math.floor(hash(tx * 12 + x, ty) * 3);
          px(c, ox + x, oy, 1, d, th.under); px(c, ox + x, oy + d, 1, 1, th.under2);
          if (th.edge === 'cliff' && x % 4 === 0) px(c, ox + x, oy + 2, 1, d - 3, th.under2);
        }
      }
      continue;
    }
    // 바닥
    const base = t === ',' ? th.alt : t === 'k' || t === 'g' ? th.dark : th.ground;
    const dot = t === ',' ? th.altDot : th.groundDot;
    px(c, ox, oy, 12, 12, base);
    if (th.floorGrid && t !== 'k' && t !== 'g') { px(c, ox, oy, 12, 1, th.floorGrid); px(c, ox, oy, 1, 12, th.floorGrid); }
    else if (t !== 'k' && t !== 'g') for (let i = 0; i < 4; i++) { const r = hash(tx * 31 + i, ty * 17 + i); if (r > 0.4) px(c, ox + Math.floor(r * 11), oy + Math.floor(hash(tx + i, ty * 3) * 11), 1, 1, dot); }
    if (t === ',' && hash(tx, ty) > 0.6) { px(c, ox + 3, oy + 4, 1, 1, th.crystalHi); px(c, ox + 8, oy + 8, 1, 1, th.lamp); }
    if ((t === '.' || t === ',') && th.edge !== 'indoor' && !th.floorGrid) {
      const r = hash(tx * 13, ty * 29);
      if (r > 0.72) { const gx = ox + 2 + Math.floor(r * 7), gy = oy + 3 + Math.floor(hash(tx, ty * 5) * 6); px(c, gx, gy, 1, 2, shade(base, -0.2)); px(c, gx + 2, gy + 1, 1, 2, shade(base, -0.2)); }
      if (r > 0.93) { const fx = ox + 4 + Math.floor(hash(ty, tx) * 5); px(c, fx, oy + 6, 2, 2, th.tree[0]); px(c, fx, oy + 6, 1, 1, '#ffffff'); }
    }
    if (th.edge !== 'indoor') {
      if (!isGround(at(tx, ty - 1))) px(c, ox, oy, 12, 1, shade(base, 0.25));
      if (!isGround(at(tx, ty + 1))) px(c, ox, oy + 11, 12, 1, shade(base, -0.25));
    }
    switch (t) {
      case '=': {
        px(c, ox, oy, 12, 12, th.path);
        px(c, ox, oy + 5, 12, 1, th.pathLine); px(c, ox + ((tx + ty) % 2 ? 3 : 8), oy, 1, 5, th.pathLine); px(c, ox + ((tx + ty) % 2 ? 8 : 3), oy + 6, 1, 6, th.pathLine);
        px(c, ox + 1, oy + 1, 2, 1, shade(th.path, 0.3));
        break;
      }
      case 'L': {
        px(c, ox, oy, 12, 12, th.path);
        if (skipDeco) break;
        for (let y = 0; y < 12; y += 4) { px(c, ox, oy + y + 3, 12, 1, th.pathLine); px(c, ox, oy + y, 12, 1, shade(th.path, 0.3)); }
        break;
      }
      case 'H': {
        px(c, ox, oy, 12, 12, th.wood);
        if (skipDeco) {
          const vert = (at(tx, ty - 1) === 'H' || at(tx, ty + 1) === 'H') && !(at(tx - 1, ty) === 'H' || at(tx + 1, ty) === 'H');
          px(c, ox, oy, 12, 12, th.wood);
          if (vert) for (let y = 0; y < 12; y += 3) { px(c, ox, oy + y, 12, 1, th.woodDark); px(c, ox + 1, oy + y + 1, 10, 1, shade(th.wood, 0.2)); }
          else for (let x = 0; x < 12; x += 3) { px(c, ox + x, oy, 1, 12, th.woodDark); px(c, ox + x + 1, oy + 1, 1, 10, shade(th.wood, 0.2)); }
          if (vert) { px(c, ox, oy, 1, 12, th.woodDark); px(c, ox + 11, oy, 1, 12, th.woodDark); } else { px(c, ox, oy, 12, 1, th.woodDark); px(c, ox, oy + 11, 12, 1, th.woodDark); }
          break;
        }
        for (let x = 0; x < 12; x += 4) px(c, ox + x, oy, 1, 12, th.woodDark);
        if (!['H'].includes(at(tx, ty - 1)) && at(tx, ty - 1) !== '=' ) px(c, ox, oy, 12, 1, th.woodDark);
        break;
      }
      case 'r': {
        px(c, ox, oy, 12, 12, th.alt);
        for (let x = 1; x < 12; x += 3) px(c, ox + x, oy + 2, 2, 8, th.woodDark);
        px(c, ox, oy + 3, 12, 1, '#9aa0b8'); px(c, ox, oy + 8, 12, 1, '#9aa0b8');
        break;
      }
      case '~': {
        px(c, ox, oy, 12, 12, th.water);
        if (at(tx, ty - 1) !== '~') { px(c, ox, oy, 12, 2, th.waterDeep); }
        if ((tx + ty) % 3 === 0) px(c, ox + 3, oy + 6, 4, 1, th.waterHi);
        if ((tx * 7 + ty) % 5 === 0) px(c, ox + 7, oy + 9, 2, 1, th.waterHi);
        break;
      }
      case '#': {
        px(c, ox, oy, 12, 12, th.wall);
        px(c, ox, oy + 11, 12, 1, th.wallLine);
        if (th.edge === 'indoor') { px(c, ox, oy, 12, 1, shade(th.wall, 0.15)); if ((tx + ty) % 4 === 0) px(c, ox + 4, oy + 4, 1, 1, th.wallLine); }
        if (at(tx, ty + 1) !== '#' && th.edge === 'indoor') px(c, ox, oy + 9, 12, 3, shade(th.wall, -0.3));
        break;
      }
      case 'f': {
        px(c, ox + 1, oy + 3, 10, 7, '#6e5552'); px(c, ox + 2, oy + 2, 8, 9, '#6e5552'); px(c, ox + 2, oy + 10, 8, 1, '#4f3c3a');
        for (let i = 0; i < 3; i++) { const sx = ox + 3 + i * 3; px(c, sx, oy + 4, 1, 4, '#8f8f80'); px(c, sx - 1, oy + 4, 1, 1, '#b0a0b8'); }
        break;
      }
      case 'k': { if (hash(tx, ty) > 0.7) px(c, ox + 5, oy + 5, 2, 1, shade(th.dark, 0.15)); break; }
      case 'g': { px(c, ox + 3, oy, 6, 12, shade(th.dark, -0.4)); px(c, ox + 4, oy + 2, 1, 1, '#ffd66b'); px(c, ox + 7, oy + 2, 1, 1, '#ffd66b'); break; }
      case 'S': {
        px(c, ox, oy, 12, 12, th.path); px(c, ox + 1, oy + 1, 10, 10, shade(th.path, -0.15));
        px(c, ox + 3, oy + 3, 6, 6, th.crystal); px(c, ox + 4, oy + 4, 4, 4, th.crystalHi);
        break;
      }
    }
  }
  // 2패스: 위로 솟는 것 (나무·덤불·울타리·가로등·수정·바위·덩굴·벤치·표지판)
  for (let ty = 0; ty < rows; ty++) for (let tx = 0; tx < cols; tx++) {
    const t = vis(g[ty][tx]); const ox = tx * 12, oy = ty * 12;
    if (skipDeco && DECO_TILES.has(t) && t !== 'H' && t !== 'L') continue;
    switch (t) {
      case 'T': {
        const [l, m, d] = th.tree;
        const cx = ox + 6, cy = oy - 2, R = 9 + Math.floor(hash(tx, ty) * 2);
        // 그림자 · 줄기
        c.globalAlpha = 0.25; px(c, ox - 1, oy + 8, 14, 3, '#1a1438'); c.globalAlpha = 1;
        px(c, ox + 5, oy + 4, 3, 7, th.trunk); px(c, ox + 5, oy + 4, 1, 7, shade(th.trunk, 0.25));
        // 둥근 수관 (어두운 → 밝은 순서로 겹침)
        const disc = (dx: number, dy: number, r: number, col: string) => {
          for (let y = -r; y <= r; y++) { const hw = Math.round(Math.sqrt(r * r - y * y)); px(c, cx + dx - hw, cy + dy + y, hw * 2, 1, col); }
        };
        disc(0, 1, R, shade(d, -0.25)); disc(0, 0, R - 1, d); disc(-1, -1, R - 2, m); disc(-3, -3, R - 5, l);
        for (let i = 0; i < 6; i++) { const a = hash(tx * 7 + i, ty * 3) * Math.PI * 2, rr = hash(tx + i, ty * 11) * (R - 3); px(c, Math.round(cx + Math.cos(a) * rr), Math.round(cy + Math.sin(a) * rr), 1, 1, i % 2 ? shade(l, 0.4) : d); }
        break;
      }
      case '*': {
        const cx = ox + 6, cy = oy + 6;
        const disc = (dx: number, dy: number, r: number, col: string) => { for (let y = -r; y <= r; y++) { const hw = Math.round(Math.sqrt(r * r - y * y)); px(c, cx + dx - hw, cy + dy + y, hw * 2, 1, col); } };
        c.globalAlpha = 0.25; px(c, ox + 1, oy + 10, 10, 2, '#1a1438'); c.globalAlpha = 1;
        disc(0, 1, 6, th.bushDark); disc(0, 0, 5, th.bush); disc(-2, -2, 2, shade(th.bush, 0.3));
        if (hash(tx, ty) > 0.5) { px(c, ox + 7, oy + 4, 1, 1, th.crystalHi); px(c, ox + 4, oy + 7, 1, 1, th.lamp); }
        break;
      }
      case '|': {
        px(c, ox, oy + 4, 12, 2, th.fence); px(c, ox, oy + 8, 12, 1, shade(th.fence, -0.3));
        px(c, ox + 1, oy + 2, 2, 9, shade(th.fence, -0.15)); px(c, ox + 9, oy + 2, 2, 9, shade(th.fence, -0.15));
        break;
      }
      case 'i': {
        px(c, ox + 5, oy - 6, 2, 17, shade(th.fence, -0.3)); px(c, ox + 3, oy - 9, 6, 4, th.lamp); px(c, ox + 4, oy - 8, 4, 2, '#ffffff');
        c.globalAlpha = 0.18; px(c, ox - 2, oy - 12, 16, 16, th.lamp); c.globalAlpha = 1;
        px(c, ox + 3, oy + 10, 6, 1, shade(th.fence, -0.5));
        break;
      }
      case 'c': {
        px(c, ox + 4, oy - 4, 4, 14, th.crystal); px(c, ox + 3, oy, 6, 9, th.crystal); px(c, ox + 5, oy - 3, 1, 8, th.crystalHi);
        px(c, ox + 2, oy + 4, 2, 6, shade(th.crystal, -0.2)); px(c, ox + 8, oy + 3, 2, 7, shade(th.crystal, -0.25));
        c.globalAlpha = 0.15; px(c, ox - 2, oy - 6, 16, 18, th.crystalHi); c.globalAlpha = 1;
        break;
      }

      case 'b': {
        px(c, ox + 1, oy + 4, 10, 3, th.wood); px(c, ox + 1, oy + 7, 10, 2, th.woodDark); px(c, ox + 2, oy + 9, 1, 2, th.woodDark); px(c, ox + 9, oy + 9, 1, 2, th.woodDark);
        break;
      }
      case 'B': {
        px(c, ox + 5, oy + 6, 2, 6, th.woodDark); px(c, ox + 1, oy, 10, 7, th.wood); px(c, ox + 2, oy + 1, 8, 5, '#fff8e8');
        px(c, ox + 3, oy + 2, 6, 1, '#6f6a88'); px(c, ox + 3, oy + 4, 4, 1, '#6f6a88');
        break;
      }
    }
  }
  tex.refresh();
}

export function makeSky(scene: Phaser.Scene, key: string, th: Theme) {
  if (scene.textures.exists(key)) return;
  const t = scene.textures.createCanvas(key, 256, 256)!; const c = t.getContext();
  const gr = c.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, th.sky[0]); gr.addColorStop(1, th.sky[1]);
  c.fillStyle = gr; c.fillRect(0, 0, 256, 256);
  if (th.stars) for (let i = 0; i < 46; i++) { c.fillStyle = i % 4 ? 'rgba(255,255,255,.5)' : 'rgba(255,246,214,.95)'; c.fillRect(Math.floor(hash(i, 5) * 128) * 2, Math.floor(hash(i, 11) * 128) * 2, 2, 2); }
  t.refresh();
}

// ───────────── 큰 소품 ─────────────

export interface Prop { k: string; x: number; y: number; w: number; h: number; walk?: boolean; posts?: boolean; color?: string; label?: string; text?: string; art?: string; fit?: number; sink?: number }

/** 소품마다 위로 솟는 높이 (타일) */
const UP: Record<string, number> = {
  mirror: 3, house: 2, ferris: 6, coaster: 2, carousel: 3, stall: 1, booth: 1, balloon: 2, fountain: 1, arch: 3,
  bigscreen: 1, rack: 1, core: 2, desk: 1, deskbig: 1, terminal: 1, gazebo: 4, statue: 2, stationhouse: 3, train: 1,
  polaroid: 0, tower: 5, cube: 3, pillar: 3, shelf: 1, bed: 0, rug: 0, armchair: 1, plant: 1, neon: 0, window: 0, frame: 0,
  bunny: 2, crt: 1, monitors: 1, altar: 2, chair: 1,
};

export function propTexture(scene: Phaser.Scene, key: string, p: Prop, th: Theme) {
  if (scene.textures.exists(key)) return;
  const up = UP[p.k] ?? 1;
  const W = p.w * 12, H = (p.h + up) * 12;
  const t = scene.textures.createCanvas(key, W * P, H * P)!; const c = t.getContext();
  const fy = up * 12; // 발판 시작 도트
  const D = DRAW[p.k];
  if (D) D(c, W, H, fy, th, p);
  t.refresh();
}
export const propUp = (k: string) => UP[k] ?? 1;

type Drawer = (c: Ctx, W: number, H: number, fy: number, th: Theme, p: Prop) => void;
const glow = (c: Ctx, x: number, y: number, w: number, h: number, col: string, a = 0.18) => { c.globalAlpha = a; px(c, x, y, w, h, col); c.globalAlpha = 1; };
function catFace(c: Ctx, x: number, y: number, s: number, col: string) {
  px(c, x, y + s, 8 * s, 6 * s, col); px(c, x, y, 2 * s, 2 * s, col); px(c, x + 6 * s, y, 2 * s, 2 * s, col);
  px(c, x + 2 * s, y + 3 * s, s, s, '#1d2753'); px(c, x + 5 * s, y + 3 * s, s, s, '#1d2753'); px(c, x + 3 * s, y + 5 * s, 2 * s, Math.max(1, s / 2) | 0 || 1, '#ff9cc6');
}

const DRAW: Record<string, Drawer> = {
  mirror: (c, W, H, fy, th) => {
    const gold = '#e6c97a', goldD = '#b08f4a';
    px(c, 2, 2, W - 4, H - 4, goldD); px(c, 3, 3, W - 6, H - 6, gold);
    px(c, 5, 6, W - 10, H - 12, '#2a3a7a');
    for (let y = 6; y < H - 6; y++) px(c, 5, y, W - 10, 1, y % 4 < 2 ? '#7fb2ff' : '#9fc9ff');
    px(c, 7, 8, 3, H - 18, '#e6f2ff');
    px(c, W / 2 - 2, 0, 4, 4, gold); px(c, 3, H - 4, W - 6, 4, goldD);
    glow(c, 0, 0, W, H, th.crystalHi, 0.12);
  },
  house: (c, W, H, fy, th, p) => {
    const roof = p.color ?? '#7d5aa6', top = 6;
    px(c, 0, top + 4, W, 14, shade(roof, -0.25)); px(c, 1, top, W - 2, 16, roof);
    for (let y = top + 2; y < top + 16; y += 4) px(c, 1, y, W - 2, 1, shade(roof, -0.15));
    px(c, W / 2 - 3, top - 6, 6, 8, shade(roof, -0.1)); px(c, W / 2 - 2, top - 4, 4, 3, th.window);
    const wy = top + 16;
    px(c, 1, wy, W - 2, H - wy, th.wall); px(c, 1, H - 2, W - 2, 2, th.wallLine);
    for (let x = 4; x < W - 6; x += 10) { if (Math.abs(x + 3 - W / 2) < 6) continue; px(c, x, wy + 5, 6, 6, th.wallLine); px(c, x + 1, wy + 6, 4, 4, th.window); px(c, x + 1, wy + 6, 2, 1, '#ffffff'); }
    px(c, W / 2 - 3, H - 12, 6, 10, th.woodDark); px(c, W / 2 - 2, H - 11, 4, 9, th.wood); px(c, W / 2 + 1, H - 7, 1, 1, '#e6c97a');
    if (p.label) { px(c, W / 2 - 8, wy + 1, 16, 4, th.woodDark); px(c, W / 2 - 7, wy + 2, 14, 2, '#fff8e8'); }
  },
  ferris: (c, W, H, fy, th) => {
    const cx = W / 2, cy = fy - 20, r = Math.min(W / 2 - 2, 44);
    // 받침
    px(c, cx - 14, fy + 4, 28, H - fy - 4, shade(th.wall, -0.2));
    for (let i = 0; i < 2; i++) { const s = i ? 1 : -1; for (let y = 0; y < H - cy; y += 2) px(c, cx + s * (y * 0.35) - 1, cy + y, 2, 2, '#9b8fbf'); }
    for (let a = 0; a < 360; a += 4) { const rad = a * Math.PI / 180; px(c, Math.round(cx + Math.cos(rad) * r), Math.round(cy + Math.sin(rad) * r), 2, 2, '#f8ced8'); }
    for (let a = 0; a < 360; a += 30) {
      const rad = a * Math.PI / 180;
      for (let k = 4; k < r; k += 3) px(c, Math.round(cx + Math.cos(rad) * k), Math.round(cy + Math.sin(rad) * k), 1, 1, '#d6b3dc');
      const gx = Math.round(cx + Math.cos(rad) * r), gy = Math.round(cy + Math.sin(rad) * r);
      const cols = ['#ff9cc6', '#ffd66b', '#9fe0c4', '#9ec7ff'];
      px(c, gx - 3, gy + 1, 6, 5, cols[(a / 30) % 4]); px(c, gx - 2, gy + 2, 4, 2, '#fff8e8');
    }
    px(c, cx - 3, cy - 3, 6, 6, '#e6c97a');
    glow(c, cx - r, cy - r, r * 2, r * 2, '#ffd38a', 0.06);
  },
  coaster: (c, W, H, fy, th) => {
    for (let x = 0; x < W; x += 1) { const y = Math.round(fy - 6 + Math.sin(x / 9) * 6); px(c, x, y, 1, 2, '#e6d6ef'); px(c, x, y + 4, 1, 1, '#b996c9'); }
    for (let x = 4; x < W; x += 10) { const y = Math.round(fy - 6 + Math.sin(x / 9) * 6); px(c, x, y + 2, 2, H - y - 2, '#7a6aa8'); px(c, x - 2, H - 2, 6, 2, '#5e4f9b'); }
    const cx = Math.floor(W * 0.3), cy = Math.round(fy - 6 + Math.sin(cx / 9) * 6);
    px(c, cx, cy - 5, 14, 5, '#ff7aa8'); px(c, cx + 2, cy - 4, 3, 2, '#ffe2a8'); px(c, cx + 8, cy - 4, 3, 2, '#ffe2a8');
  },
  carousel: (c, W, H, fy, th) => {
    const top = 4;
    for (let x = 0; x < W; x++) { const stripe = Math.floor(x / 6) % 2 ? '#f8ced8' : '#ff9cc6'; const hgt = 18 - Math.abs(x - W / 2) * 0.25; px(c, x, top + 18 - hgt, 1, hgt, stripe); }
    px(c, 0, top + 18, W, 3, '#e6c97a'); px(c, W / 2 - 2, 0, 4, 6, '#e6c97a');
    for (let x = 3; x < W; x += 6) px(c, x, top + 21, 1, H - top - 27, '#e6c97a');
    px(c, 0, H - 8, W, 8, '#d6b3dc'); px(c, 0, H - 8, W, 1, '#fff'); px(c, 0, H - 2, W, 2, '#915ea7');
    for (let x = 5; x < W - 6; x += 9) { px(c, x, H - 18, 6, 4, '#ffffff'); px(c, x + 4, H - 20, 2, 3, '#ffffff'); px(c, x + 1, H - 14, 1, 3, '#d6b3dc'); px(c, x + 4, H - 14, 1, 3, '#d6b3dc'); }
    glow(c, 0, top, W, H - top, '#ffd38a', 0.1);
  },
  stall: (c, W, H, fy, th, p) => {
    const col = p.color ?? '#ff9cc6';
    for (let x = 0; x < W; x++) px(c, x, 2, 1, 8, Math.floor(x / 4) % 2 ? col : '#fff8e8');
    px(c, 0, 10, W, 2, shade(col, -0.3));
    px(c, 2, 12, 2, H - 14, th.woodDark); px(c, W - 4, 12, 2, H - 14, th.woodDark);
    px(c, 1, H - 10, W - 2, 8, th.wood); px(c, 1, H - 10, W - 2, 1, shade(th.wood, 0.3));
    for (let x = 5; x < W - 5; x += 6) px(c, x, H - 13, 3, 3, ['#ffd66b', '#9fe0c4', '#ff7aa8'][(x / 6 | 0) % 3]);
  },
  booth: (c, W, H, fy, th, p) => {
    const col = p.color ?? '#9ec7ff';
    px(c, 1, 2, W - 2, 6, col); px(c, 0, 8, W, 2, shade(col, -0.3));
    px(c, 2, 10, W - 4, H - 12, th.wall); px(c, 4, 12, W - 8, 6, th.window); px(c, 2, H - 2, W - 4, 2, th.wallLine);
  },
  balloon: (c, W, H, fy, th) => {
    const cols = ['#ff7aa8', '#ffd66b', '#9fe0c4', '#9ec7ff', '#c9a6f0'];
    for (let i = 0; i < 5; i++) { const x = 4 + i * 3.5, y = 2 + (i % 2) * 5; px(c, x, y, 5, 6, cols[i]); px(c, x + 1, y + 1, 1, 2, '#ffffff'); px(c, x + 2, y + 6, 1, fy + 6 - y, '#ffffff'); }
    px(c, 2, H - 12, W - 4, 8, th.wood); px(c, 4, H - 4, 3, 3, '#4a3a3a'); px(c, W - 7, H - 4, 3, 3, '#4a3a3a');
  },
  fountain: (c, W, H, fy, th) => {
    px(c, 1, fy + 2, W - 2, H - fy - 3, shade(th.path, -0.25)); px(c, 3, fy + 4, W - 6, H - fy - 8, th.water);
    px(c, 5, fy + 6, W - 10, 2, th.waterHi);
    px(c, W / 2 - 3, fy - 4, 6, 12, shade(th.path, -0.1)); px(c, W / 2 - 1, 2, 2, fy, th.waterHi); glow(c, W / 2 - 6, 0, 12, fy + 2, th.waterHi, 0.25);
  },
  arch: (c, W, H, fy, th) => {
    const col = th.wall;
    px(c, 0, 4, 4, H - 4, col); px(c, W - 4, 4, 4, H - 4, col); px(c, 0, 2, W, 5, col); px(c, 2, 0, W - 4, 3, shade(col, 0.2));
    for (let x = 3; x < W - 3; x += 4) px(c, x, 7, 2, 3, th.tree[0]);
    px(c, 1, 4, 2, H - 6, shade(col, -0.2)); px(c, W - 3, 4, 2, H - 6, shade(col, -0.2));
  },
  bigscreen: (c, W, H, fy, th) => {
    px(c, 0, 0, W, H, '#0d1330'); px(c, 2, 2, W - 4, H - 4, '#2c6fd0');
    for (let y = 2; y < H - 2; y += 3) px(c, 2, y, W - 4, 1, '#3a86e8');
    catFace(c, W / 2 - 16, 4, 4, '#bfe8ff');
    glow(c, 0, 0, W, H, '#8dc7e9', 0.2);
  },
  rack: (c, W, H, fy, th) => {
    px(c, 1, 2, W - 2, H - 3, '#141c40'); px(c, 2, 3, W - 4, H - 5, '#1d2753');
    for (let y = 5; y < H - 3; y += 4) { px(c, 3, y, W - 6, 2, '#26386c'); px(c, 4, y, 1, 1, (y % 8) ? '#7cf0c8' : '#ff8aa0'); px(c, 6, y, 1, 1, '#8dc7e9'); }
  },
  core: (c, W, H, fy, th) => {
    px(c, 2, H - 14, W - 4, 12, '#2c447a'); px(c, 4, H - 12, W - 8, 8, '#4165a7'); px(c, 2, H - 3, W - 4, 2, '#141c40');
    px(c, W / 2 - 6, 4, 12, H - 18, '#8dc7e9'); px(c, W / 2 - 4, 6, 8, H - 22, '#e4f6ff');
    glow(c, W / 2 - 14, 0, 28, H - 10, '#8dc7e9', 0.22);
    for (let i = 0; i < 6; i++) px(c, W / 2 - 10 + i * 4, 10 + (i % 3) * 6, 1, 1, '#ffffff');
  },
  desk: (c, W, H, fy, th) => {
    px(c, 0, H - 10, W, 4, th.wood); px(c, 1, H - 6, 2, 6, th.woodDark); px(c, W - 3, H - 6, 2, 6, th.woodDark);
    px(c, W / 2 - 7, H - 22, 14, 11, '#0d1330'); px(c, W / 2 - 6, H - 21, 12, 8, th.window); px(c, W / 2 - 1, H - 13, 2, 3, '#0d1330');
    glow(c, W / 2 - 9, H - 24, 18, 14, th.window, 0.2);
  },
  deskbig: (c, W, H, fy, th) => {
    px(c, 0, H - 10, W, 4, th.wood); px(c, 1, H - 6, 2, 6, th.woodDark); px(c, W - 3, H - 6, 2, 6, th.woodDark);
    for (let x = 4; x < W - 14; x += 16) { px(c, x, H - 24, 14, 13, '#0d1330'); px(c, x + 1, H - 23, 12, 10, ['#8dc7e9', '#c58cff', '#7cf0c8'][(x / 16 | 0) % 3]); }
    glow(c, 0, H - 26, W, 16, '#8d84ce', 0.18);
  },
  terminal: (c, W, H, fy, th) => {
    px(c, 1, 2, W - 2, H - 4, '#2c447a'); px(c, 2, 3, W - 4, 8, '#0d1330'); px(c, 3, 5, 5, 1, '#7cf0c8'); px(c, 3, 7, 7, 1, '#7cf0c8'); px(c, 3, 9, 3, 1, '#7cf0c8');
  },
  gazebo: (c, W, H, fy, th) => {
    const dome = '#3462a4';
    px(c, 2, H - 8, W - 4, 7, '#d8d0ec'); px(c, 2, H - 8, W - 4, 1, '#ffffff'); px(c, 2, H - 2, W - 4, 2, '#8a8fb5');
    for (let x = 4; x < W - 3; x += Math.floor((W - 8) / 4)) px(c, x, 20, 3, H - 28, '#f0ecf8');
    px(c, 0, 18, W, 4, '#e6c97a');
    for (let y = 0; y < 18; y++) { const half = Math.round(Math.sqrt(Math.max(0, 1 - ((18 - y) / 18) ** 2)) * (W / 2 - 2)); px(c, W / 2 - half, y + 2, half * 2, 1, y % 5 === 0 ? '#e6c97a' : dome); }
    px(c, W / 2 - 1, 0, 2, 4, '#e6c97a');
    glow(c, 4, 22, W - 8, H - 30, '#fff1b8', 0.12);
  },
  statue: (c, W, H, fy, th) => {
    px(c, 1, H - 8, W - 2, 7, '#8a8fb5'); px(c, 1, H - 8, W - 2, 1, '#bbbfd3');
    px(c, 4, 6, 4, H - 14, '#e9e2f2'); px(c, 3, 2, 6, 6, '#e9e2f2'); px(c, 2, 9, 2, 6, '#d8d0ec'); px(c, 8, 9, 2, 6, '#d8d0ec');
  },
  stationhouse: (c, W, H, fy, th) => {
    const roof = '#6a5a9a', top = 4;
    px(c, 0, top + 10, W, 24, shade(roof, -0.25)); px(c, 2, top + 4, W - 4, 26, roof);
    for (let y = top + 6; y < top + 30; y += 4) px(c, 2, y, W - 4, 1, shade(roof, -0.15));
    px(c, W / 2 - 10, 0, 20, top + 18, roof); px(c, W / 2 - 7, 4, 14, 14, '#fff8e8'); px(c, W / 2 - 6, 5, 12, 12, '#ffffff');
    px(c, W / 2, 7, 1, 5, '#4b4670'); px(c, W / 2, 11, 4, 1, '#4b4670');
    const wy = top + 30;
    px(c, 2, wy, W - 4, H - wy, th.wall); px(c, 2, H - 2, W - 4, 2, th.wallLine);
    for (let x = 6; x < W - 10; x += 12) { if (Math.abs(x + 4 - W / 2) < 10) continue; px(c, x, wy + 4, 8, 10, th.wallLine); px(c, x + 1, wy + 5, 6, 8, th.window); }
    px(c, W / 2 - 8, H - 18, 16, 16, th.woodDark); px(c, W / 2 - 7, H - 17, 6, 15, th.window); px(c, W / 2 + 1, H - 17, 6, 15, th.window);
    px(c, W / 2 - 14, wy + 1, 28, 4, '#5b4a7f'); px(c, W / 2 - 12, wy + 2, 24, 2, '#ffe2a8');
    glow(c, 0, wy, W, H - wy, '#ffcf8a', 0.08);
  },
  train: (c, W, H, fy, th, p) => {
    const body = p.color ?? '#9b6a5a';
    px(c, 0, 4, W, H - 8, shade(body, -0.3)); px(c, 1, 3, W - 2, H - 9, body); px(c, 1, 3, W - 2, 2, shade(body, 0.2));
    for (let x = 4; x < W - 6; x += 8) { px(c, x, 8, 5, 6, '#3a3054'); px(c, x + 1, 9, 3, 4, '#ffd38a'); }
    px(c, 0, H - 6, W, 2, '#4a3a4a');
    for (let x = 4; x < W; x += 14) { px(c, x, H - 5, 4, 4, '#2a2030'); }
  },
  polaroid: (c, W, H, fy, th) => {
    px(c, 1, 2, W - 2, H - 3, '#d8d0d8'); px(c, 2, 1, W - 4, H - 4, '#ffffff');
    px(c, 4, 3, W - 8, H - 12, '#a2c3cf'); px(c, 4, H - 16, W - 8, 6, '#9ed08f');
    px(c, 8, H - 22, 6, 6, '#f7efea'); px(c, 7, H - 24, 8, 3, '#e7799b');
  },
  tower: (c, W, H, fy, th) => {
    px(c, 0, 4, W, H - 4, '#1d1a52'); px(c, 1, 2, W - 2, H - 4, '#282669');
    px(c, W / 2 - 2, 0, 4, 4, '#413c95');
    for (let y = 6; y < H - 6; y += 5) for (let x = 3; x < W - 3; x += 5) { const lit = hash(x * 3 + W, y * 7 + H) > 0.4; px(c, x, y, 3, 3, lit ? th.window : '#1b1a4f'); }
    px(c, W / 2 - 3, H - 9, 6, 8, '#120f38'); glow(c, 0, 0, W, H, '#8556d3', 0.08);
  },
  cube: (c, W, H, fy, th) => {
    px(c, 2, H - 10, W - 4, 9, '#8489cf'); px(c, 4, H - 12, W - 8, 3, '#ebe9f1'); px(c, 2, H - 2, W - 4, 2, '#4358b5');
    const s = Math.min(W - 16, 28), x0 = W / 2 - s / 2, y0 = 6;
    px(c, x0, y0, s, s, '#5f7ad6'); px(c, x0 + 2, y0 + 2, s - 4, s - 4, '#9fbff5'); px(c, x0 + 5, y0 + 5, s - 10, s - 10, '#d8f0ff');
    px(c, x0 + 2, y0 + 2, 3, s - 4, '#ffffff');
    glow(c, x0 - 8, y0 - 6, s + 16, s + 16, '#d8f0ff', 0.25);
    for (let i = 0; i < 5; i++) px(c, x0 - 6 + i * 9, y0 + s + 4 + (i % 2) * 3, 1, 3, '#ffffff');
  },
  pillar: (c, W, H, fy, th) => {
    px(c, 2, H - 4, W - 4, 3, '#8489cf');
    px(c, 3, 4, W - 6, H - 8, th.crystal); px(c, 4, 4, 2, H - 8, th.crystalHi); px(c, 2, 2, W - 4, 3, '#ebe9f1');
    glow(c, 0, 0, W, H, th.crystalHi, 0.16);
  },
  shelf: (c, W, H, fy, th) => {
    px(c, 0, 0, W, H, '#4c4189'); px(c, 1, 1, W - 2, H - 2, '#2c2766');
    const cols = ['#ff9cc6', '#9ec7ff', '#ffd66b', '#9fe0c4', '#c9a6f0'];
    for (let y = 2; y < H - 2; y += 8) { px(c, 1, y + 6, W - 2, 1, '#6c5ba5'); for (let x = 2; x < W - 3; x += 3) px(c, x, y + 1 + (x % 2), 2, 5 - (x % 2), cols[(x + y) % 5]); }
  },
  bed: (c, W, H, fy, th) => {
    px(c, 0, 0, W, H, '#6c5ba5'); px(c, 1, 1, W - 2, H - 2, '#e6e2f6'); px(c, 2, 2, W - 4, 8, '#ffffff');
    px(c, 1, 14, W - 2, H - 15, '#b9b0e6'); for (let y = 16; y < H - 2; y += 4) px(c, 1, y, W - 2, 1, '#a69ddb');
  },
  rug: (c, W, H, fy, th) => {
    px(c, 2, 2, W - 4, H - 4, '#e9b6d8'); px(c, 3, 3, W - 6, H - 6, '#f4cde6');
    catFace(c, W / 2 - 8, H / 2 - 7, 2, '#e9b6d8');
  },
  armchair: (c, W, H, fy, th) => {
    px(c, 1, H - 16, W - 2, 15, '#f0ecf8'); px(c, 0, H - 12, 3, 10, '#d8d0ec'); px(c, W - 3, H - 12, 3, 10, '#d8d0ec');
    px(c, W / 2 - 6, H - 22, 12, 10, '#ffffff'); px(c, W / 2 - 6, H - 25, 3, 4, '#ffffff'); px(c, W / 2 + 3, H - 25, 3, 4, '#ffffff');
    px(c, W / 2 - 3, H - 18, 1, 2, '#3b3560'); px(c, W / 2 + 2, H - 18, 1, 2, '#3b3560'); px(c, W / 2 - 4, H - 14, 8, 3, '#9ec7ff');
  },
  plant: (c, W, H, fy, th) => {
    px(c, 3, H - 7, 6, 6, '#b98763'); px(c, 2, H - 8, 8, 2, '#8a5f45');
    px(c, 2, 2, 8, H - 10, '#5a9a52'); px(c, 4, 0, 4, 4, '#7cc06a'); px(c, 0, 6, 4, 4, '#7cc06a'); px(c, 8, 5, 4, 4, '#7cc06a');
  },
  neon: (c, W, H, fy, th) => {
    px(c, 1, 2, W - 2, H - 4, '#1f1e58'); px(c, 1, 2, W - 2, 1, '#c58cff'); px(c, 1, H - 3, W - 2, 1, '#c58cff');
    catFace(c, 4, 5, 2, '#ff9cc6'); px(c, 24, 9, W - 30, 2, '#9ec7ff'); px(c, 24, 13, W - 36, 2, '#9ec7ff');
    glow(c, 0, 0, W, H, '#c58cff', 0.2);
  },
  window: (c, W, H, fy, th) => {
    px(c, 0, 0, W, H, '#6c5ba5'); px(c, 2, 2, W - 4, H - 4, '#1f2a6a');
    for (let i = 0; i < 14; i++) px(c, 3 + Math.floor(hash(i, 2) * (W - 6)), 3 + Math.floor(hash(i, 9) * (H - 6)), 1, 1, '#fff6d6');
    px(c, W / 2 - 1, 2, 2, H - 4, '#6c5ba5'); px(c, W - 10, 5, 4, 4, '#fff1c4');
  },
  frame: (c, W, H, fy, th) => {
    px(c, 2, 1, W - 4, H - 2, '#b98763'); px(c, 4, 3, W - 8, H - 6, '#2a2150');
  },
  bunny: (c, W, H, fy, th) => {
    const w = '#ffffff', s = '#e8e2f6', pk = '#ffb3d4';
    px(c, 8, H - 22, W - 16, 20, s); px(c, 9, H - 23, W - 18, 20, w);
    px(c, W / 2 - 12, 10, 24, 20, w); px(c, W / 2 - 13, 14, 26, 14, w);
    px(c, W / 2 - 9, 0, 5, 14, w); px(c, W / 2 + 4, 0, 5, 14, w); px(c, W / 2 - 8, 2, 3, 10, pk); px(c, W / 2 + 5, 2, 3, 10, pk);
    px(c, W / 2 - 6, 18, 2, 3, '#3b3560'); px(c, W / 2 + 4, 18, 2, 3, '#3b3560'); px(c, W / 2 - 1, 22, 2, 1, '#e8869a');
    px(c, W / 2 - 4, 30, 8, 3, pk); px(c, 4, H - 12, 6, 8, w); px(c, W - 10, H - 12, 6, 8, w);
  },
  crt: (c, W, H, fy, th) => {
    px(c, 0, 2, W, H - 4, '#c6bfe4'); px(c, 1, 3, W - 2, H - 6, '#e6e2f6'); px(c, 4, 6, W - 8, H - 16, '#3d4793');
    px(c, 5, 7, W - 10, H - 18, '#9bbaee'); catFace(c, W / 2 - 8, 9, 2, '#e4f6ff');
    px(c, W / 2 - 6, H - 4, 12, 3, '#9895d1');
  },
  monitors: (c, W, H, fy, th) => {
    const pos = [[1, H - 14], [W / 2 - 6, H - 22], [W - 14, H - 16], [W / 2 - 2, H - 12]];
    pos.forEach(([x, y], i) => { px(c, x, y, 13, 11, '#c6bfe4'); px(c, x + 1, y + 1, 11, 8, ['#9bbaee', '#3d4793', '#c9a6f0', '#9fe0c4'][i]); });
  },
  altar: (c, W, H, fy, th) => {
    px(c, 2, H - 8, W - 4, 7, '#9789bc'); px(c, 2, H - 8, W - 4, 1, '#d8cfee');
    px(c, W / 2 - 3, 4, 6, H - 12, th.crystal); px(c, W / 2 - 1, 4, 2, H - 14, th.crystalHi);
    glow(c, W / 2 - 10, 0, 20, H - 6, th.crystalHi, 0.2);
  },
  chair: (c, W, H, fy, th) => {
    px(c, 3, H - 16, 6, 8, '#2c2766'); px(c, 2, H - 9, 8, 3, '#2c2766'); px(c, 5, H - 6, 2, 4, '#1f1e58'); px(c, 2, H - 2, 8, 1, '#1f1e58');
  },
};
