"""도달성 검사: 능력 없이 / 능력 있을 때 각 표식에 갈 수 있는지."""
import json, sys, os
from collections import deque
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../packages/game/src/world/mapdata')
BLOCK = set(' #T*~|icXVSPbfB')
def bfs(g, start, abil, stepmax=6):
    R, C = len(g), len(g[0]); seen = {tuple(start)}; q = deque([tuple(start)])
    def ok(x, y):
        if not (0 <= x < C and 0 <= y < R): return False
        t = g[y][x]
        if abil and t in 'XVg': return True
        if t == 'g': return False
        return t not in BLOCK
    while q:
        x, y = q.popleft()
        for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
            n = (x+dx, y+dy)
            if n not in seen and ok(*n): seen.add(n); q.append(n)
            if abil:
                k = 1
                while k <= stepmax and 0 <= y+dy*k < R and 0 <= x+dx*k < C and g[y+dy*k][x+dx*k] == ' ': k += 1
                if 1 < k <= stepmax + 1:
                    n2 = (x+dx*k, y+dy*k)
                    if n2 not in seen and ok(*n2): seen.add(n2); q.append(n2)
    return seen
def adj(s, p): return any((p[0]+dx, p[1]+dy) in s for dx, dy in ((0,0),(1,0),(-1,0),(0,1),(0,-1)))
bad = 0
for f in sorted(os.listdir(D)):
    d = json.load(open(f'{D}/{f}')); g = d['grid']
    a, b = bfs(g, d['spawn'], False), bfs(g, d['spawn'], True)
    items = [('point', d.get('point'))] + [(f'npc:{k}', v) for k, v in d.get('npcs', {}).items()] + [(f'note:{k}', v) for k, v in d.get('notes', {}).items()] + \
            [(f'sign:{k}', v) for k, v in d.get('signs', {}).items()] + [(f'pos:{k}', v) for k, v in d.get('pos', {}).items()]
    out = []
    for n, p in items:
        if not p: continue
        if adj(a, p): continue
        if adj(b, p): out.append(f'{n}(능력)')
        else: out.append(f'!!{n}'); bad += 1
    st = [(x, y) for y, r in enumerate(g) for x, c in enumerate(r) if c == 'S']
    if st and not any(adj(a, p) for p in st): out.append('!!station'); bad += 1
    print(f'{d["id"]:9s} walk={len(a):5d} abil={len(b):5d}  ', ' '.join(out))
print('PROBLEMS', bad)
