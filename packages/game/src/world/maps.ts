// 지역 맵 정의. 타일 24px, 탑다운. 각 지역은 별도 맵.
// 타일: ' ' 빈 하늘/낭떠러지 · '.' 바닥 · ',' 풀/이끼 · '=' 길 · '#' 벽 · 'T' 나무 · '*' 덤불 · '~' 물 · 'H' 다리 · 'L' 계단
//       '|' 울타리 · 'i' 가로등 · 'c' 수정 · 'X' 금 간 바위(돗챠) · '?' 비밀 통로(겉보기엔 나무/벽) · 'k' 그늘 바닥
//       'g' 고양이 길(시로만 통과) · 'V' 시든 덩굴(하밍 개화) · 'r' 선로 · 'S' 정류장 · 'b' 벤치 · 'B' 표지판 · 'f' 화단
import type { RTile, Prop } from '../gfx/region';

export interface MapNpc { id: string; name: string; x: number; y: number; hat: string; lines: string[] }
export interface MapSign { x: number; y: number; text: string }
export interface MapNote { id: string; x: number; y: number; text: string }
export interface RegionMap {
  id: string; name: string; act: number; theme: string; bgm: string;
  cols: number; rows: number; secretAs?: RTile;
  spawn: { x: number; y: number }; point?: { x: number; y: number }; image?: string;
  npcs: MapNpc[]; signs: MapSign[]; notes: MapNote[];
  build(): { grid: RTile[][]; props: Prop[] };
}

export const BLOCK = new Set<RTile>([' ', '#', 'T', '*', '~', '|', 'i', 'c', 'X', 'V', 'S', 'P', 'b', 'f', 'B']);

class B {
  g: RTile[][]; props: Prop[] = [];
  constructor(public cols: number, public rows: number, fill: RTile) { this.g = Array.from({ length: rows }, () => Array<RTile>(cols).fill(fill)); }
  in(x: number, y: number) { return x >= 0 && y >= 0 && x < this.cols && y < this.rows; }
  set(x: number, y: number, t: RTile) { if (this.in(x, y)) this.g[y][x] = t; return this; }
  fill(x0: number, y0: number, x1: number, y1: number, t: RTile) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, t); return this; }
  border(t: RTile, n = 1) { for (let i = 0; i < n; i++) { this.fill(i, 0, i, this.rows - 1, t); this.fill(this.cols - 1 - i, 0, this.cols - 1 - i, this.rows - 1, t); this.fill(0, i, this.cols - 1, i, t); this.fill(0, this.rows - 1 - i, this.cols - 1, this.rows - 1 - i, t); } return this; }
  dots(list: [number, number][], t: RTile) { list.forEach(([x, y]) => this.set(x, y, t)); return this; }
  rows_(x0: number, y0: number, lines: string[]) { lines.forEach((l, j) => [...l].forEach((ch, i) => this.set(x0 + i, y0 + j, ch as RTile))); return this; }
  prop(k: string, x: number, y: number, w: number, h: number, o: Partial<Prop> = {}) {
    const p: Prop = { k, x, y, w, h, ...o }; this.props.push(p);
    if (!p.walk) {
      if (p.posts) { for (let j = 0; j < h; j++) { this.set(x, y + j, 'P'); this.set(x + w - 1, y + j, 'P'); } }
      else this.fill(x, y, x + w - 1, y + h - 1, 'P');
    }
    return this;
  }
  done() { return { grid: this.g, props: this.props }; }
}

const say = (...l: string[]) => l;

