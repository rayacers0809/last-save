import sys
from PIL import Image, ImageDraw
for mid in sys.argv[1:]:
    im=Image.open(f'/home/claude/newmaps/{mid}.png').convert('RGB'); W,H=im.size
    d=ImageDraw.Draw(im,'RGBA')
    for x in range(0,W,50): d.line([(x,0),(x,H)],fill=(255,255,255,70 if x%100 else 160))
    for y in range(0,H,50): d.line([(0,y),(W,y)],fill=(255,255,255,70 if y%100 else 160))
    for x in range(0,W,100):
        for y in range(0,H,100): d.text((x+2,y+2),f'{x},{y}',fill=(255,255,0,255),stroke_width=2,stroke_fill=(0,0,0,255))
    im.thumbnail((1600,1600)); im.save(f'/home/claude/newmaps/prev/src_{mid}.jpg',quality=85)
