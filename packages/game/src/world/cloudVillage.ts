// 구름 위의 마을 (1막) 맵 데이터. 지형과 위치는 mapdata/cloud.json (tools/maps에서 생성).
import type { CharId } from '../data/characters';

import CLOUD from './mapdata/cloud.json';
export const TILE = 24;
export const CLOUD_FG: number[][] = (CLOUD as any).fg ?? [];
export const COLS: number = CLOUD.cols;
export const ROWS: number = CLOUD.rows;
const P = (k: string) => { const v = (CLOUD.pos as Record<string, number[]>)[k]; return { x: v[0], y: v[1] }; };

export function buildGrid(): string[][] {
  return CLOUD.grid.map(row => [...row]);
}

export interface Spot { x: number; y: number } // 타일 좌표 (발 위치 타일)

/** 별지기 자리. 첫 접속자의 자리는 비워 둔다 */
export const MEMBER_SPOTS: Record<CharId, Spot> = {
  rumung: P('m_rumung'),     // 동쪽 전망대
  dodamhi: P('m_dodamhi'),   // 게시판 앞
  dotcha: P('m_dotcha'),     // 시장 앞
  ttuning: P('m_ttuning'),   // 벚나무 섬 그네 (돌진 필요)
  bigwin: P('m_bigwin'),     // 시계탑 앞
  haming: P('m_haming'),     // 시든 화단
  darae: P('m_darae'),       // 서점 앞
  eune: P('m_eune'),         // 분수대 옆
  shiro: P('m_shiro'),       // 서쪽 수정 섬 (구름 걸음 필요)
};

export const POINT_SPOT: Spot = { x: CLOUD.point[0], y: CLOUD.point[1] };
export const START_SPOT: Spot = { x: CLOUD.spawn[0], y: CLOUD.spawn[1] };
export const HINT_SPOT: Spot = P('hint');
/** 시계탑(그림 속 성)의 가려질 영역 [x0,y0,x1,y1] 월드 픽셀 */
export const TOWER_VEIL: number[] = CLOUD.veil;

export interface BugNote { id: string; x: number; y: number; text: string }
export const BUG_NOTES: BugNote[] = [
  { id: 'cloud_01', ...P('_note1'), text: '버그 노트: "구름 충돌 판정 다시 봐야 함 — 루뭉"' },
  { id: 'cloud_02', ...P('_note2'), text: '버그 노트: "단말기 대사 너무 짧음. 뚜닝이 이게 맞대."' },
];
/** 서브 퀘스트 SQ02 보상으로 받는 노트 */
export const SQ02_NOTE = { id: 'cloud_03', text: '버그 노트: "주민 이름표 데이터 연결 안 됨. 나중에 고치기 — 빅윈"' };

/** MQ02 시계탑 별 조각 */
export const STAR_PIECES: Spot[] = [P('piece0'), P('piece1'), P('piece2')];

/** SQ01 날아간 편지 */
export const LETTERS: Spot[] = [0, 1, 2, 3, 4].map(i => P(`letter${i}`));

/** 구름 주민 */
export interface Villager { id: string; name: string; x: number; y: number; hat: string }
export const VILLAGERS: Villager[] = [
  { id: 'piko', name: '피코', ...P('v_piko'), hat: '#e7799b' },
  { id: 'grandma', name: '빵집 할머니', ...P('v_grandma'), hat: '#fff8e8' },
  { id: 'nb_a', name: '구름 주민', ...P('v_nb_a'), hat: '#9ec7ff' },
  { id: 'nb_b', name: '구름 주민', ...P('v_nb_b'), hat: '#9fd39a' },
  { id: 'nb_c', name: '구름 주민', ...P('v_nb_c'), hat: '#ffd66b' },
];

export const TOWER_SPOT: Spot = P('tower');
export const STATION_SPOT: Spot = P('station');

const SG = (k: string) => { const v = (CLOUD.signs as Record<string, number[]>)[k]; return { x: v[0], y: v[1] }; };
export const cloudPos = P;
export const SIGNS: { x: number; y: number; text: string; key?: string }[] = [
  { ...SG('board'), key: 'board', text: '게시판. 이름이 적혀 있던 자리마다 검은 픽셀이 번져 있다.' },
  { ...SG('fountain'), key: 'fountain', text: '분수대. 물소리는 들리는데 물이 보이지 않는다.' },
  { ...SG('dome'), key: 'dome', text: '유리 온실. 안쪽 화분들이 전부 같은 방향으로 시들어 있다.' },
  { ...SG('swing'), key: 'swing', text: '벚나무 그네. 누군가 앉아 있던 것처럼 천천히 흔들린다.' },
];
