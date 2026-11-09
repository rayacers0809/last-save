// 퀘스트 정의. 진행 상태는 GameState.flags와 inventory로 판단한다.
import { GameState } from '../systems/GameState';

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
  return out;
}

export const ITEM_NAMES: Record<string, { name: string; desc: string; key?: boolean }> = {
  starShard: { name: '별조각', desc: '세이브리아의 화폐. 상점에서 쓸 수 있다.' },
  towerPieces: { name: '시계탑 별 조각', desc: '꺼진 시계탑 별의 조각. 세 개를 모으면 별을 다시 켤 수 있다.', key: true },
  letters: { name: '날아간 편지', desc: '우체부 피코의 편지. 받는 사람 이름이 흐려져 있다.', key: true },
  starCandy: { name: '별사탕', desc: '빅윈의 설계자 권한을 한 번 충전한다.' },
};
