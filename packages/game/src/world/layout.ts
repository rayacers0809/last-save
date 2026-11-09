// 그림 맵 위에 퀘스트 오브젝트를 놓을 자리를 고른다.
// 출발점에서 능력 없이 걸어갈 수 있는 칸만 쓰고, 이미 있는 NPC·표지판·노트와 겹치지 않게 넓게 퍼뜨린다.
// 같은 맵이면 항상 같은 자리가 나온다 (난수 없음).

export interface Pt { x: number; y: number }

const PASS = new Set(['.', ',', '=']);

export class Layout {
  readonly base: Set<number>;   // 능력 없이 갈 수 있는 칸
  readonly all: Set<number>;    // 능력을 쓰면 갈 수 있는 칸
  private used: Pt[] = [];
  private spread: Pt[] | null = null;

  constructor(private grid: string[][], private spawn: Pt, private anchors: Pt[]) {
    this.base = this.flood(t => PASS.has(t));
    this.all = this.flood(t => PASS.has(t) || t === 'X' || t === 'V' || t === 'g');
    this.used = [...anchors, spawn];
  }
  private get cols() { return this.grid[0].length; }
  private id(x: number, y: number) { return y * this.cols + x; }
  private pt(i: number): Pt { return { x: i % this.cols, y: Math.floor(i / this.cols) }; }

  private flood(pass: (t: string) => boolean) {
    const seen = new Set<number>(); const q: Pt[] = [];
    // 출발점이 막힌 칸이면 가장 가까운 통로에서 시작
    let s = this.spawn;
    if (!pass(this.grid[s.y]?.[s.x] ?? '#')) {
      let best: Pt | null = null, bd = 1e9;
      this.grid.forEach((row, y) => [...row].forEach((t, x) => { const d = (x - s.x) ** 2 + (y - s.y) ** 2; if (PASS.has(t) && d < bd) { bd = d; best = { x, y }; } }));
      if (best) s = best;
    }
    q.push(s); seen.add(this.id(s.x, s.y));
    while (q.length) {
      const p = q.shift()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = p.x + dx, y = p.y + dy; if (x < 0 || y < 0 || y >= this.grid.length || x >= this.cols) continue;
        const k = this.id(x, y); if (seen.has(k) || !pass(this.grid[y][x])) continue;
        seen.add(k); q.push({ x, y });
      }
    }
    return seen;
  }

  private minDist(p: Pt, set: Pt[]) { let m = 1e9; for (const s of set) m = Math.min(m, (s.x - p.x) ** 2 + (s.y - p.y) ** 2); return m; }
  /** 가장자리 칸은 피한다 (주변 8칸 중 6칸 이상 걸을 수 있는 칸만) */
  private roomy(i: number) {
    const p = this.pt(i); let n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (this.base.has(this.id(p.x + dx, p.y + dy))) n++;
    return n >= 7;
  }

  /** 기준점(타일) 근처 빈자리. 다른 오브젝트와 2칸 이상 떨어뜨린다 */
  near(a: Pt, gated = false): Pt {
    let best = -1, bd = 1e12;
    const pool = gated ? [...this.all].filter(i => !this.base.has(i)) : [...this.base];
    for (const i of pool) {
      if (!gated && !this.roomy(i)) continue;
      const p = this.pt(i), d = (p.x - a.x) ** 2 + (p.y - a.y) ** 2;
      if (d < bd && this.minDist(p, this.used) >= 5) { bd = d; best = i; }
    }
    if (best < 0) for (const i of pool) { const p = this.pt(i), d = (p.x - a.x) ** 2 + (p.y - a.y) ** 2; if (d < bd) { bd = d; best = i; } }
    const p = best < 0 ? a : this.pt(best);
    this.used.push(p); return p;
  }

  /** 맵 전체에 넓게 퍼진 n번째 자리 */
  far(n: number): Pt {
    if (!this.spread) {
      const pool = [...this.base].filter(i => this.roomy(i)).map(i => this.pt(i));
      const chosen: Pt[] = []; const ref = [...this.anchors, this.spawn];
      const md = pool.map(p => this.minDist(p, ref));
      for (let k = 0; k < 48 && pool.length; k++) {
        let bi = 0; for (let i = 1; i < pool.length; i++) if (md[i] > md[bi]) bi = i;
        const p = pool[bi]; chosen.push(p);
        for (let i = 0; i < pool.length; i++) md[i] = Math.min(md[i], (pool[i].x - p.x) ** 2 + (pool[i].y - p.y) ** 2);
      }
      this.spread = chosen;
    }
    const p = this.spread[n % this.spread.length] ?? this.spawn;
    // 이미 쓰인 자리와 겹치면 근처로 비킨다
    if (this.minDist(p, this.used) < 5) return this.near(p);
    this.used.push(p); return p;
  }
}
