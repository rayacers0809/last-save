// 구름 위의 마을 (1막) 맵 데이터. P2에서 Tiled JSON으로 교체 예정.
import type { CharId } from '../data/characters';

import CLOUD from './mapdata/cloud.json';
export const TILE = 24;
export const COLS: number = CLOUD.cols;
export const ROWS: number = CLOUD.rows;
const P = (k: string) => { const v = (CLOUD.pos as Record<string, number[]>)[k]; return { x: v[0], y: v[1] }; };

/** 타일 코드
 *  ' ' 하늘(못 지나감)  . 구름 땅  = 돌길  # 벽  ^ 지붕  D 문  * 구름 덤불
 *  f 시든 화단  X 금 간 바위  W 분수  B 게시판  M 지도판  C 단말기  T 시계탑 받침  S 하늘 정류장
 */
export type Tile = ' ' | '.' | '=' | '#' | '^' | 'D' | '*' | 'f' | 'X' | 'W' | 'B' | 'M' | 'C' | 'T' | 'S' | 'L';

export const BLOCKING = new Set<Tile>([' ', '#', '^', 'D', '*', 'f', 'X', 'W', 'B', 'M', 'C', 'T', 'S']);

export interface Building { x0: number; y0: number; x1: number; y1: number; roof: string; name: string }
export const BUILDINGS: Building[] = [
  { x0: 4, y0: 9, x1: 9, y1: 12, roof: '#e7799b', name: '빵집' },
  { x0: 24, y0: 9, x1: 29, y1: 12, roof: '#7fa7e6', name: '도서관' },
  { x0: 4, y0: 20, x1: 9, y1: 23, roof: '#8fcf8a', name: '우체국' },
];

export function buildGrid(): Tile[][] {
  return CLOUD.grid.map(row => [...row] as Tile[]);
}

/** 꾸밈 요소 (걸을 수 있는 칸 위에만 두지 않는다 — 덤불·지붕 등 막힌 칸이나 가장자리) */
export interface CloudDeco { k: string; x: number; y: number; w?: number; h?: number }
export const CLOUD_DECO: CloudDeco[] = [
  // 벚꽃·하얀 나무 (막힌 덤불 칸 위에 세움)
  ...[[3, 13], [3, 18], [28, 24], [12, 25], [21, 25], [31, 19], [25, 17], [10, 5], [24, 5], [38, 16]].map(([x, y], i) => ({ k: i % 3 === 1 ? 'tree_white' : 'tree_pink', x, y })),
];
/** 가로등 (길가) */
export const CLOUD_LAMPS: { x: number; y: number }[] = [{ x: 14, y: 14 }, { x: 19, y: 16 }, { x: 14, y: 21 }, { x: 19, y: 24 }, { x: 13, y: 4 }, { x: 21, y: 4 }];

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
