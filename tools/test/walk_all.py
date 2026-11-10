# 맵마다 출발점에서 모든 퀘스트 오브젝트·NPC·포인트·정류장까지 실제로 걸어가 본다 (막힌 길 검사)
# 사용: (cd packages/game/dist && python3 -m http.server 8766) 띄운 뒤
#       python3 tools/test/walk_all.py cloud,mirror,park,data,garden,station,photo,shadow,lastsave,trash
import asyncio, json, sys
from playwright.async_api import async_playwright
import mock_cloud
import os
D = os.path.dirname(os.path.abspath(__file__))
H = open(f'{D}/harness.js').read() + ';0'; B = open(f'{D}/bot.js').read() + ';0'
MAPS=sys.argv[1].split(',')
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader'])
        ctx=await b.new_context(viewport={'width':960,'height':540}); await mock_cloud.install(ctx); pg=await ctx.new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        ev=pg.evaluate
        await pg.goto('http://localhost:8766/index.html?debug'); await pg.wait_for_timeout(2500); await mock_cloud.login(pg); await ev(H); await ev(B)
        await pg.keyboard.press('Space'); await pg.wait_for_timeout(600); await pg.keyboard.press('Space'); await pg.wait_for_timeout(500); await pg.keyboard.press('ArrowDown'); await pg.wait_for_timeout(200); await pg.keyboard.press('Space'); await pg.wait_for_timeout(1500)
        await ev("__T.drain(20000)"); await pg.wait_for_timeout(2500); await ev("__T.drain(10000)")
        await ev("""(()=>{const d=__GS.data;d.party=['rumung','dodamhi','dotcha','ttuning','bigwin','haming','darae','eune','shiro'];d.flags.preview=true;Object.assign(d.flags,{'mq.gather':true,'mq.cloud':true});__T.travel('cloud');})()"""); await pg.wait_for_timeout(3500)
        await ev("window.__SPEED=2.2")
        bad=[]
        for m in MAPS:
            await ev(f"__T.travel('{m}')"); await pg.wait_for_timeout(2500)
            for _ in range(40):
                if await ev("(()=>{const w=__T.W(); return !!(w.sys.isActive() && w.live && w.things && w.mapId==='%s')})()" % m): break
                await pg.wait_for_timeout(300)
            await pg.wait_for_timeout(1500); await ev("__T.drain(15000)")
            targets=await ev("""(()=>{const w=__T.W(),T=24,out=[];
              for(const t of w.things){ if(t.def.at.gated) continue; out.push(['thing:'+t.def.id,t.tile.x,t.tile.y]); }
              for(const f of w.folks) out.push(['npc:'+f.id,Math.floor(f.x/T),Math.floor((f.y-4)/T)]);
              out.push(['point',w.pointSpot.x,w.pointSpot.y]);
              for(let y=0;y<w.rows;y++)for(let x=0;x<w.cols;x++) if(w.grid[y][x]==='S'){out.push(['station',x,y]);y=1e9;break;}
              return out})()""")
            sx=await ev("[__T.W().lead.x,__T.W().lead.y]")
            ok=0
            for name,x,y in targets:
                r=await ev(f"__walkTo({x},{y},30000)")
                if not r['ok']:
                    # 다시 출발점에서 한 번 더
                    await ev(f"__T.place({sx[0]},{sx[1]})"); r2=await ev(f"__walkTo({x},{y},40000)")
                    if not r2['ok']: bad.append((m,name,x,y,r2)); print('FAIL',m,name,(x,y),r2, flush=True)
                    else: ok+=1
                else: ok+=1
            print(m, ok,'/',len(targets), flush=True)
        print('BAD',len(bad)); print(errs[:3]); await b.close()
asyncio.run(main())
