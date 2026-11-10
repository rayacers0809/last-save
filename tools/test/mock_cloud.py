"""테스트용 가짜 로그인 서버. Playwright 컨텍스트에서 Supabase RPC 호출을 가로채 메모리로 처리하고 자동 가입한다."""
import json, secrets

def install(ctx):
    users, sessions, saves = {}, {}, {}
    async def handle(route):
        fn = route.request.url.split('/rpc/')[1]; a = json.loads(route.request.post_data or '{}')
        async def ok(o): await route.fulfill(status=200, content_type='application/json', body=json.dumps(o))
        if fn in ('ls_signup', 'ls_login'):
            users.setdefault(a['p_username'], a['p_password']); t = secrets.token_hex(8); sessions[t] = a['p_username']
            return await ok({'token': t, 'username': a['p_username']})
        u = sessions.get(a.get('p_token'))
        if not u: return await ok({'error': '다시 로그인해 주세요.'})
        if fn == 'ls_me': return await ok({'username': u, 'hasSave': u in saves})
        if fn == 'ls_save': saves[u] = a['p_data']; return await ok({'ok': True})
        if fn == 'ls_load': return await ok({'data': saves.get(u)})
        if fn == 'ls_clear': saves.pop(u, None); return await ok({'ok': True})
        return await ok(None)
    return ctx.route('**/rest/v1/rpc/*', handle)

async def login(pg, name='tester'):
    """타이틀의 로그인 창을 채워 통과한다"""
    await pg.wait_for_selector('.auth', timeout=15000)
    await pg.fill('input[name=u]', name); await pg.fill('input[name=p]', 'test1234'); await pg.click('.auth-go')
    await pg.wait_for_selector('.auth', state='detached', timeout=15000); await pg.wait_for_timeout(800)
