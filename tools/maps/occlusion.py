"""건물·가로등 앞뒤 가림 처리용 전경 조각 만들기.

원화 맵에서 '걷는 칸' 위에 그려진 세로로 긴 소품(가로등, 거울, 기둥 등)을 찾아
assets/maps/<id>_fg.png(그 픽셀만 남긴 투명 PNG)와 mapdata/<id>.json의 "fg" 목록으로 저장한다.
게임은 캐릭터 발이 조각의 밑동보다 위(뒤)에 있으면 조각을 캐릭터 위에 그린다.

사용: python3 tools/maps/occlusion.py [맵id ...]
"""
import json, sys, os
import numpy as np
from PIL import Image
from scipy import ndimage
from scipy.cluster.vq import kmeans2

ROOT = os.path.join(os.path.dirname(__file__), '../../packages/game/src/')
T = 24
THR = 45          # 바닥 색에서 이만큼 멀면 소품 픽셀
MAXW = 80         # 이보다 넓은 덩어리는 제외 (벽·바닥 무늬 오검출 방지)

def run(m):
    jp = ROOT + f'world/mapdata/{m}.json'
    d = json.load(open(jp)); g = np.array([list(r) for r in d['grid']])
    img = Image.open(ROOT + f'assets/maps/{m}.webp').convert('RGBA')
    im = np.array(img).astype(float)[:, :, :3]; H, W, _ = im.shape
    walk = np.isin(g, ['.'])
    walkpx = np.kron(walk, np.ones((T, T), bool))[:H, :W]
    if walkpx.shape != (H, W):
        pad = np.zeros((H, W), bool); pad[:walkpx.shape[0], :walkpx.shape[1]] = walkpx; walkpx = pad
    pix = im[walkpx]
    smp = pix[np.random.default_rng(0).choice(len(pix), min(20000, len(pix)), replace=False)]
    cent, lbl = kmeans2(smp, 10, seed=1, minit='++')
    cnt = np.bincount(lbl, minlength=len(cent)) / len(lbl)
    floor = cent[cnt > 0.06]
    dist = np.min(np.stack([np.sqrt(((im - c) ** 2).sum(-1)) for c in floor]), 0)
    fg = ndimage.binary_opening((dist > THR) & walkpx, iterations=1)
    lab, n = ndimage.label(fg)
    keep = np.zeros_like(fg); pieces = []
    for i, sl in enumerate(ndimage.find_objects(lab)):
        h = sl[0].stop - sl[0].start; w = sl[1].stop - sl[1].start; area = int((lab[sl] == i + 1).sum())
        if h >= 40 and w <= MAXW and area >= 250 and h > w * 0.8:
            keep[sl] |= (lab[sl] == i + 1)
            pieces.append([int(sl[1].start), int(sl[0].start), int(w), int(h), int(sl[0].stop)])
    keep = ndimage.binary_dilation(keep, iterations=1) & (dist > THR * 0.6)
    out = np.array(img); out[~keep] = 0
    # 조각만 모아 작은 아틀라스로 (선반 배치, 폭 1024)
    ax = ay = row = 0; placed = []
    for x, y, w, h, base in sorted(pieces, key=lambda p: -p[3]):
        w2, h2 = w + 2, h + 2
        if ax + w2 > 1024: ax = 0; ay += row; row = 0
        placed.append([x - 1, y - 1, w2, h2, base, ax, ay]); ax += w2; row = max(row, h2)
    atlas = Image.new('RGBA', (1024, max(1, ay + row)), (0, 0, 0, 0))
    src = Image.fromarray(out)
    for x, y, w, h, base, px, py in placed: atlas.paste(src.crop((x, y, x + w, y + h)), (px, py))
    atlas.save(ROOT + f'assets/maps/{m}_fg.png', optimize=True)
    d['fg'] = placed
    json.dump(d, open(jp, 'w'), ensure_ascii=False, separators=(',', ':'))
    print(m, len(pieces))

if __name__ == '__main__':
    ids = sys.argv[1:] or ['cloud', 'mirror', 'park', 'data', 'garden', 'station', 'photo', 'shadow', 'lastsave', 'trash', 'studio']
    for m in ids: run(m)
