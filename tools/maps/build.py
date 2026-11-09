"""그림 맵 → 게임용 배경(WebP) + 24px 충돌 격자.
config.py의 좌표는 미리보기 그림(가로 1600px) 기준. 걸을 수 있는 영역을 다각형으로 직접 그린다."""
import sys, json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, os.path.dirname(__file__))
from config import MAPS

SRC = os.environ.get('MAPSRC', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'source'))
GAME = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../packages/game/src')
PREV = os.environ.get('PREV', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'preview'))
T = 24

def shapes(lst):
    for s in lst:
        if len(s) == 4 and not isinstance(s[0], (tuple, list)): yield [(s[0], s[1]), (s[2], s[1]), (s[2], s[3]), (s[0], s[3])]
        else: yield list(s)

def build(mid, write=True):
    cfg = MAPS[mid]; sc = cfg['scale']
    src = Image.open(f'{SRC}/{mid}.png').convert('RGB')
    f = src.width / 1600.0            # 미리보기 좌표 → 원본 좌표
    k = f * sc                        # 미리보기 좌표 → 게임 월드 좌표
    W, H = round(src.width * sc), round(src.height * sc)
    cols, rows = W // T, H // T; W, H = cols * T, rows * T
    if write:
        world = src.resize((round(src.width * sc), round(src.height * sc)), Image.LANCZOS)
        if sc > 1: world = world.filter(ImageFilter.UnsharpMask(1.0, 50, 2))
        world = world.crop((0, 0, W, H))
        os.makedirs(f'{GAME}/assets/maps', exist_ok=True); world.save(f'{GAME}/assets/maps/{mid}.webp', quality=88, method=6)
    else:
        world = None

    def mask(lst):
        m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m)
        for poly in shapes(lst): d.polygon([(x * k, y * k) for x, y in poly], fill=255)
        a = np.asarray(m, dtype=np.float32).reshape(rows, T, cols, T).mean(axis=(1, 3)) / 255
        return a >= 0.5
    base = cfg.get('base', '#')
    grid = np.full((rows, cols), base, dtype='<U1')
    from scipy import ndimage
    wm = mask(cfg.get('walk', []))
    if cfg.get('base', '#') != ' ': wm = ndimage.binary_closing(wm, structure=np.ones((3, 3)), iterations=1)
    grid[wm] = '.'
    grid[mask(cfg.get('block', []))] = '#'
    for ch, *sh in cfg.get('special', []): grid[mask(sh)] = ch

    def cell(p): return int(p[0] * k / T), int(p[1] * k / T)
    def snap(p, want='.'):
        cx, cy = cell(p)
        ys, xs = np.where(grid == want)
        if not len(xs): return [cx, cy]
        i = np.argmin((xs - cx) ** 2 + (ys - cy) ** 2); return [int(xs[i]), int(ys[i])]
    # 정류장 칸이 없으면 출발점 옆 길가에 자동으로 둔다
    if not (grid == 'S').any():
        sx, sy = snap(cfg['spawn'])
        for dx in (2, -2, 3, -3, 1, -1):
            if 0 <= sx + dx < cols and grid[sy - 1, sx + dx] == '.':
                grid[sy - 1, sx + dx] = 'S'; break
    data = {'id': mid, 'cols': cols, 'rows': rows, 'w': W, 'h': H, 'grid': [''.join(r) for r in grid], 'spawn': snap(cfg['spawn'])}
    if 'point' in cfg: data['point'] = snap(cfg['point'])
    for key in ('npcs', 'notes', 'signs', 'pos'):
        if key in cfg: data[key] = {n: snap(v) for n, v in cfg[key].items()}
    if mid == 'cloud' and 'notes' in data:
        data.setdefault('pos', {}); data['pos']['_note1'] = data['notes']['cloud_01']; data['pos']['_note2'] = data['notes']['cloud_02']
    if 'veil' in cfg: data['veil'] = [round(v * k) for v in cfg['veil']]
    if True:
        os.makedirs(f'{GAME}/world/mapdata', exist_ok=True)
        json.dump(data, open(f'{GAME}/world/mapdata/{mid}.json', 'w'), ensure_ascii=False)

    # 미리보기: 막힌 곳은 어둡게, 특수 칸은 색, 표식은 이름
    if world is None:
        world = src.resize((W, H), Image.LANCZOS)
    ov = world.convert('RGBA'); lay = Image.new('RGBA', ov.size, (0, 0, 0, 0)); dr = ImageDraw.Draw(lay)
    COL = {'#': (10, 0, 30, 150), ' ': (0, 20, 90, 170), 'X': (255, 150, 0, 200), 'V': (190, 0, 255, 200), 'g': (0, 255, 255, 200), 'S': (255, 255, 0, 220), 'f': (255, 110, 200, 200)}
    for y in range(rows):
        for x in range(cols):
            c = COL.get(grid[y, x])
            if c: dr.rectangle([x * T, y * T, x * T + T - 1, y * T + T - 1], fill=c)
    for v in range(0, 1601, 50):
        dr.line([(v * k, 0), (v * k, H)], fill=(255, 255, 255, 40 if v % 100 else 110))
        dr.line([(0, v * k), (W, v * k)], fill=(255, 255, 255, 40 if v % 100 else 110))
        if v % 100 == 0:
            dr.text((v * k + 3, 3), str(v), fill=(255, 255, 0, 255), stroke_width=2, stroke_fill=(0, 0, 0, 255))
            dr.text((3, v * k + 3), str(v), fill=(0, 255, 255, 255), stroke_width=2, stroke_fill=(0, 0, 0, 255))
    def mark(p, txt, col):
        x, y = p; dr.ellipse([x * T + 3, y * T + 3, x * T + T - 3, y * T + T - 3], fill=col)
        dr.text((x * T + T, y * T), txt, fill=(255, 255, 255, 255), stroke_width=2, stroke_fill=(0, 0, 0, 255))
    mark(data['spawn'], 'SPAWN', (255, 255, 255, 255))
    if 'point' in data: mark(data['point'], 'POINT', (255, 230, 0, 255))
    for key, col in (('npcs', (80, 200, 255, 255)), ('notes', (255, 120, 220, 255)), ('signs', (255, 255, 255, 200)), ('pos', (120, 255, 120, 255))):
        for n, v in data.get(key, {}).items(): mark(v, n, col)
    ov.alpha_composite(lay); ov = ov.convert('RGB'); ov.thumbnail((1600, 1600))
    os.makedirs(PREV, exist_ok=True); ov.save(f'{PREV}/{mid}.jpg', quality=82)
    print(mid, cols, 'x', rows, 'walk', int((grid == '.').sum()))
    return data

if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('-')]
    for m in args or list(MAPS): build(m, write='--fast' not in sys.argv)
