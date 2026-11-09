// 캐릭터 정의. 이름 표기를 바꾸려면 name만 고치면 전체에 반영된다.
export type CharId =
  | 'rumung' | 'dodamhi' | 'dotcha' | 'ttuning' | 'bigwin'
  | 'haming' | 'darae' | 'eune' | 'shiro';

export interface CharDef {
  id: CharId;
  name: string;
  title: string;
  color: string;       // 이름 라벨 색
  ability: string;     // 능력 이름
  abilityDesc: string; // 선택 화면 설명
  male?: boolean;
}

export const CHARS: CharDef[] = [
  { id: 'rumung',  name: '루뭉',  title: '하늘의 길잡이', color: '#7fb2ff', ability: '구름 걸음', abilityDesc: '빈 하늘에 구름 발판을 만든다' },
  { id: 'dodamhi', name: '도담히', title: '기억의 해석자', color: '#b49cff', ability: '기억 읽기', abilityDesc: '물건에 남은 과거 장면을 읽는다' },
  { id: 'dotcha',  name: '돗챠',  title: '돌파의 선봉장', color: '#ff6b9b', ability: '돌진', abilityDesc: '금 간 바위와 벽을 부순다' },
  { id: 'ttuning', name: '뚜닝',  title: '데이터 분석가', color: '#e8e2f2', ability: '해석', abilityDesc: '단말기와 잠금장치를 분석한다' },
  { id: 'bigwin',  name: '빅윈',  title: '세계의 설계자', color: '#e6bd4a', ability: '설계자 권한', abilityDesc: '세계의 규칙을 잠깐 바꾼다', male: true },
  { id: 'haming',  name: '하밍',  title: '생명의 수호자', color: '#f4c15a', ability: '개화', abilityDesc: '시든 식물을 되살린다' },
  { id: 'darae',   name: '다래',  title: '지도 제작자',   color: '#7cc06a', ability: '측량', abilityDesc: '숨은 경로를 지도에 표시한다' },
  { id: 'eune',    name: '으네',  title: '기록의 수집가', color: '#a68cf2', ability: '기록', abilityDesc: '사진으로 과거를 되살린다' },
  { id: 'shiro',   name: '시로',  title: '밤의 탐험가',   color: '#f2ecf7', ability: '밤눈', abilityDesc: '어둠 속과 좁은 길을 지난다' },
];

export const CHAR_IDS = CHARS.map(c => c.id);
export const charById = (id: string): CharDef => CHARS.find(c => c.id === id) ?? CHARS[0];

/** 걷기 시트 규격: 4줄(아래·왼쪽·오른쪽·위) × 4프레임. 새 시트로 바꾸면 여기 칸 크기만 맞추면 된다. */
export const WALK = { fw: 53, fh: 74, scale: 1.1, fps: 8 };
export type Dir = 'down' | 'left' | 'right' | 'up';
export const DIR_ROW: Record<Dir, number> = { down: 0, left: 1, right: 2, up: 3 };
