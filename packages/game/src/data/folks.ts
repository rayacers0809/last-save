import type Phaser from 'phaser';
// 주민·지역 NPC 이름과 모양. Ink 원고에서 화자ID로 쓴다 (예: spirit: 안녕).
import { REGIONS } from '../world/maps';
import type { FolkKind } from '../gfx/paint';

const BASE: Record<string, string> = { piko: '피코', grandma: '빵집 할머니', nb_a: '구름 주민', nb_b: '구름 주민', nb_c: '구름 주민', cron: '크론' };
export const FOLK_KIND: Record<string, FolkKind> = { piko: 'piko', grandma: 'grandma', b07: 'robot', cat: 'cat', spirit: 'spirit', firefly: 'spirit', cron: 'cron', kid: 'kid' };

export function folkName(id: string): string {
  return BASE[id] ?? REGIONS.flatMap(r => r.npcs).find(n => n.id === id)?.name ?? '주민';
}

const CLOUD_FOLK = ['piko', 'grandma', 'nb_a', 'nb_b', 'nb_c'];
/** 필드에 세울 그림. 받은 NPC 그림이 있으면 그걸, 없으면 코드로 그린 임시 그림 */
export function folkTexture(scene: Phaser.Scene, id: string): { key: string; height: number; tint?: boolean } {
  if (CLOUD_FOLK.includes(id) && scene.textures.exists('npc_folk')) return { key: 'npc_folk', height: 70, tint: id !== 'nb_a' };
  const H: Record<string, number> = { cat: 46, firefly: 62, kid: 66, spirit: 78 };
  if (scene.textures.exists(`npc_${id}`)) return { key: `npc_${id}`, height: H[id] ?? 80 };
  return { key: `folk_${id}`, height: 0 };
}
/** 대화창 초상화. 표정(smile·surprise·sad)이 있으면 고른다 */
export function folkPortrait(scene: Phaser.Scene, id: string, expr?: string): string | null {
  const base = CLOUD_FOLK.includes(id) ? 'folk' : id;
  const e = expr ?? (base === 'cron' ? 'sad' : 'smile');
  if (scene.textures.exists(`npc_${base}_por_${e}`)) return `npc_${base}_por_${e}`;
  if (scene.textures.exists(`npc_${id}`)) return `npc_${id}`;
  if (scene.textures.exists(`folk_${id}`)) return `folk_${id}`;
  return null;
}
