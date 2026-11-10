// 계정과 클라우드 세이브 (Supabase). 이메일 인증 없이 아이디·비밀번호로 가입하고 바로 로그인된다.
import { SUPABASE_URL, SUPABASE_KEY } from '../config';

const TOKEN = 'last-save:token', USER = 'last-save:user';
type Res = { error?: string; token?: string; username?: string; hasSave?: boolean; data?: unknown; ok?: boolean };

const ls = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string | null) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* 저장소 없음 */ } },
};

async function rpc(fn: string, args: Record<string, unknown>): Promise<Res> {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
    if (!r.ok) return { error: `서버 응답 오류 (${r.status})` };
    return (await r.json()) ?? {};
  } catch {
    return { error: '서버에 연결할 수 없어요. 인터넷 연결을 확인해 주세요.' };
  }
}

class CloudImpl {
  token = ls.get(TOKEN);
  username = ls.get(USER) ?? '';
  hasSave = false;

  get loggedIn() { return !!this.token; }

  private keep(r: Res) {
    if (r.token) { this.token = r.token; this.username = r.username ?? ''; ls.set(TOKEN, r.token); ls.set(USER, this.username); }
    return r;
  }
  async signup(username: string, password: string) { return this.keep(await rpc('ls_signup', { p_username: username, p_password: password })); }
  async login(username: string, password: string) { return this.keep(await rpc('ls_login', { p_username: username, p_password: password })); }

  /** 저장된 토큰이 아직 유효한지 확인. 끊겼으면 로그아웃 상태로 */
  async check(): Promise<boolean> {
    if (!this.token) return false;
    const r = await rpc('ls_me', { p_token: this.token });
    if (r.error) { if (!r.error.startsWith('서버')) this.forget(); return false; }
    this.username = r.username ?? this.username; this.hasSave = !!r.hasSave; ls.set(USER, this.username);
    return true;
  }
  async logout() { if (this.token) await rpc('ls_logout', { p_token: this.token }); this.forget(); }
  private forget() { this.token = null; this.username = ''; this.hasSave = false; ls.set(TOKEN, null); ls.set(USER, null); }

  async save(data: unknown, slot = 1) { if (!this.token) return { error: '로그인이 필요해요.' }; const r = await rpc('ls_save', { p_token: this.token, p_slot: slot, p_data: data }); if (r.ok) this.hasSave = true; return r; }
  async load(slot = 1) { if (!this.token) return { error: '로그인이 필요해요.' }; return rpc('ls_load', { p_token: this.token, p_slot: slot }); }
  async clear(slot = 1) { if (!this.token) return; await rpc('ls_clear', { p_token: this.token, p_slot: slot }); this.hasSave = false; }
}

export const Cloud = new CloudImpl();
