// 로그인 · 회원가입 창. 게임을 시작하려면 로그인해야 한다. (이메일 인증 없음)
import { Cloud } from '../systems/Cloud';

let open = false;
export const authOpen = () => open;

export function showAuth(): Promise<void> {
  return new Promise(resolve => {
    open = true;
    const root = document.createElement('div');
    root.className = 'auth';
    root.innerHTML = `
      <form class="auth-box" novalidate>
        <div class="auth-tabs" role="tablist">
          <button type="button" role="tab" data-m="login" aria-selected="true">로그인</button>
          <button type="button" role="tab" data-m="signup" aria-selected="false">회원가입</button>
        </div>
        <p class="auth-lead">게임을 시작하려면 로그인해 주세요. 저장한 기록은 이 계정에 남아서 다른 기기에서도 이어할 수 있어요.</p>
        <label>아이디<input name="u" autocomplete="username" maxlength="16" required></label>
        <label>비밀번호<input name="p" type="password" autocomplete="current-password" maxlength="72" required></label>
        <label class="auth-confirm" hidden>비밀번호 확인<input name="p2" type="password" autocomplete="new-password" maxlength="72"></label>
        <p class="auth-hint" hidden>아이디는 2~16자 (한글·영문·숫자·_), 비밀번호는 4자 이상.</p>
        <p class="auth-err" role="alert"></p>
        <button type="submit" class="auth-go">로그인</button>
      </form>`;
    document.body.appendChild(root);
    const form = root.querySelector('form')!;
    const err = root.querySelector('.auth-err') as HTMLElement;
    const go = root.querySelector('.auth-go') as HTMLButtonElement;
    const confirm = root.querySelector('.auth-confirm') as HTMLElement, hint = root.querySelector('.auth-hint') as HTMLElement;
    const u = form.elements.namedItem('u') as HTMLInputElement, p = form.elements.namedItem('p') as HTMLInputElement, p2 = form.elements.namedItem('p2') as HTMLInputElement;
    let mode: 'login' | 'signup' = 'login';
    const setMode = (m: typeof mode) => {
      mode = m; err.textContent = '';
      root.querySelectorAll('[role=tab]').forEach(b => b.setAttribute('aria-selected', String((b as HTMLElement).dataset.m === m)));
      confirm.hidden = hint.hidden = m === 'login';
      p.autocomplete = m === 'login' ? 'current-password' : 'new-password';
      go.textContent = m === 'login' ? '로그인' : '가입하고 시작하기';
    };
    root.querySelectorAll('[role=tab]').forEach(b => b.addEventListener('click', () => setMode((b as HTMLElement).dataset.m as typeof mode)));
    form.addEventListener('submit', async e => {
      e.preventDefault();
      err.textContent = '';
      if (!u.value.trim() || !p.value) { err.textContent = '아이디와 비밀번호를 입력해 주세요.'; return; }
      if (mode === 'signup' && p.value !== p2.value) { err.textContent = '비밀번호 확인이 달라요.'; return; }
      go.disabled = true; go.textContent = mode === 'login' ? '확인하는 중…' : '만드는 중…';
      const r = mode === 'login' ? await Cloud.login(u.value.trim(), p.value) : await Cloud.signup(u.value.trim(), p.value);
      go.disabled = false; setMode(mode);
      if (r.error) { err.textContent = r.error; return; }
      await Cloud.check();
      root.remove(); open = false; resolve();
    });
    setTimeout(() => u.focus(), 50);
  });
}
