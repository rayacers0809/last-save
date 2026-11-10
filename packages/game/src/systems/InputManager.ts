// 키보드(WASD)와 모바일 버튼 입력을 하나로 모은다. 게임 코드는 입력 출처를 몰라도 된다.
export type Action =
  | 'confirm' | 'ability' | 'menu' | 'switch' | 'quest' | 'bag' | 'map'
  | 'up' | 'down' | 'left' | 'right'
  | 'num1' | 'num2' | 'num3' | 'num4' | 'num5' | 'num6' | 'num7' | 'num8' | 'num9';

const KEYMAP: Record<string, Action | 'run'> = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  Space: 'confirm', KeyE: 'confirm', Enter: 'confirm', NumpadEnter: 'confirm',
  KeyQ: 'ability', Escape: 'menu', Tab: 'switch', KeyJ: 'quest', KeyI: 'bag', KeyM: 'map',
  ShiftLeft: 'run', ShiftRight: 'run',
  Digit1: 'num1', Digit2: 'num2', Digit3: 'num3', Digit4: 'num4', Digit5: 'num5',
  Digit6: 'num6', Digit7: 'num7', Digit8: 'num8', Digit9: 'num9',
};

class InputManagerImpl {
  private held = new Set<string>();
  private edges = new Set<Action>();
  private touch = { x: 0, y: 0, run: false };
  private touchDir = { up: false, down: false, left: false, right: false };

  constructor() {
    window.addEventListener('keydown', e => {
      // 로그인 입력칸에 글자를 칠 때는 게임 입력으로 받지 않는다
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      const a = KEYMAP[e.code];
      if (!a) return;
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      this.held.add(a);
      if (a !== 'run' && !e.repeat) this.edges.add(a);
    });
    window.addEventListener('keyup', e => { const a = KEYMAP[e.code]; if (a) this.held.delete(a); });
    window.addEventListener('blur', () => { this.held.clear(); this.setStick(0, 0); });
  }

  /** 모바일 버튼에서 호출 */
  press(a: Action) { this.edges.add(a); }

  /** 모바일 조이스틱에서 호출. -1..1 */
  setStick(x: number, y: number) {
    const mag = Math.hypot(x, y);
    this.touch = { x, y, run: mag > 0.92 };
    // 메뉴 조작용 방향 엣지
    const dirs = { up: y < -0.6, down: y > 0.6, left: x < -0.6, right: x > 0.6 };
    (Object.keys(dirs) as (keyof typeof dirs)[]).forEach(k => {
      if (dirs[k] && !this.touchDir[k]) this.edges.add(k);
      this.touchDir[k] = dirs[k];
    });
  }

  axis(): { x: number; y: number } {
    let x = (this.held.has('right') ? 1 : 0) - (this.held.has('left') ? 1 : 0);
    let y = (this.held.has('down') ? 1 : 0) - (this.held.has('up') ? 1 : 0);
    if (x || y) { const m = Math.hypot(x, y); return { x: x / m, y: y / m }; }
    const t = this.touch, m = Math.hypot(t.x, t.y);
    if (m < 0.2) return { x: 0, y: 0 };
    return m > 1 ? { x: t.x / m, y: t.y / m } : { x: t.x, y: t.y };
  }

  running() { return this.held.has('run') || this.touch.run; }

  /** 한 번 눌린 입력을 소비한다 */
  take(a: Action): boolean {
    if (!this.edges.has(a)) return false;
    this.edges.delete(a);
    return true;
  }

  /** 프레임 끝에서 아무도 소비하지 않은 엣지를 비운다 */
  endFrame() { this.edges.clear(); }
}

export const Input = new InputManagerImpl();
