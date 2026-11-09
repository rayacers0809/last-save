// 사이트에 보여 줄 캐릭터와 지역 정보 (게임 기획서 기준)
export interface Char { id: string; name: string; title: string; color: string; region: string; ability: string; does: string; line: string }

export const CHARS: Char[] = [
  { id: 'rumung', name: '루뭉', title: '하늘의 길잡이', color: '#7fb2ff', region: '구름 위의 마을', ability: '구름 걸음', does: '빈 하늘에 구름 발판을 띄운다', line: '저기로 가 볼까…? 구름이 그쪽으로 흘러.' },
  { id: 'dodamhi', name: '도담히', title: '기억의 해석자', color: '#b49cff', region: '거울의 숲', ability: '기억 읽기', does: '물건에 남은 과거 장면을 읽는다', line: '그러니까, 네 말은 이런 거지?' },
  { id: 'dotcha', name: '돗챠', title: '돌파의 선봉장', color: '#ff6b9b', region: '멈춰버린 놀이공원', ability: '돌진', does: '금 간 바위를 부수고 블록을 민다', line: '가자가자! 고민은 달리면서 해!' },
  { id: 'ttuning', name: '뚜닝', title: '데이터 분석가', color: '#e8e2f2', region: '잊힌 데이터 센터', ability: '해석', does: '단말기와 잠금장치를 푼다', line: '패턴 있어. 3초만.' },
  { id: 'bigwin', name: '빅윈', title: '세계의 설계자', color: '#e6bd4a', region: '마지막 저장소', ability: '설계자 권한', does: '개발자 콘솔로 봉인을 연다', line: '정리하자. 지금 할 수 있는 것부터.' },
  { id: 'haming', name: '하밍', title: '생명의 수호자', color: '#f4c15a', region: '달빛 정원', ability: '개화', does: '시든 꽃과 덩굴을 되살린다', line: '잠깐만, 얘 아직 살아 있어.' },
  { id: 'darae', name: '다래', title: '지도 제작자', color: '#7cc06a', region: '사라진 기차역', ability: '측량', does: '숨은 길과 물건을 지도에 드러낸다', line: '경로 세 개 있어. 제일 안전한 건 두 번째.' },
  { id: 'eune', name: '으네', title: '기록의 수집가', color: '#a68cf2', region: '사진 속 마을', ability: '기록', does: '사진으로 지난 풍경을 겹쳐 놓는다', line: '찍었어. 나중에 보면 좋을 것 같아서.' },
  { id: 'shiro', name: '시로', title: '밤의 탐험가', color: '#f2ecf7', region: '그림자의 도시', ability: '밤눈 · 고양이 길', does: '어둠 속을 보고 좁은 틈을 지난다', line: '무서우면 내 뒤에 있어. 농담이야, 옆에 있어.' },
];

export interface Chapter { act: string; title: string; places: { id: string; name: string }[]; story: string }
export const CHAPTERS: Chapter[] = [
  { act: '프롤로그', title: '테스트 플레이', places: [{ id: 'studio', name: '빅윈의 작업실' }], story: '오랜만에 모여 켠 빅윈의 게임. 시작 버튼을 누르자 화면이 깨지고, 남은 시간 72시간이 뜬다.' },
  { act: '1막', title: '흩어진 별지기', places: [{ id: 'cloud', name: '구름 위의 마을' }], story: '혼자 깨어난 구름 마을에서 흩어진 여덟 명을 찾는다. 얼굴 없는 실루엣이 시계탑을 지우고 사라진다.' },
  { act: '2막', title: '오류는 누가 만들었나', places: [{ id: 'mirror', name: '거울의 숲' }, { id: 'park', name: '멈춰버린 놀이공원' }, { id: 'data', name: '잊힌 데이터 센터' }], story: '거울 속 지워진 우리, 개장 1분 전에 멈춘 놀이공원. 데이터 센터의 로그에는 낯익은 이름이 찍혀 있다.' },
  { act: '3막', title: '미뤄진 저장', places: [{ id: 'garden', name: '달빛 정원' }, { id: 'station', name: '사라진 기차역' }, { id: 'photo', name: '사진 속 마을' }], story: '시든 정원, 이름 없는 종착역, 단체 사진이 한 장도 없는 마을. 모두의 시선이 빅윈에게 모인다.' },
  { act: '4막', title: '마지막 저장점', places: [{ id: 'shadow', name: '그림자의 도시' }, { id: 'lastsave', name: '마지막 저장소' }], story: '크론에게 쫓기는 밤, 포인트의 정체. 세이브 코어 앞에서 아홉 명은 마지막으로 무엇을 저장할지 고른다.' },
];
