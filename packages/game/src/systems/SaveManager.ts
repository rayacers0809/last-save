// 브라우저 IndexedDB 저장. 서버 없이 기기에 저장된다.
import { get, set, del } from 'idb-keyval';
import type { CharId } from '../data/characters';

export interface SaveData {
  version: 1;
  firstPlayer: CharId;
  leader: CharId;
  party: CharId[];          // 리더 포함 합류 순서
  pos: { x: number; y: number };
  flags: Record<string, boolean | string | number>;
  hoursLeft: number;
  bugNotes: string[];
  brokenRocks: string[];
  inventory: Record<string, number>;
  bond: Record<string, number>;
  picked: string[];          // 주운 필드 아이템 id (별 조각, 편지)
  memories: { world: number; core: string[] };
  inkState?: string;
  savedAt: number;
}

const KEY = (slot: number) => `last-save:slot${slot}`;

export const SaveManager = {
  async load(slot = 1): Promise<SaveData | null> {
    try { return (await get<SaveData>(KEY(slot))) ?? null; } catch { return null; }
  },
  async save(data: SaveData, slot = 1): Promise<boolean> {
    try { await set(KEY(slot), { ...data, savedAt: Date.now() }); return true; } catch { return false; }
  },
  async clear(slot = 1) { try { await del(KEY(slot)); } catch { /* 무시 */ } },
  /** 기기 이동용 내보내기 */
  exportJson(data: SaveData): string { return JSON.stringify(data); },
  importJson(text: string): SaveData | null {
    try { const d = JSON.parse(text); return d && d.version === 1 ? d : null; } catch { return null; }
  },
};

export function newSave(first: CharId): SaveData {
  return {
    version: 1, firstPlayer: first, leader: first, party: [first],
    pos: { x: 0, y: 0 }, flags: {}, hoursLeft: 72, bugNotes: [], brokenRocks: [], savedAt: 0,
    inventory: { starShard: 0 }, bond: {}, picked: [], memories: { world: 0, core: [] },
  };
}
