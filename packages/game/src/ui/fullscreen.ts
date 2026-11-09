// 전체화면. 게임 화면과 모바일 버튼이 함께 들어가도록 #app 전체를 전체화면으로 만든다.
export function fullscreenSupported() {
  return !!(document.fullscreenEnabled && document.documentElement.requestFullscreen);
}

export async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) { await document.exitFullscreen(); return; }
    const el = document.getElementById('app') ?? document.documentElement;
    await el.requestFullscreen({ navigationUI: 'hide' });
    // 모바일이면 가로 고정 시도 (지원하는 브라우저만)
    const o = (screen as any).orientation;
    if (o?.lock && matchMedia('(pointer: coarse)').matches) o.lock('landscape').catch(() => {});
  } catch { /* 브라우저가 막으면 무시 */ }
}

/** PC: 오른쪽 위 전체화면 버튼 + F키 */
export function mountPcFullscreen(host: HTMLElement) {
  if (!fullscreenSupported()) return;
  const b = document.createElement('button');
  b.className = 'pc-fs';
  b.title = '전체화면 (F)';
  const label = () => { b.textContent = document.fullscreenElement ? '⤢ 창 모드 (F)' : '⛶ 전체화면 (F)'; };
  label();
  b.addEventListener('click', () => { toggleFullscreen(); b.blur(); });
  document.addEventListener('fullscreenchange', label);
  window.addEventListener('keydown', e => { if (e.code === 'KeyF' && !e.repeat) toggleFullscreen(); });
  host.appendChild(b);
}
