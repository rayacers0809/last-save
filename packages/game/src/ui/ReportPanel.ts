// 버그 제보 창: 지금 있는 지역과 위치를 같이 보낸다
import { Cloud } from '../systems/Cloud';

let open = false;
export const reportOpen = () => open;

export function showReport(where: string, map: string, x: number, y: number, meta: Record<string, unknown>): Promise<boolean> {
  return new Promise(resolve => {
    open = true;
    const root = document.createElement('div');
    root.className = 'auth';
    root.innerHTML = `
      <form class="auth-box" novalidate>
        <h2 class="rep-title">버그 제보</h2>
        <p class="auth-lead">막힌 길, 이상한 대사, 안 풀리는 퍼즐… 무엇이든 적어 주세요. 지금 위치(<b class="rep-where"></b>)가 같이 보내져요.</p>
        <label>무슨 일이 있었나요?<textarea name="b" rows="5" maxlength="500" required placeholder="예: 분수대 왼쪽 계단으로 못 내려가요"></textarea></label>
        <p class="auth-err" role="alert"></p>
        <div class="rep-row"><button type="button" class="rep-cancel">닫기</button><button type="submit" class="auth-go">보내기</button></div>
      </form>`;
    root.querySelector('.rep-where')!.textContent = where;
    document.body.appendChild(root);
    const form = root.querySelector('form')!, err = root.querySelector('.auth-err') as HTMLElement, go = root.querySelector('.auth-go') as HTMLButtonElement;
    const ta = root.querySelector('textarea')!;
    const close = (sent: boolean) => { open = false; root.remove(); resolve(sent); };
    root.querySelector('.rep-cancel')!.addEventListener('click', () => close(false));
    root.addEventListener('keydown', e => { e.stopPropagation(); if ((e as KeyboardEvent).key === 'Escape') close(false); });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const body = ta.value.trim();
      if (body.length < 2) { err.textContent = '내용을 조금만 더 적어 주세요.'; return; }
      go.disabled = true; err.textContent = '';
      const r = await Cloud.report(map, x, y, body, meta);
      go.disabled = false;
      if (r.error) { err.textContent = r.error; return; }
      close(true);
    });
    setTimeout(() => ta.focus(), 30);
  });
}