export const REGIONS: RegionMap[] = [
  // ───────── 프롤로그: 빅윈의 작업실 ─────────
  {
    id: 'studio', name: '빅윈의 작업실', act: 0, theme: 'studio', bgm: 'studio', cols: 30, rows: 20, secretAs: '#',
    spawn: { x: 14, y: 16 }, point: { x: 10, y: 16 },
    npcs: [],
    signs: [
      { x: 0, y: 0, text: '빅윈의 작업용 모니터. 「savria_v0.9」 폴더가 열려 있다.' },
      { x: 0, y: 0, text: '빈 액자 두 개. 아홉 명이 함께 찍은 사진은 아직 없다.' },
      { x: 0, y: 0, text: '창밖으로 별이 보인다. 하나가 깜빡이다 꺼졌다.' },
    ],
    notes: [
      { id: 'studio_01', x: 28, y: 17, text: '버그 노트: "타이틀 BGM 너무 슬픔? — 하밍"' },
      { id: 'studio_02', x: 1, y: 17, text: '버그 노트: "세이브 버튼 위치 다시 — 빅윈"' },
      { id: 'studio_03', x: 17, y: 9, text: '버그 노트: "작업실 고양이 러그 귀여움 유지할 것 — 뚜닝"' },
    ],
    build() {
      const b = new B(30, 20, '.').border('#', 1).fill(0, 0, 29, 3, '#');
      b.prop('neon', 3, 1, 5, 2, { walk: true }).prop('window', 12, 1, 6, 2, { walk: true }).prop('frame', 22, 2, 2, 1, { walk: true });
      b.prop('deskbig', 2, 4, 7, 2).prop('chair', 5, 6, 1, 1).prop('shelf', 18, 4, 2, 2).prop('shelf', 20, 4, 2, 2)
        .prop('bed', 25, 4, 3, 4).prop('rug', 12, 11, 5, 3, { walk: true }).prop('armchair', 2, 12, 2, 2)
        .prop('desk', 21, 13, 3, 2).prop('plant', 10, 4, 1, 1).prop('plant', 24, 4, 1, 1).prop('plant', 27, 15, 1, 1);
      b.fill(14, 19, 15, 19, 'S');
      return b.done();
    },
  },
  // ───────── 2막: 거울의 숲 ─────────
  {
    id: 'mirror', name: '거울의 숲', act: 2, theme: 'mirror', bgm: 'mirror', cols: 44, rows: 32,
    spawn: { x: 21, y: 28 }, point: { x: 18, y: 23 },
    npcs: [
      { id: 'spirit', name: '거울 정령', x: 25, y: 20, hat: '#c9e8ff', lines: say('거울은 거짓말을 하지 않아. 다만 지워진 것까지 보여 줄 뿐이지.', '위쪽 언덕의 거울 세 개를 봐. 너희랑 닮은 누군가가 비칠 거야.') },
      { id: 'keeper', name: '숲지기', x: 10, y: 16, hat: '#7cc06a', lines: say('개울 너머 서쪽 숲은 길이 없어 보여도, 나무 사이로 지나갈 수 있는 곳이 있어.', '동쪽 사당은 덩굴이 막고 있어. 꽃을 피울 줄 아는 사람이 있다면 모를까.') },
    ],
    signs: [
      { x: 0, y: 0, text: '거울의 숲. 비친 모습을 너무 오래 보지 마시오.' },
      { x: 0, y: 0, text: '왼쪽 거울. 조금 더 어린 아홉 명이 웃고 있다.' },
      { x: 0, y: 0, text: '거울 문. 아무도 비치지 않는다. 열 번째 자리처럼 비어 있다.' },
      { x: 0, y: 0, text: '오른쪽 거울. 지금과 다른 옷을 입은 아홉 명이 서 있다.' },
    ],
    notes: [
      { id: 'mirror_01', x: 3, y: 27, text: '버그 노트: "서쪽 숲 비밀길 막는 거 깜빡함 — 도담히"' },
      { id: 'mirror_02', x: 40, y: 21, text: '버그 노트: "사당 수정 반짝이 속도 조절 — 하밍"' },
      { id: 'mirror_03', x: 36, y: 3, text: '버그 노트: "거울 반사 셰이더 포기. 그냥 그림으로 — 뚜닝"' },
    ],
    build() {
      const b = new B(44, 32, '.').border('T', 2);
      b.fill(19, 30, 24, 31, '.').fill(21, 31, 22, 31, 'S');
      b.fill(6, 3, 37, 7, ',').fill(8, 6, 35, 6, '=').fill(6, 8, 37, 8, '|').fill(20, 8, 23, 8, 'L');
      b.fill(21, 9, 22, 29, '=').fill(15, 10, 28, 18, '=').fill(17, 12, 26, 16, '~');
      b.fill(7, 9, 8, 29, '~').fill(7, 13, 8, 13, 'H').fill(7, 22, 8, 22, 'H');
      b.fill(9, 13, 14, 13, '=').fill(9, 22, 20, 22, '=');
      // 서쪽 비밀 숲
      b.fill(2, 24, 6, 24, 'T').set(4, 24, '?');
      // 동쪽 사당 (덩굴)
      b.fill(36, 17, 41, 17, 'T').fill(36, 23, 41, 23, 'T').fill(36, 17, 36, 23, 'T').set(36, 20, 'V').fill(29, 20, 35, 20, '=');
      b.prop('altar', 38, 18, 2, 2);
      b.prop('mirror', 9, 4, 2, 1).prop('mirror', 21, 3, 2, 1).prop('mirror', 33, 4, 2, 1);
      b.dots([[13, 5], [17, 5], [26, 5], [30, 5], [27, 10], [16, 10], [39, 20]], 'c');
      b.dots([[11, 10], [13, 15], [11, 19], [14, 25], [12, 28], [27, 23], [31, 25], [34, 12], [33, 15], [33, 27], [38, 26], [30, 10], [16, 25], [26, 26], [4, 11], [5, 17], [3, 20], [39, 12], [40, 9]], 'T');
      b.dots([[19, 20], [24, 20], [19, 26], [24, 26], [14, 9], [29, 9]], 'i');
      b.dots([[29, 28], [17, 28], [10, 25]], '*');
      b.set(23, 27, 'B');
      return b.done();
    },
  },
  // ───────── 2막: 멈춰버린 놀이공원 ─────────
  {
    id: 'park', name: '멈춰버린 놀이공원', act: 2, theme: 'park', bgm: 'park', cols: 46, rows: 32,
    spawn: { x: 22, y: 28 }, point: { x: 26, y: 24 },
    npcs: [
      { id: 'kid', name: '길 잃은 아이', x: 19, y: 20, hat: '#ffd66b', lines: say('엄마가 저기 있는데… 얼굴이 검은 점으로만 보여요.', '풍선이 여기저기 날아갔어요. 찾아 주면 엄마 얼굴이 보일지도 몰라요.') },
      { id: 'arcade', name: '오락실 주인', x: 7, y: 26, hat: '#ff7aa8', lines: say('최고 기록판이 개장 1분 전에서 멈췄어. 누가 달리기라도 빨리 해 주면 좋겠는데.') },
      { id: 'clerk', name: '매표원', x: 18, y: 27, hat: '#9ec7ff', lines: say('개장까지 1분 남았습니다. 1분째 계속 그렇습니다.') },
    ],
    signs: [
      { x: 0, y: 0, text: '멈춰버린 놀이공원. 개장까지 00:01.' },
      { x: 0, y: 0, text: '회전목마. 말들이 반 바퀴 돌다 멈췄다.' },
      { x: 0, y: 0, text: '관람차. 꼭대기 칸에 불이 켜져 있다.' },
      { x: 0, y: 0, text: '고양이 성. 입구가 금 간 바위로 막혀 있다.' },
    ],
    notes: [
      { id: 'park_01', x: 42, y: 7, text: '버그 노트: "관람차 칸 개수 12개로 확정 — 돗챠"' },
      { id: 'park_02', x: 2, y: 28, text: '버그 노트: "오락실 뒤에 숨은 공간 넣자! — 시로"' },
      { id: 'park_03', x: 36, y: 9, text: '버그 노트: "개장 날짜 미정… — 빅윈"' },
    ],
    build() {
      const b = new B(46, 32, '.').border('T', 2);
      b.fill(20, 30, 25, 31, '.').fill(22, 31, 23, 31, 'S');
      b.prop('coaster', 2, 2, 34, 2);
      b.prop('ferris', 28, 5, 8, 3);
      b.fill(22, 21, 23, 29, '=').fill(16, 12, 30, 21, '=').fill(14, 16, 32, 17, '=');
      b.prop('fountain', 21, 14, 3, 3);
      b.prop('carousel', 7, 11, 6, 5);
      b.prop('stall', 35, 13, 3, 2, { color: '#ff9cc6' }).prop('stall', 35, 18, 3, 2, { color: '#ffd66b' }).prop('stall', 35, 23, 3, 2, { color: '#9fe0c4' });
      b.prop('house', 3, 20, 7, 5, { color: '#d08cc7', label: '오락실', art: 'arcade' });
      b.prop('booth', 16, 25, 2, 2, { color: '#9ec7ff' }).prop('balloon', 13, 22, 2, 2);
      b.prop('arch', 20, 26, 6, 1, { posts: true });
      // 관계자 구역
      b.fill(37, 5, 37, 10, '|').fill(37, 10, 43, 10, '|').set(40, 10, 'X');
      // 오락실 뒤 비밀 공간
      b.fill(2, 26, 4, 26, 'T').fill(4, 26, 4, 29, 'T').set(4, 27, '?');
      b.dots([[17, 22], [28, 22], [17, 11], [28, 11]], 'b');
      b.dots([[15, 12], [31, 12], [15, 21], [31, 21], [19, 26], [26, 26]], 'i');
      b.dots([[4, 6], [6, 9], [12, 7], [19, 7], [24, 9], [12, 28], [31, 27], [34, 29], [41, 27], [42, 17], [41, 21], [5, 15], [3, 9]], 'T');
      b.set(25, 25, 'B').set(40, 11, 'B');
      return b.done();
    },
  },
  // ───────── 2막: 잊힌 데이터 센터 ─────────
  {
    id: 'data', name: '잊힌 데이터 센터', act: 2, theme: 'data', bgm: 'data', cols: 44, rows: 30, secretAs: '#',
    spawn: { x: 21, y: 27 }, point: { x: 17, y: 23 },
    npcs: [
      { id: 'b07', name: '안내 로봇 B-07', x: 25, y: 23, hat: '#8dc7e9', lines: say('환영합니다. 이 시설은 [삭제 예정]입니다.', '가운데 코어에 너무 가까이 가지 마세요. 정리 로그가 [삭제 예정].') },
    ],
    signs: [
      { x: 0, y: 0, text: '대형 모니터. 고양이 얼굴이 깜빡이며 "SAVE DATA 0%"를 띄운다.' },
      { x: 0, y: 0, text: '단말기. 로그: AUTO-CLEAN 대기 중… 대상: savria_v0.9' },
      { x: 0, y: 0, text: '단말기. 로그: 최종 저장 연기 47회 — 사용자: ██' },
    ],
    notes: [
      { id: 'data_01', x: 3, y: 27, text: '버그 노트: "서버실 문 숨기기 — 뚜닝"' },
      { id: 'data_02', x: 41, y: 11, text: '버그 노트: "랙 사이 길 너무 좁음. 그래도 귀여움 — 으네"' },
      { id: 'data_03', x: 29, y: 3, text: '버그 노트: "고양이 스크린 = 마스코트로 확정 — 뚜닝"' },
    ],
    build() {
      const b = new B(44, 30, '.').border('#', 1).fill(0, 0, 43, 2, '#');
      b.prop('bigscreen', 17, 1, 10, 2, { walk: true });
      for (let x = 3; x <= 13; x += 2) { b.prop('rack', x, 5, 1, 2).prop('rack', x, 9, 1, 2); }
      for (let x = 30; x <= 40; x += 2) { b.prop('rack', x, 5, 1, 2).prop('rack', x, 9, 1, 2); }
      b.fill(17, 10, 27, 19, '=').prop('core', 20, 12, 4, 4);
      b.fill(17, 10, 27, 10, '|').fill(17, 10, 17, 19, '|').fill(27, 10, 27, 19, '|').fill(21, 10, 23, 10, '=').fill(21, 19, 23, 19, '=');
      b.fill(17, 19, 27, 19, '|').fill(21, 19, 23, 19, '=');
      b.fill(21, 20, 22, 28, '=');
      b.prop('desk', 4, 19, 3, 2).prop('desk', 10, 19, 3, 2).prop('desk', 30, 19, 3, 2).prop('desk', 36, 19, 3, 2);
      b.prop('terminal', 13, 15, 1, 1).prop('terminal', 31, 15, 1, 1);
      b.fill(2, 23, 41, 23, 'k');
      b.fill(2, 25, 8, 25, '#').fill(8, 25, 8, 28, '#').set(5, 25, '?');
      b.fill(21, 29, 22, 29, 'S');
      b.dots([[16, 4], [28, 4], [16, 20], [28, 20]], 'c');
      return b.done();
    },
  },
  // ───────── 3막: 달빛 정원 ─────────
  {
    id: 'garden', name: '달빛 정원', act: 3, theme: 'garden', bgm: 'garden', cols: 44, rows: 32,
    spawn: { x: 21, y: 29 }, point: { x: 25, y: 28 },
    npcs: [
      { id: 'lyle', name: '정원사 라일', x: 12, y: 12, hat: '#7cc06a', lines: say('달꽃은 밤에만 피어. 근데 요즘은 밤이 와도 피질 않아.', '남서쪽 온실은 덩굴이 문을 막아 버렸어.') },
      { id: 'firefly', name: '반딧불이', x: 30, y: 26, hat: '#fff1b8', lines: say('동쪽 미로 한가운데에 반짝이는 게 있어. 길은… 왼쪽 벽을 따라가 봐.') },
    ],
    signs: [
      { x: 0, y: 0, text: '달빛 정원. 꽃을 꺾지 마시오. 피우는 건 환영.' },
      { x: 0, y: 0, text: '초승달 조각상. 달빛이 연못 위에 별자리를 그린다.' },
      { x: 0, y: 0, text: '정자. 돔 안쪽에 별자리가 그려져 있다. 데이지 모양 하나가 지워져 있다.' },
    ],
    notes: [
      { id: 'garden_01', x: 36, y: 8, text: '버그 노트: "미로 너무 어려우면 반딧불 힌트 — 다래"' },
      { id: 'garden_02', x: 4, y: 26, text: '버그 노트: "온실 꽃 색 노랑/흰 둘 다 넣기 — 하밍"' },
      { id: 'garden_03', x: 26, y: 3, text: '버그 노트: "정자 뒤 숨은 자리. 달 제일 잘 보임 — 루뭉"' },
    ],
    build() {
      const b = new B(44, 32, ',').border('T', 2);
      b.fill(19, 30, 24, 31, ',').fill(21, 31, 22, 31, 'S');
      b.fill(21, 9, 22, 29, '=').fill(4, 15, 30, 15, '=').fill(16, 9, 27, 9, '=');
      b.prop('gazebo', 19, 4, 6, 5);
      b.fill(14, 19, 29, 24, '~').fill(21, 19, 22, 24, 'H');
      b.prop('statue', 16, 10, 1, 1).prop('statue', 27, 10, 1, 1);
      b.prop('arch', 20, 27, 4, 1, { posts: true, art: 'arch_flower' });
      b.fill(8, 8, 12, 10, '.');
      b.rows_(31, 3, [
        '***********',
        '*....*....*',
        '*.**.*.**.*',
        '*.*..*..*.*',
        '*.*.***.*.*',
        '*...*.*...*',
        '*.*.*.*.*.*',
        '*.*...*.*.*',
        '*.*****.*.*',
        '*.........*',
        '*****.*****',
      ]);
      b.fill(36, 14, 36, 15, '=');
      b.fill(3, 22, 9, 22, 'T').fill(9, 22, 9, 28, 'T').set(9, 25, 'V');
      b.dots([[10, 23], [10, 27]], 'f');
      b.dots([[12, 16], [31, 16]], 'b');
      b.dots([[19, 12], [24, 12], [19, 18], [24, 18], [10, 14], [30, 14], [19, 26], [24, 26]], 'i');
      b.dots([[6, 5], [12, 4], [14, 7], [4, 11], [8, 19], [13, 27], [27, 27], [33, 20], [38, 23], [40, 18], [29, 5], [15, 18]], 'T');
      b.dots([[26, 3], [17, 3]], ',');
      b.set(18, 27, 'B');
      return b.done();
    },
  },
  // ───────── 3막: 사라진 기차역 ─────────
  {
    id: 'station', name: '사라진 기차역', act: 3, theme: 'station', bgm: 'station', cols: 48, rows: 28,
    spawn: { x: 24, y: 10 }, point: { x: 20, y: 17 },
    npcs: [
      { id: 'master', name: '역장', x: 29, y: 8, hat: '#5b4a7f', lines: say('마지막 역으로 가는 선로만 지워졌어요. 역 이름이… 발음이 안 돼요.', '시간표도 뒤죽박죽이에요. 날짜 같은 숫자들만 남았어요.') },
      { id: 'porter', name: '역무원', x: 9, y: 20, hat: '#e6b6ba', lines: say('분실물 센터예요. 주인 잃은 물건이 자꾸 늘어나요.') },
    ],
    signs: [
      { x: 0, y: 0, text: '광장 바닥의 나침반. 종착역 방향만 지워져 있다.' },
      { x: 0, y: 0, text: '역사 시계. 바늘이 노을 시각에 멈춰 있다.' },
    ],
    notes: [
      { id: 'station_01', x: 44, y: 16, text: '버그 노트: "고양이 길 = 시로 전용! — 시로"' },
      { id: 'station_02', x: 3, y: 25, text: '버그 노트: "역 이름 = 우리 마일스톤 날짜 — 다래"' },
      { id: 'station_03', x: 46, y: 9, text: '버그 노트: "노을 하늘 색 3번 바꿈 — 으네"' },
    ],
    build() {
      const b = new B(48, 28, '.');
      b.fill(0, 0, 47, 1, ' ');
      b.fill(0, 2, 0, 27, 'T').fill(47, 2, 47, 27, 'T').fill(0, 27, 47, 27, 'T');
      b.prop('stationhouse', 17, 1, 14, 5);
      b.fill(1, 7, 46, 8, '.').fill(1, 9, 46, 10, '=');
      b.fill(23, 6, 24, 6, 'S');
      b.fill(1, 11, 46, 12, 'r');
      b.prop('train', 2, 11, 9, 2, { color: '#9b6a5a' }).prop('train', 11, 11, 9, 2, { color: '#8a5f75' });
      b.fill(1, 13, 46, 13, '|').fill(22, 13, 25, 14, 'L');
      b.fill(37, 14, 46, 14, 'T').fill(37, 14, 37, 18, 'T').fill(37, 18, 46, 18, 'T').set(41, 18, 'g');
      b.fill(2, 22, 6, 22, '*').fill(6, 22, 6, 26, '*').set(6, 24, 'X');
      b.fill(23, 15, 24, 26, '=').fill(8, 20, 36, 20, '=');
      b.prop('booth', 6, 17, 3, 2, { color: '#dd98c6', art: 'lostfound' });
      b.dots([[12, 9], [34, 9]], 'b');
      b.dots([[8, 8], [16, 8], [32, 8], [40, 8], [20, 21], [27, 21]], 'i');
      b.dots([[3, 16], [12, 15], [15, 24], [30, 24], [33, 16], [40, 22], [44, 25], [18, 17], [10, 25]], 'T');
      b.set(30, 15, 'B');
      return b.done();
    },
  },
  // ───────── 3막: 사진 속 마을 ─────────
  {
    id: 'photo', name: '사진 속 마을', act: 3, theme: 'photo', bgm: 'photo', cols: 46, rows: 32,
    spawn: { x: 22, y: 29 }, point: { x: 19, y: 19 },
    npcs: [
      { id: 'photographer', name: '사진사', x: 27, y: 9, hat: '#bc9aa6', lines: say('사진관 암실이 고장 났어요. 사진에 사람이 안 나와요.', '여러분은 찍히네요? 신기하다. 한 장 찍어 드릴까요… 아, 타이머가 고장이구나.') },
      { id: 'framer', name: '액자 장인', x: 8, y: 9, hat: '#a07a6a', lines: say('빈 액자 틀만 잔뜩 만들었어요. 넣을 사진이 없어서.') },
    ],
    signs: [
      { x: 0, y: 0, text: '거대한 카메라 조형물. 렌즈 속에 아무도 비치지 않는다.' },
      { x: 0, y: 0, text: '이젤 위 사진. 아무도 없는 다리가 찍혀 있다.' },
      { x: 0, y: 0, text: '사진관 간판. 「단체 사진 환영」.' },
    ],
    notes: [
      { id: 'photo_01', x: 11, y: 3, text: '버그 노트: "집 사이 골목 = 숨은 길 — 으네"' },
      { id: 'photo_02', x: 43, y: 27, text: '버그 노트: "마을 동쪽 끝 바위 치우기 — 돗챠"' },
      { id: 'photo_03', x: 24, y: 13, text: '버그 노트: "단체 사진 이벤트 꼭 넣자 — 으네"' },
    ],
    build() {
      const b = new B(46, 32, '.').border('T', 2);
      b.fill(20, 29, 25, 31, '.').fill(22, 31, 23, 31, 'S');
      b.fill(14, 11, 31, 21, '=').prop('fountain', 21, 15, 4, 3, { art: 'fountain_photo' });
      b.prop('house', 4, 3, 6, 5, { art: 'house2_7fae78' }).prop('house', 13, 2, 6, 5, { art: 'house2_7fa7e6' }).prop('house', 24, 2, 6, 5, { label: '사진관', art: 'house_e7799b' })
        .prop('house', 35, 3, 6, 5, { art: 'house_9b84d6' }).prop('house', 4, 22, 6, 5, { art: 'house2_e7799b' }).prop('house', 35, 22, 6, 5, { art: 'house_7fa7e6' });
      b.fill(7, 8, 7, 11, '=').fill(16, 7, 16, 11, '=').fill(27, 7, 27, 11, '=').fill(38, 8, 38, 11, '=').fill(7, 8, 38, 8, '=');
      b.fill(7, 21, 7, 21, '=').fill(38, 21, 38, 21, '=').fill(7, 21, 13, 21, '=').fill(32, 21, 38, 21, '=');
      b.fill(21, 27, 24, 28, 'L').fill(22, 22, 23, 26, '=');
      b.prop('polaroid', 13, 9, 2, 2).prop('polaroid', 33, 9, 2, 2).prop('polaroid', 11, 24, 2, 2).prop('polaroid', 31, 25, 2, 2);
      b.fill(10, 2, 12, 8, 'T').fill(11, 3, 11, 7, '.').set(11, 8, '?');
      b.fill(41, 21, 43, 21, 'T').fill(41, 21, 41, 29, 'T').fill(41, 29, 43, 29, 'T').set(41, 28, 'X');
      b.dots([[14, 11], [31, 11], [14, 21], [31, 21]], 'i');
      b.dots([[17, 14], [28, 14]], 'b');
      b.dots([[3, 14], [6, 17], [9, 15], [36, 15], [40, 17], [42, 12], [18, 25], [29, 28], [15, 28], [33, 18]], 'T');
      b.set(25, 22, 'B');
      return b.done();
    },
  },
  // ───────── 4막: 그림자의 도시 ─────────
  {
    id: 'shadow', name: '그림자의 도시', act: 4, theme: 'shadow', bgm: 'shadow', cols: 46, rows: 32, secretAs: '#',
    spawn: { x: 22, y: 27 }, point: { x: 18, y: 10 },
    npcs: [
      { id: 'merchant', name: '상인', x: 12, y: 9, hat: '#9b6ed8', lines: say('간판 불이 다 꺼졌어. 밤에 장사하는 도시인데 말이야.') },
      { id: 'cat', name: '검은 고양이', x: 25, y: 20, hat: '#1d1a52', lines: say('냐.', '(고양이가 북쪽 건물 사이 좁은 틈을 쳐다본다.)') },
    ],
    signs: [
      { x: 0, y: 0, text: '보랏빛 수정. 가까이 가면 누군가의 혼잣말이 들린다.' },
      { x: 0, y: 0, text: '그림자의 시계탑. 바늘이 거꾸로 돈다.' },
    ],
    notes: [
      { id: 'shadow_01', x: 24, y: 2, text: '버그 노트: "시로 방 = 의자 9개 — 시로"' },
      { id: 'shadow_02', x: 43, y: 9, text: '버그 노트: "골목 바위 위치 다시 잡기 — 다래"' },
      { id: 'shadow_03', x: 44, y: 21, text: '버그 노트: "달 크기 2배로 — 루뭉"' },
    ],
    build() {
      const b = new B(46, 32, '.');
      b.fill(0, 0, 45, 0, ' ');
      b.prop('tower', 1, 1, 18, 4).prop('tower', 29, 1, 16, 4);
      b.fill(20, 1, 27, 4, 'k').fill(19, 1, 19, 5, '#').fill(28, 1, 28, 5, '#').fill(19, 5, 28, 5, '#').set(23, 5, 'g');
      b.fill(0, 14, 45, 17, '~').fill(8, 14, 10, 17, 'H').fill(22, 14, 24, 17, 'H').fill(36, 14, 38, 17, 'H');
      b.fill(38, 6, 45, 6, '#').fill(38, 6, 38, 12, '#').fill(38, 12, 45, 12, '#').set(38, 9, 'X');
      b.fill(0, 6, 0, 13, '#').fill(45, 6, 45, 13, '#');
      b.fill(1, 10, 37, 10, '=').fill(22, 18, 24, 27, '=').fill(1, 21, 44, 21, '=');
      b.fill(14, 19, 19, 24, 'k').fill(28, 7, 33, 9, 'k');
      b.prop('tower', 2, 24, 14, 4).prop('tower', 30, 24, 14, 4);
      b.fill(0, 30, 45, 31, ' ').fill(0, 18, 0, 29, '#').fill(45, 18, 45, 29, '#');
      b.fill(22, 29, 23, 29, 'S');
      b.dots([[6, 8], [16, 8], [26, 12], [34, 8], [8, 19], [20, 26], [26, 26], [36, 19]], 'i');
      b.dots([[4, 12], [32, 12], [12, 22], [34, 22]], 'b');
      b.set(30, 27, 'B');
      return b.done();
    },
  },
  // ───────── 4막: 마지막 저장소 ─────────
  {
    id: 'lastsave', name: '마지막 저장소', act: 4, theme: 'lastsave', bgm: 'lastsave', cols: 44, rows: 32,
    spawn: { x: 22, y: 28 }, point: { x: 24, y: 27 },
    npcs: [],
    signs: [
      { x: 0, y: 0, text: '세이브 코어. 빛나는 큐브 안에서 별빛이 천천히 돈다.' },
      { x: 0, y: 0, text: '마지막 저장소. 저장하시겠습니까? [예] [아니오] [나중에]' },
    ],
    notes: [
      { id: 'lastsave_01', x: 22, y: 2, text: '버그 노트: "북쪽 섬은 구름 다리로만 — 루뭉"' },
      { id: 'lastsave_02', x: 40, y: 15, text: '버그 노트: "엔딩 4개 다 쓸 수 있을까… — 도담히"' },
      { id: 'lastsave_03', x: 3, y: 13, text: '버그 노트: "최종 저장 버튼 문구 고민 중 — 빅윈"' },
    ],
    build() {
      const b = new B(44, 32, ' ');
      for (let y = 0; y < 32; y++) for (let x = 0; x < 44; x++) { const d = Math.hypot(x - 22, y - 15); if (d <= 8.4) b.set(x, y, d >= 6 && d < 7.2 ? '=' : '.'); }
      b.prop('cube', 20, 13, 4, 4);
      b.fill(19, 1, 25, 4, '.').fill(35, 12, 41, 18, '.').fill(2, 12, 8, 18, '.').fill(19, 26, 25, 30, '.');
      b.fill(21, 24, 22, 25, 'H').fill(31, 15, 34, 15, 'H').fill(9, 15, 13, 15, 'H');
      b.fill(21, 30, 22, 30, 'S');
      b.prop('pillar', 15, 10, 1, 1, { art: 'crystal_pillar_b', fit: 1.4 }).prop('pillar', 29, 10, 1, 1, { art: 'crystal_pillar_b', fit: 1.4 }).prop('pillar', 15, 20, 1, 1, { art: 'crystal_pillar_b', fit: 1.4 }).prop('pillar', 29, 20, 1, 1, { art: 'crystal_pillar_b', fit: 1.4 });
      b.dots([[20, 2], [24, 2], [36, 13], [40, 17], [3, 17], [7, 13], [19, 27], [25, 27]], 'c');
      b.fill(22, 23, 22, 23, 'L');
      return b.done();
    },
  },
  // ───────── 시크릿: 휴지통 섬 ─────────
  {
    id: 'trash', name: '휴지통 섬', act: 5, theme: 'trash', bgm: 'trash', cols: 46, rows: 32,
    spawn: { x: 22, y: 24 }, point: { x: 26, y: 24 },
    npcs: [
      { id: 'cron', name: '크론', x: 30, y: 18, hat: '#3d4793', lines: say('이 데이터들은 정리 대상입니까?', '…아직 대답을 기다리는 중입니다.') },
    ],
    signs: [
      { x: 0, y: 0, text: '유리 상자 안의 버려진 아이디어: "9인 레이싱 미니게임"' },
      { x: 0, y: 0, text: '재활용 창고. 지워진 지역 초안들이 상자째 쌓여 있다.' },
    ],
    notes: [
      { id: 'trash_01', x: 3, y: 15, text: '버그 노트: "지우지 말고 휴지통에. 나중에 아까울 수도 있으니까 — 뚜닝"' },
      { id: 'trash_02', x: 42, y: 14, text: '버그 노트: "토끼 인형 이름 공모 — 하밍"' },
      { id: 'trash_03', x: 22, y: 2, text: '버그 노트: "LAST SAVE 2…? — 다 같이"' },
    ],
    build() {
      const b = new B(46, 32, ' ');
      b.fill(8, 6, 37, 26, '.').fill(8, 6, 11, 8, ' ').fill(34, 6, 37, 8, ' ').fill(8, 24, 11, 26, ' ').fill(34, 24, 37, 26, ' ');
      b.fill(16, 7, 29, 11, ',').fill(16, 12, 29, 12, '|').fill(21, 12, 24, 12, 'L');
      b.prop('crt', 17, 8, 4, 3).prop('bunny', 24, 7, 4, 4);
      b.prop('monitors', 29, 14, 3, 2).prop('monitors', 12, 20, 3, 2);
      b.prop('pillar', 12, 13, 1, 1, { art: 'pillar_broken', fit: 1.6 }).prop('pillar', 33, 21, 1, 1, { art: 'pillar_broken', fit: 1.6 });
      b.fill(2, 13, 5, 17, '.').fill(40, 12, 44, 16, '.').fill(20, 1, 25, 3, '.').fill(20, 29, 25, 31, '.');
      b.fill(22, 26, 23, 26, 'S');
      b.dots([[3, 14], [43, 13], [21, 30], [24, 30], [14, 18], [31, 10]], 'c');
      b.dots([[10, 10], [35, 12], [13, 24], [32, 24], [10, 17]], 'T');
      b.dots([[15, 16], [30, 21]], 'B');
      b.fill(22, 13, 23, 25, '=');
      return b.done();
    },
  },
];

