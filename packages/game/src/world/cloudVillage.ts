// 구름 위의 마을 (1막) 맵 데이터. P2에서 Tiled JSON으로 교체 예정.
import type { CharId } from '../data/characters';

export const TILE = 24;
export const COLS = 44;
export const ROWS = 30;

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
  const g: Tile[][] = Array.from({ length: ROWS }, () => Array<Tile>(COLS).fill(' '));
  const fill = (x0: number, y0: number, x1: number, y1: number, t: Tile) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = t;
  };
  // 본섬
  fill(2, 8, 32, 27, '.');
  fill(2, 8, 4, 8, ' '); fill(30, 26, 32, 27, ' '); fill(2, 26, 3, 27, ' '); fill(31, 8, 32, 9, ' ');
  // 북쪽 언덕과 바위 통로
  fill(10, 2, 24, 6, '.'); fill(10, 2, 11, 2, ' '); fill(23, 2, 24, 2, ' ');
  fill(16, 7, 17, 7, 'X');
  // 동쪽 섬 (구름 걸음으로만)
  fill(36, 11, 41, 17, '.'); fill(41, 11, 41, 11, ' '); fill(36, 17, 36, 17, ' ');
  // 길
  fill(3, 15, 32, 15, '='); fill(16, 8, 17, 26, '=');
  fill(13, 3, 21, 3, '=');
  // 건물
  for (const b of BUILDINGS) { fill(b.x0, b.y0, b.x1, b.y0 + 1, '^'); fill(b.x0, b.y0 + 2, b.x1, b.y1, '#'); }
  g[12][6] = 'D'; g[12][26] = 'D'; g[23][6] = 'D';
  // 광장 소품
  fill(12, 12, 13, 13, 'W');
  fill(20, 10, 21, 11, 'T');
  g[13][28] = 'B'; g[17][10] = 'M'; g[3][12] = 'C';
  fill(23, 21, 26, 22, 'f');
  // 북동쪽 작은 섬 (언덕에서 구름 걸음)
  fill(28, 2, 31, 5, '.'); g[2][31] = ' ';
  // 남동쪽 바위 구역 (돌진)
  for (const [x, y] of [[29, 23], [31, 23], [32, 23], [29, 24], [29, 25], [32, 24], [32, 25]]) g[y][x] = '*';
  g[23][30] = 'X';
  // 하늘 정류장
  g[27][16] = 'S'; g[27][17] = 'S';
  // 덤불
  for (const [x, y] of [[3, 13], [3, 18], [28, 24], [12, 25], [21, 25], [31, 19], [25, 17], [10, 5], [24, 5], [38, 16]]) g[y][x] = '*';
  // 계단 (언덕 ↔ 광장, 광장 ↔ 남쪽 정류장)
  g[3][16] = 'L'; g[3][17] = 'L'; g[26][16] = 'L'; g[26][17] = 'L';
  return g;
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
  rumung: { x: 30, y: 13 },   // 동쪽 전망대
  dodamhi: { x: 27, y: 14 },  // 도서관 게시판 앞
  dotcha: { x: 8, y: 14 },    // 빵집 앞
  ttuning: { x: 14, y: 4 },   // 북쪽 언덕 단말기 (돌진 필요)
  bigwin: { x: 21, y: 13 },   // 시계탑 아래
  haming: { x: 24, y: 24 },   // 시든 화단
  darae: { x: 11, y: 18 },    // 지도판 앞
  eune: { x: 11, y: 14 },     // 분수대 옆
  shiro: { x: 39, y: 14 },    // 동쪽 섬 (구름 걸음 필요)
};

export const POINT_SPOT: Spot = { x: 19, y: 13 };
export const START_SPOT: Spot = { x: 17, y: 17 };

export interface BugNote { id: string; x: number; y: number; text: string }
export const BUG_NOTES: BugNote[] = [
  { id: 'cloud_01', x: 38, y: 12, text: '버그 노트: "구름 충돌 판정 다시 봐야 함 — 루뭉"' },
  { id: 'cloud_02', x: 22, y: 4, text: '버그 노트: "단말기 대사 너무 짧음. 뚜닝이 이게 맞대."' },
];
/** 서브 퀘스트 SQ02 보상으로 받는 노트 */
export const SQ02_NOTE = { id: 'cloud_03', text: '버그 노트: "주민 이름표 데이터 연결 안 됨. 나중에 고치기 — 빅윈"' };

/** MQ02 시계탑 별 조각 */
export const STAR_PIECES: Spot[] = [{ x: 30, y: 3 }, { x: 31, y: 25 }, { x: 40, y: 16 }];

/** SQ01 날아간 편지 */
export const LETTERS: Spot[] = [{ x: 5, y: 25 }, { x: 27, y: 8 }, { x: 28, y: 20 }, { x: 14, y: 22 }, { x: 20, y: 5 }];

/** 구름 주민 */
export interface Villager { id: string; name: string; x: number; y: number; hat: string }
export const VILLAGERS: Villager[] = [
  { id: 'piko', name: '피코', x: 19, y: 20, hat: '#e7799b' },
  { id: 'grandma', name: '빵집 할머니', x: 5, y: 14, hat: '#fff8e8' },
  { id: 'nb_a', name: '구름 주민', x: 12, y: 9, hat: '#9ec7ff' },
  { id: 'nb_b', name: '구름 주민', x: 22, y: 19, hat: '#9fd39a' },
  { id: 'nb_c', name: '구름 주민', x: 13, y: 23, hat: '#ffd66b' },
];

export const TOWER_SPOT: Spot = { x: 20, y: 11 };
export const STATION_SPOT: Spot = { x: 16, y: 27 };

export const SIGNS: { x: number; y: number; text: string }[] = [
  { x: 28, y: 13, text: '게시판. 이름이 적혀 있던 자리마다 검은 픽셀이 번져 있다.' },
  { x: 10, y: 17, text: '마을 지도. 볼 때마다 길 모양이 조금씩 달라진다.' },
  { x: 12, y: 3, text: '낡은 단말기. 화면에 알 수 없는 로그가 흐른다.' },
  { x: 12, y: 12, text: '분수대. 물소리는 들리는데 물이 보이지 않는다.' },

];
