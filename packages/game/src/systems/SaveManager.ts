// 저장: 로그인한 계정의 클라우드(Supabase)에 저장하고, 이 기기 IndexedDB에도 사본을 둔다.
import { get, set, del } from 'idb-keyval';
import { Cloud } from './Cloud';
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
  album: string[];           // 으네가 찍은 사진 id
  equip: string[];           // 장착한 액세서리
  inkState?: string;
  savedAt: number;
}

const KEY = (slot: number) => `last-save:${Cloud.username || 'guest'}:slot${slot}`;
export type SaveResult = 'cloud' | 'local' | false;

export const SaveManager = {
  /** 클라우드 세이브를 먼저, 서버에 못 닿으면 이 기기 사본 */
  async load(slot = 1): Promise<SaveData | null> {
    if (Cloud.loggedIn) {
      const r = await Cloud.load(slot);
      if (!r.error) return (r.data as SaveData) ?? null;
    }
    try { return (await get<SaveData>(KEY(slot))) ?? null; } catch { return null; }
  },
  async save(data: SaveData, slot = 1): Promise<SaveResult> {
    const d = { ...data, savedAt: Date.now() };
    let local = false;
    try { await set(KEY(slot), d); local = true; } catch { /* 저장소 없음 */ }
    const r = await Cloud.save(d, slot);
    return !r.error ? 'cloud' : local ? 'local' : false;
  },
  async clear(slot = 1) { try { await del(KEY(slot)); } catch { /* 무시 */ } await Cloud.clear(slot); },
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
    inventory: { starShard: 0 }, bond: {}, picked: [], memories: { world: 0, core: [] }, album: [], equip: [],
  };
}
