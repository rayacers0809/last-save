"""충돌 격자 손질: 길과 사물을 구분한다.

build.py가 만든 격자(걷는 길 다각형) 위에
  - block: 길 위에 놓인 사물(벤치, 울타리, 노점, 동상, 기둥…)을 막고
  - open : 그림상 길인데 막혀 있던 곳을 연다
좌표는 타일 단위 (x0, y0, x1, y1) — x1, y1은 포함하지 않는다. 지도 보기: python3 tools/maps/collision.py --view 맵id
그리고 가로등처럼 세로로 긴 소품(occlusion.py가 찾은 조각)의 밑동 한 칸을 자동으로 막는다.
NPC·표지판·노트·포인트·출발점이 막힌 칸에 걸리면 가장 가까운 길로 옮긴다.

순서: build.py → collision.py → occlusion.py
"""
import json, os, sys
import numpy as np

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../packages/game/src/')
SPECIAL = set('XVgSf')

FIX = {}

def load(m):
    return json.load(open(ROOT + f'world/mapdata/{m}.json'))

def apply(m, orig_grid=None):
    d = load(m)
    src = orig_grid or d.get('grid_src') or d['grid']
    d['grid_src'] = src                       # build.py 원본을 보관 (다시 돌려도 결과가 같게)
    g = np.array([list(r) for r in src]); rows, cols = g.shape
    base = '#'
    fx = FIX.get(m, {})
    for x0, y0, x1, y1 in fx.get('open', []):
        sl = g[max(0, y0):min(rows, y1), max(0, x0):min(cols, x1)]; sl[~np.isin(sl, list(SPECIAL))] = '.'
    for x0, y0, x1, y1 in fx.get('block', []):
        sl = g[max(0, y0):min(rows, y1), max(0, x0):min(cols, x1)]; sl[~np.isin(sl, list(SPECIAL))] = base
    # 세로로 긴 소품 밑동
    if fx.get('auto_props', False):
        for x, y, w, h, bottom, *_ in d.get('fg', []):
            ty = (bottom - 6) // 24
            for tx in range(x // 24, (x + w - 1) // 24 + 1):
                if 0 <= ty < rows and g[ty][tx] == '.' and w <= 72: g[ty][tx] = base
    # 가장자리 한 칸은 항상 막는다
    for sl in (g[0, :], g[-1, :], g[:, 0], g[:, -1]):
        sl[sl == '.'] = base
    d['grid'] = [''.join(r) for r in g]
    walk = np.argwhere(g == '.')
    def snap(p):
        x, y = p
        if g[y][x] == '.' : return p
        i = ((walk[:, 1] - x) ** 2 + (walk[:, 0] - y) ** 2).argmin(); return [int(walk[i][1]), int(walk[i][0])]
    d['spawn'] = snap(d['spawn'])
    if d.get('point'): d['point'] = snap(d['point'])
    for key in ('npcs', 'notes', 'signs', 'pos'):
        if isinstance(d.get(key), dict):
            for k, v in d[key].items():
                if key == 'pos' and k.startswith(('piece', 'm_ttuning', 'm_shiro', '_note')): continue  # 능력으로 가는 자리는 그대로
                d[key][k] = snap(v) if key != 'signs' else v
    json.dump(d, open(ROOT + f'world/mapdata/{m}.json', 'w'), ensure_ascii=False, separators=(',', ':'))
    return g

if __name__ == '__main__':
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from collision_fix import FIX as F
    FIX.update(F)
    ids = [a for a in sys.argv[1:] if not a.startswith('-')] or list(F)
    for m in ids:
        g = apply(m); print(m, '걷는 칸', int((g == '.').sum()))
