// 페이지 안에서 실행: 실제 키 입력(스틱)으로 목표 칸까지 걸어가 보는 봇
window.__walkTo = async (tx, ty, timeout = 25000) => {
  const w = window.__LS.scene.getScene('World'), IN = window.__IN, T = 24;
  const g = w.grid, R = g.length, C = g[0].length;
  const ok = (x, y) => x >= 0 && y >= 0 && x < C && y < R && !w.blocked(g[y][x]) && !w.bridges?.has?.(`${x},${y}`) === !w.bridges?.has?.(`${x},${y}`);
  const pass = (x, y) => x >= 0 && y >= 0 && x < C && y < R && (!w.blocked(g[y][x]) || w.bridges.has(`${x},${y}`));
  const cell = () => [Math.floor(w.lead.x / T), Math.floor((w.lead.y - 3) / T)];
  const bfs = (sx, sy) => {
    const prev = new Map(), k = (x, y) => x + ',' + y; const q = [[sx, sy]]; prev.set(k(sx, sy), null);
    // 목표 칸 자체가 막혀 있으면 이웃 칸이면 성공
    const goal = (x, y) => Math.abs(x - tx) + Math.abs(y - ty) <= (pass(tx, ty) ? 0 : 1);
    while (q.length) { const [x, y] = q.shift(); if (goal(x, y)) { const path = []; let c = [x, y]; while (c) { path.unshift(c); c = prev.get(k(c[0], c[1])); } return path; }
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx = x + dx, ny = y + dy; if (!prev.has(k(nx, ny)) && pass(nx, ny)) { prev.set(k(nx, ny), [x, y]); q.push([nx, ny]); } } }
    return null;
  };
  const [sx, sy] = cell(); const path = bfs(sx, sy);
  if (!path) return { ok: false, why: 'no-path', from: [sx, sy] };
  const t0 = performance.now(); let i = 1, lastProg = performance.now(), lastPos = [w.lead.x, w.lead.y];
  return await new Promise(res => {
    const tick = () => {
      if (performance.now() - t0 > timeout) { IN.setStick(0, 0); return res({ ok: false, why: 'timeout', at: cell(), step: i, len: path.length, want: path[i] }); }
      if (i >= path.length) { IN.setStick(0, 0); return res({ ok: true, steps: path.length }); }
      const [px, py] = path[i]; const gx = px * T + 12, gy = (py + 1) * T - 4;
      const dx = gx - w.lead.x, dy = gy - w.lead.y, d = Math.hypot(dx, dy);
      const c = cell();
      if (d < 5 || (c[0] === px && c[1] === py && d < 12)) { i++; return requestAnimationFrame(tick); }
      IN.setStick(dx / d * 0.8, dy / d * 0.8);
      if (Math.hypot(w.lead.x - lastPos[0], w.lead.y - lastPos[1]) > 2) { lastPos = [w.lead.x, w.lead.y]; lastProg = performance.now(); }
      if (performance.now() - lastProg > 2500) { IN.setStick(0, 0); return res({ ok: false, why: 'stuck', at: cell(), want: path[i] }); }
      requestAnimationFrame(tick);
    };
    tick();
  });
};
