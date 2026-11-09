window.__sleep = ms => new Promise(r => setTimeout(r, ms));
window.__T = {
  W() { return __LS.scene.getScene('World'); },
  place(x, y) { const w = this.W(); w.lead.x = x; w.lead.y = y; w.hist.forEach(h => { h.x = x; h.y = y; }); w.followers().forEach(a => { a.x = x; a.y = y; }); },
  thing(id) { const t = this.W().things.find(x => x.def.id === id); return t ? { x: t.x, y: t.y, vis: t.spr.visible, tile: t.tile } : null; },
  tpThing(id) { const t = this.W().things.find(x => x.def.id === id); if (!t) return 'missing ' + id; this.place(t.x, t.y + 2); return t.spr.visible; },
  tpNpc(id) { const f = this.W().folks.find(x => x.id === id); if (!f) return 'missing ' + id; this.place(f.x, f.y + 6); return f.spr.visible; },
  tpPoint() { const w = this.W(); const p = w.pointSpot; this.place(p.x * 24 + 12, (p.y + 1) * 24 + 4); },
  lead(id) { __IN.press('num' + (['rumung','dodamhi','dotcha','ttuning','bigwin','haming','darae','eune','shiro'].indexOf(id) + 1)); },
  busy() { const ui = __LS.scene.getScene('UI'), pz = __LS.scene.getScene('Puzzle'); return ui.active || ui.menuBox.visible || pz.sys.isActive() || this.W().lock; },
  async drain(ms = 20000, pick = 0) {
    const t0 = performance.now(); let quiet = 0;
    while (performance.now() - t0 < ms) {
      const ui = __LS.scene.getScene('UI'), pz = __LS.scene.getScene('Puzzle');
      if (pz.sys.isActive()) { if (!pz.over) pz.finish(window.__puzzleResult || 'ok'); quiet = 0; }
      else if (ui.choosing) { ui.choiceIdx = pick; __IN.press('confirm'); quiet = 0; }
      else if (ui.active || ui.menuBox.visible) { __IN.press('confirm'); quiet = 0; }
      else if (!this.W().sys.isActive() || this.W().lock) quiet = 0;
      else if (++quiet > 4) return true;
      await __sleep(110);
    }
    return 'timeout';
  },
  async act(kind, pick = 0) { __IN.press(kind === 'q' ? 'ability' : 'confirm'); await __sleep(150); return this.drain(20000, pick); },
  F(k) { return __GS.flag(k); },
  travel(map) { const w = this.W(); w.scene.restart({ from: 'travel', map }); },
};
