// 지역 스크립트가 필드 씬을 다루는 창구. 콘텐츠(content.ts)는 이 인터페이스만 안다.
import type { CharId } from '../data/characters';
import type { PuzzleCfg, PuzzleResult } from '../scenes/PuzzleScene';
import type { QuestView } from '../data/quests';

/** 오브젝트 자리: 표지판·NPC·노트 근처, 또는 맵 전체에 퍼진 n번째 자리 */
export interface Anchor { sign?: string; npc?: string; note?: string; pos?: string; point?: boolean; spawn?: boolean; far?: number; gated?: boolean; dx?: number; dy?: number }

export type Act = (c: Ctx) => void | Promise<void>;

export interface Thing {
  id: string;
  at: Anchor;
  tex: string | (() => string);      // th_ 접두사 없이 (예: 'mirror')
  label?: string | (() => string);
  show?: () => boolean;
  hidden?: boolean;                  // 다래 측량 뒤에만 보인다
  once?: boolean;                    // 밟으면 사라지는 수집품
  touch?: Act;
  use?: Act;
  ability?: Partial<Record<CharId, Act>>;
  hint?: string;                     // 능력이 맞지 않을 때 안내
  mark?: () => string;
}

export interface RegionScript {
  id: string;
  arrive?: Act;
  talk?: Record<string, Act>;
  npcMark?: Record<string, () => string>;
  npcShow?: Record<string, () => boolean>;
  signText?: Record<string, string>;
  things: Thing[];
  hiddenNotes?: string[];            // 측량해야 보이는 버그 노트
  rewardNotes?: string[];            // 서브 퀘스트 보상으로 주는 노트 (맵에 놓지 않음)
  dark?: boolean;                    // 어두운 지역 (시로 밤눈)
  quests?: () => QuestView[];
}

export interface Ctx {
  map: string;
  leader: CharId;
  say(knot: string): Promise<string[]>;
  toast(t: string): void;
  puzzle(cfg: PuzzleCfg): Promise<PuzzleResult>;
  spend(h: number, why: string): void;
  give(item: string, n?: number): void;
  item(k: string): number;
  bond(...ids: CharId[]): void;
  note(id: string): void;
  world(): void;                     // 세계 기억 +1 (완료한 지역 수로 다시 센다)
  need(id: CharId, what: string): boolean;
  switchTo(id: CharId): void;
  refresh(): void;
  fx(kind: 'flash' | 'shake' | 'glitch' | 'star'): void;
  photo(id: string, caption: string): void;
  shop(title: string): void;
  menu(title: string, opts: { label: string; act: () => void }[], body?: string): void;
  mirrorMode(goal: string | null): void;
  race(flags: string[], secs: number, onWin: Act): void;
  chase(start: string, goal: string, lamps: string[], onWin: Act): void;
  ending(kind: 'reset' | 'normal' | 'true' | 'secret'): void;
  wait(ms: number): Promise<void>;
  bw(): boolean;                     // 빅윈 권한 1회 소모 (없으면 false)
}
