// 모바일 전용 화면 버튼 + 설정창 + 캐릭터 바로가기. 사이트(Next.js)로 옮길 때도 이 파일을 그대로 쓴다.
import { Input, type Action } from '../systems/InputManager';
import { Bus, GameState } from '../systems/GameState';
import { CHAR_IDS, charById } from '../data/characters';
import { toggleFullscreen, fullscreenSupported } from './fullscreen';
import { Audio } from '../systems/AudioManager';

const porUrls = import.meta.glob('../assets/chars/*_por.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const por = (id: string) => porUrls[`../assets/chars/${id}_por.png`];

export function isTouchDevice() {
  return matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
}

interface Prefs { size: 'S' | 'M' | 'L'; alpha: number; vibrate: boolean; hidden: boolean }
const PREF_KEY = 'last-save:touch-prefs';
const DEFAULT: Prefs = { size: 'M', alpha: 70, vibrate: true, hidden: false };
function loadPrefs(): Prefs { try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem(PREF_KEY) || '{}') }; } catch { return { ...DEFAULT }; } }
function savePrefs(p: Prefs) { try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch { /* 저장 못 해도 동작 */ } }

export function mountTouchPad(root: HTMLElement) {
  const prefs = loadPrefs();
  root.innerHTML = `
    <div class="tp-controls" id="tpControls">
      <div class="tp-stick" id="tpStick" aria-label="이동"><div class="tp-knob" id="tpKnob"></div></div>
      <div class="tp-actions">
        <button class="tp-btn tp-b" data-act="ability" aria-label="능력">B<span>능력</span></button>
        <button class="tp-btn tp-a" data-act="confirm" aria-label="상호작용">A<span>대화</span></button>
      </div>
      <div class="tp-party" id="tpParty" hidden></div>
    </div>
    <div class="tp-top">
      <button class="tp-btn tp-small" data-act="menu" aria-label="일시정지 메뉴">≡</button>
      <button class="tp-btn tp-small" id="tpSettingsBtn" aria-label="모바일 설정">⚙ 설정</button>
    </div>
    <div class="tp-sheet" id="tpSheet" hidden>
      <div class="tp-panel" role="dialog" aria-label="모바일 설정">
        <h3>모바일 설정</h3>
        <div class="tp-row"><span>버튼 크기</span>
          <div class="tp-seg" id="tpSize"><button data-v="S">작게</button><button data-v="M">보통</button><button data-v="L">크게</button></div></div>
        <div class="tp-row"><label for="tpAlpha">버튼 투명도</label><input id="tpAlpha" type="range" min="25" max="100" step="5"></div>
        <div class="tp-row"><label for="tpSound">소리</label><input id="tpSound" type="checkbox"></div>
        <div class="tp-row"><label for="tpVib">진동</label><input id="tpVib" type="checkbox"></div>
        <div class="tp-row"><label for="tpHide">조작 버튼 숨기기</label><input id="tpHide" type="checkbox"></div>
        <div class="tp-row" id="tpFsRow"><span>전체화면</span><button class="tp-wide" id="tpFs">전체화면 켜기</button></div>
        <button class="tp-wide tp-close" id="tpClose">닫기</button>
      </div>
    </div>`;

  const $ = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const buzz = () => { if (prefs.vibrate) navigator.vibrate?.(8); };

  // 설정 적용
  const apply = () => {
    const scale = { S: 0.8, M: 1, L: 1.25 }[prefs.size];
    root.style.setProperty('--tp-scale', String(scale));
    root.style.setProperty('--tp-alpha', String(prefs.alpha / 100));
    $('#tpControls').hidden = prefs.hidden;
    root.querySelectorAll<HTMLButtonElement>('#tpSize button').forEach(b => b.classList.toggle('sel', b.dataset.v === prefs.size));
    $<HTMLInputElement>('#tpAlpha').value = String(prefs.alpha);
    $<HTMLInputElement>('#tpVib').checked = prefs.vibrate;
    $<HTMLInputElement>('#tpSound').checked = !Audio.muted;
    $<HTMLInputElement>('#tpHide').checked = prefs.hidden;
    $('#tpFs').textContent = document.fullscreenElement ? '전체화면 끄기' : '전체화면 켜기';
    savePrefs(prefs);
  };
  root.querySelectorAll<HTMLButtonElement>('#tpSize button').forEach(b => b.addEventListener('click', () => { prefs.size = b.dataset.v as Prefs['size']; apply(); }));
  $<HTMLInputElement>('#tpAlpha').addEventListener('input', e => { prefs.alpha = Number((e.target as HTMLInputElement).value); apply(); });
  $<HTMLInputElement>('#tpVib').addEventListener('change', e => { prefs.vibrate = (e.target as HTMLInputElement).checked; apply(); });
  $<HTMLInputElement>('#tpSound').addEventListener('change', e => { Audio.setMuted(!(e.target as HTMLInputElement).checked); apply(); });
  $<HTMLInputElement>('#tpHide').addEventListener('change', e => { prefs.hidden = (e.target as HTMLInputElement).checked; apply(); });
  if (!fullscreenSupported()) $('#tpFsRow').hidden = true;
  $('#tpFs').addEventListener('click', async () => { await toggleFullscreen(); setTimeout(apply, 200); });
  $('#tpSettingsBtn').addEventListener('click', () => { $('#tpSheet').hidden = false; apply(); });
  $('#tpClose').addEventListener('click', () => { $('#tpSheet').hidden = true; });
  $('#tpSheet').addEventListener('click', e => { if (e.target === $('#tpSheet')) $('#tpSheet').hidden = true; });
  document.addEventListener('fullscreenchange', apply);
  apply();

  // 버튼
  root.querySelectorAll<HTMLButtonElement>('[data-act]').forEach(b => {
    b.addEventListener('pointerdown', e => { e.preventDefault(); Input.press(b.dataset.act as Action); b.classList.add('on'); buzz(); });
    const off = () => b.classList.remove('on');
    b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
  });

  // 캐릭터 바로가기 (PC의 숫자키 1~9 역할)
  const party = $('#tpParty');
  const renderParty = () => {
    const d = GameState.data;
    party.innerHTML = '';
    CHAR_IDS.forEach((id, i) => {
      if (!d.party.includes(id)) return;
      const c = charById(id);
      const b = document.createElement('button');
      b.className = 'tp-mem' + (id === d.leader ? ' lead' : '');
      b.style.setProperty('--c', c.color);
      b.setAttribute('aria-label', `${i + 1}번 ${c.name}로 교체`);
      b.innerHTML = `<img src="${por(id)}" alt=""><b>${i + 1}</b>`;
      b.addEventListener('pointerdown', e => { e.preventDefault(); Input.press(`num${i + 1}` as Action); buzz(); });
      party.appendChild(b);
    });
  };
  Bus.on('hud', (on: boolean) => { party.hidden = !on; if (on) renderParty(); });
  Bus.on('hud-refresh', renderParty);

  // 조이스틱
  const stick = $('#tpStick'), knob = $('#tpKnob');
  let pid: number | null = null, cx = 0, cy = 0;
  const R = () => stick.clientWidth / 2;
  const move = (e: PointerEvent) => {
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const r = R(), m = Math.hypot(dx, dy);
    if (m > r) { dx = dx / m * r; dy = dy / m * r; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    Input.setStick(dx / r, dy / r);
  };
  stick.addEventListener('pointerdown', e => {
    e.preventDefault(); pid = e.pointerId; stick.setPointerCapture(pid);
    const rect = stick.getBoundingClientRect(); cx = rect.left + rect.width / 2; cy = rect.top + rect.height / 2;
    move(e);
  });
  stick.addEventListener('pointermove', e => { if (e.pointerId === pid) move(e); });
  const end = (e: PointerEvent) => { if (e.pointerId !== pid) return; pid = null; knob.style.transform = ''; Input.setStick(0, 0); };
  stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end); stick.addEventListener('lostpointercapture', end as any);
}
