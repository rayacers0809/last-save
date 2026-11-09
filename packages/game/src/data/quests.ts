// 퀘스트 정의. 진행 상태는 GameState.flags와 inventory로 판단한다.
import { GameState } from '../systems/GameState';
import { regionQuests, EPISODES, episodeOpen } from '../world/content';
import { charById } from './characters';

/** 버그 노트: 9개 지역 × 3 = 27 (작업실·휴지통 섬 노트는 보너스) */
export const NOTE_TOTAL = 27;
const NOTE_MAPS = ['cloud', 'mirror', 'park', 'data', 'garden', 'station', 'photo', 'shadow', 'lastsave'];
export const countNotes = (ids: string[]) => ids.filter(id => NOTE_MAPS.includes(id.split('_')[0])).length;

export interface QuestView { id: string; kind: '메인' | '서브'; title: string; desc: string; done: boolean }

export function questLog(): QuestView[] {
  const d = GameState.data, f = (k: string) => !!d.flags[k];
  const inv = d.inventory;
  const out: QuestView[] = [];
  // 메인
  out.push({ id: 'MQ01', kind: '메인', title: '흩어진 별지기', done: f('mq.gather'),
    desc: f('mq.gather') ? '아홉 명이 모두 모였다.' : `구름 위의 마을에 흩어진 친구들을 찾자. (${d.party.length}/9)` });
  if (f('mq.gather')) out.push({ id: 'MQ02', kind: '메인', title: '첫 번째 별', done: f('mq.cloud'),
    desc: f('mq.cloud') ? '시계탑의 별이 다시 켜졌다. 하늘 정류장이 열렸다.'
      : (inv.towerPieces ?? 0) >= 3 ? '별 조각을 모두 모았다. 무너진 시계탑으로 가자.'
      : `흩어진 시계탑 별 조각을 모으자. (${inv.towerPieces ?? 0}/3) 하늘 너머와 바위 너머를 살펴보자.` });
  // 서브
  if (f('sq01.start')) out.push({ id: 'SQ01', kind: '서브', title: '바람개비 우체부', done: f('sq01.done'),
    desc: f('sq01.done') ? '피코에게 편지를 모두 돌려줬다.' : (inv.letters ?? 0) >= 5 ? '편지를 다 모았다. 피코에게 돌아가자.' : `바람에 날아간 편지를 찾자. (${inv.letters ?? 0}/5)` });
  if (f('sq02.start')) {
    const met = ['nb_a', 'nb_b', 'nb_c'].filter(k => f(`sq02.${k}`)).length;
    out.push({ id: 'SQ02', kind: '서브', title: '이름 없는 이웃', done: f('sq02.done'),
      desc: f('sq02.done') ? '이웃들이 서로의 이름을 되찾았다.' : met >= 3 ? '모두의 이름을 들었다. 빵집 할머니에게 알려 주자.' : `이름을 잊은 이웃들을 찾아가 이름을 들어 보자. (${met}/3)` });
  }
  out.push(...regionQuests());
  // 개인 에피소드
  for (const e of EPISODES) {
    if (GameState.flag(`ep.${e.id}`)) out.push({ id: `EP`, kind: '서브', title: `[에피소드] ${charById(e.id).name} — ${e.title}`, done: true, desc: `${e.star}이(가) 다시 켜졌다.` });
    else if (episodeOpen(e)) out.push({ id: 'EP', kind: '서브', title: `[에피소드] ${charById(e.id).name} — ${e.title}`, done: false, desc: `${regionName(e.map)}에 ${charById(e.id).name}의 기억이 반짝인다. (2시간)` });
  }
  if (countNotes(d.bugNotes) >= NOTE_TOTAL) out.push({ id: 'SQ18', kind: '서브', title: '휴지통 열쇠', done: true, desc: '버그 노트 27개를 모두 모아 휴지통 열쇠를 얻었다.' });
  // 진행 중인 것이 위로
  return out.sort((a, b) => Number(a.done) - Number(b.done));
}
const REGION_NAMES: Record<string, string> = { cloud: '구름 위의 마을', mirror: '거울의 숲', park: '놀이공원', data: '데이터 센터', garden: '달빛 정원', station: '기차역', photo: '사진 속 마을', shadow: '그림자의 도시', lastsave: '마지막 저장소' };
export const regionName = (id: string) => REGION_NAMES[id] ?? id;

export const ITEM_NAMES: Record<string, { name: string; desc: string; key?: boolean }> = {
  starShard: { name: '별조각', desc: '세이브리아의 화폐. 상점에서 쓸 수 있다.' },
  towerPieces: { name: '시계탑 별 조각', desc: '꺼진 시계탑 별의 조각. 세 개를 모으면 별을 다시 켤 수 있다.', key: true },
  letters: { name: '날아간 편지', desc: '우체부 피코의 편지. 받는 사람 이름이 흐려져 있다.', key: true },
  starCandy: { name: '별사탕', desc: '빅윈의 설계자 권한을 한 번 충전한다. (가방에서 사용)' },
  tea: { name: '따뜻한 차', desc: '다음 휴식이 6시간 대신 4시간만 걸린다. (가방에서 사용)' },
  cotton: { name: '구름솜', desc: '루뭉의 구름 발판이 두 배로 오래 간다. 다섯 번. (가방에서 사용)' },
  acc_feather: { name: '깃털 핀', desc: '액세서리. 이동 속도가 조금 빨라진다.' },
  acc_brooch: { name: '별 브로치', desc: '액세서리. 별조각을 1.5배 받는다.' },
  acc_bell: { name: '고양이 방울', desc: '액세서리. 크론이 조금 느리게 쫓아온다.' },
  shard: { name: '손거울 조각', desc: '숲지기의 손거울 조각.', key: true },
  balloon: { name: '풍선', desc: '길 잃은 아이의 풍선.', key: true },
  file: { name: '정리 직전 파일', desc: '곧 지워질 파일. 백업 폴더로 옮기자.', key: true },
  lost: { name: '분실물', desc: '주인 잃은 물건.', key: true },
  part: { name: '암실 부품', desc: '사진관 암실을 고칠 부품.', key: true },
  mat: { name: '액자 재료', desc: '나뭇조각, 유리, 금박.', key: true },
  frame: { name: '빈 액자', desc: '아홉 명이 들어갈 만한 큰 액자. 언젠가 채울 수 있기를.', key: true },
  kitten: { name: '새끼 고양이', desc: '품 안에서 골골거린다.', key: true },
  record: { name: '숨은 연기 기록', desc: '빅윈이 숨긴 저장 연기 기록.', key: true },
  cronCfg: { name: '크론 원본 설정 파일', desc: '작성자: 뚜닝. 마지막 줄이 흐릿하다.', key: true },
  saveKey: { name: '저장 열쇠', desc: '빅윈의 주머니 속 작은 금색 열쇠.', key: true },
  epfrag: { name: '기억 조각', desc: '개인 에피소드의 조각.', key: true },
};
