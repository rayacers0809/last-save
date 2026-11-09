// 지역 맵 정의: 이름 · NPC · 표지판 · 버그 노트 문구.
// 실제 지형(충돌 격자)과 위치는 tools/maps에서 만든 mapdata/<id>.json과 원화 배경(assets/maps/<id>.webp)에서 온다.
// 격자 문자: '.' 걷는 곳 · '#' 막힘 · ' ' 빈 하늘 · 'X' 금 간 바위(돗챠) · 'V' 시든 덩굴(하밍) · 'g' 고양이 길(시로) · 'S' 정류장 · 'f' 화단

export interface MapNpc { id: string; name: string; x: number; y: number; hat: string; lines: string[] }
export interface MapSign { x: number; y: number; text: string; key?: string }
export interface MapNote { id: string; x: number; y: number; text: string }
export interface RegionMap {
  id: string; name: string; act: number; bgm: string;
  cols: number; rows: number;
  spawn: { x: number; y: number }; point?: { x: number; y: number }; image?: string;
  npcs: MapNpc[]; signs: MapSign[]; notes: MapNote[];
  grid: string[];
  fg: number[][];   // 가림 조각 [x, y, w, h, 밑동y, 아틀라스x, 아틀라스y]
}

/** 막힌 칸 ('g'는 시로만, 나머지는 능력으로 바뀌기 전까지 막힘) */
export const BLOCK = new Set<string>([' ', '#', 'X', 'V', 'S', 'f']);

type RegionDef = Omit<RegionMap, 'cols' | 'rows' | 'spawn' | 'grid' | 'fg'>;

const say = (...l: string[]) => l;

const DEFS: RegionDef[] = [
  // ───────── 프롤로그: 빅윈의 작업실 ─────────
  {
    id: 'studio', name: '빅윈의 작업실', act: 0, bgm: 'studio',
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
  },
  // ───────── 2막: 거울의 숲 ─────────
  {
    id: 'mirror', name: '거울의 숲', act: 2, bgm: 'mirror',
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
  },
  // ───────── 2막: 멈춰버린 놀이공원 ─────────
  {
    id: 'park', name: '멈춰버린 놀이공원', act: 2, bgm: 'park',
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
  },
  // ───────── 2막: 잊힌 데이터 센터 ─────────
  {
    id: 'data', name: '잊힌 데이터 센터', act: 2, bgm: 'data',
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
  },
  // ───────── 3막: 달빛 정원 ─────────
  {
    id: 'garden', name: '달빛 정원', act: 3, bgm: 'garden',
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
  },
  // ───────── 3막: 사라진 기차역 ─────────
  {
    id: 'station', name: '사라진 기차역', act: 3, bgm: 'station',
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
  },
  // ───────── 3막: 사진 속 마을 ─────────
  {
    id: 'photo', name: '사진 속 마을', act: 3, bgm: 'photo',
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
  },
  // ───────── 4막: 그림자의 도시 ─────────
  {
    id: 'shadow', name: '그림자의 도시', act: 4, bgm: 'shadow',
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
  },
  // ───────── 4막: 마지막 저장소 ─────────
  {
    id: 'lastsave', name: '마지막 저장소', act: 4, bgm: 'lastsave',
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
  },
  // ───────── 시크릿: 휴지통 섬 ─────────
  {
    id: 'trash', name: '휴지통 섬', act: 5, bgm: 'trash',
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
  },
];

// ───────── 그림 맵 (원화 배경 + 24px 충돌 격자) ─────────
const DATA = import.meta.glob('./mapdata/*.json', { eager: true, import: 'default' }) as Record<string, any>;
export const MAP_IMG = import.meta.glob('../assets/maps/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const MAP_FG = import.meta.glob('../assets/maps/*_fg.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export const REGIONS: RegionMap[] = DEFS.filter(r => DATA[`./mapdata/${r.id}.json`]).map(r => {
  const d = DATA[`./mapdata/${r.id}.json`];
  const at = (bag: Record<string, number[]> | undefined, key: string) => bag?.[key];
  const keys = Object.keys(d.signs ?? {});
  return {
    ...r,
    image: MAP_IMG[`../assets/maps/${r.id}.webp`],
    cols: d.cols, rows: d.rows, grid: d.grid as string[], fg: (d.fg ?? []) as number[][],
    spawn: { x: d.spawn[0], y: d.spawn[1] },
    point: d.point ? { x: d.point[0], y: d.point[1] } : undefined,
    npcs: r.npcs.map(n => { const v = at(d.npcs, n.id); return v ? { ...n, x: v[0], y: v[1] } : n; }),
    notes: r.notes.map(n => { const v = at(d.notes, n.id); return v ? { ...n, x: v[0], y: v[1] } : n; }),
    signs: r.signs.slice(0, keys.length).map((sg, i) => { const v = d.signs[keys[i]]; return { ...sg, x: v[0], y: v[1], key: keys[i] }; }),
  };
});

export const regionById = (id: string) => REGIONS.find(r => r.id === id);

/** 맵 둘러보기·정류장 목록 순서 */
export const MAP_ORDER: { id: string; name: string; act: number }[] = [
  { id: 'studio', name: '빅윈의 작업실', act: 0 },
  { id: 'cloud', name: '구름 위의 마을', act: 1 },
  ...REGIONS.filter(r => r.id !== 'studio').map(r => ({ id: r.id, name: r.name, act: r.act })),
];