// ───────── 그림 맵 (원화 배경 + 24px 충돌 격자) ─────────
const DATA = import.meta.glob('./mapdata/*.json', { eager: true, import: 'default' }) as Record<string, any>;
export const MAP_IMG = import.meta.glob('../assets/maps/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
for (const r of REGIONS) {
  const d = DATA[`./mapdata/${r.id}.json`];
  if (!d) continue;
  r.image = MAP_IMG[`../assets/maps/${r.id}.webp`];
  r.cols = d.cols; r.rows = d.rows;
  r.spawn = { x: d.spawn[0], y: d.spawn[1] };
  if (d.point) r.point = { x: d.point[0], y: d.point[1] };
  const at = (bag: Record<string, number[]> | undefined, key: string) => bag?.[key];
  r.npcs = r.npcs.map(n => { const v = at(d.npcs, n.id); return v ? { ...n, x: v[0], y: v[1] } : n; });
  r.notes = r.notes.map(n => { const v = at(d.notes, n.id); return v ? { ...n, x: v[0], y: v[1] } : n; });
  const keys = Object.keys(d.signs ?? {});
  r.signs = r.signs.slice(0, keys.length).map((sg, i) => { const v = d.signs[keys[i]]; return { ...sg, x: v[0], y: v[1] }; });
  r.build = () => ({ grid: (d.grid as string[]).map(row => [...row] as RTile[]), props: [] });
}

export const regionById = (id: string) => REGIONS.find(r => r.id === id);

/** 맵 둘러보기·정류장 목록 순서 */
export const MAP_ORDER: { id: string; name: string; act: number }[] = [
  { id: 'studio', name: '빅윈의 작업실', act: 0 },
  { id: 'cloud', name: '구름 위의 마을', act: 1 },
  ...REGIONS.filter(r => r.id !== 'studio').map(r => ({ id: r.id, name: r.name, act: r.act })),
];
