// 2~4막 지역 콘텐츠: 오브젝트, NPC 반응, 퍼즐, 퀘스트 진행. 대사 원고는 story/*.ink.
import { GameState } from '../systems/GameState';
import { Story1 } from '../systems/StoryRunner';
import { CHAR_IDS, charById, type CharId } from '../data/characters';
import type { Anchor, Ctx, RegionScript, Thing } from './script';
import type { QuestView } from '../data/quests';
import type { PuzzleCfg } from '../scenes/PuzzleScene';

const f = (k: string) => !!GameState.flag(k);
const set = (k: string, v: boolean | string | number = true) => GameState.setFlag(k, v);
const inv = (k: string) => GameState.item(k);
const album = (id: string) => GameState.data.album.includes(id);
const Q = (id: string, kind: '메인' | '서브', title: string, done: boolean, desc: string): QuestView => ({ id, kind, title, done, desc });
const count = (keys: string[]) => keys.filter(f).length;

/** 수집품 n개 */
function collect(prefix: string, anchors: Anchor[], tex: string, item: string, name: string, show: () => boolean, doneMsg: string): Thing[] {
  return anchors.map((at, i) => ({
    id: `${prefix}${i}`, at, tex, once: true, show,
    touch: (c: Ctx) => { c.give(item); const n = c.item(item); c.toast(n >= anchors.length ? doneMsg : `${name}을(를) 주웠다. (${n}/${anchors.length})`); },
  }));
}
/** 으네 촬영 지점 */
export function photoSpots(map: string, caps: string[], anchors?: Anchor[], start = 0): Thing[] {
  return caps.map((cap, k) => {
    const i = k + start, id = `${map}_${i}`;
    return {
      id: `ph${i}`, at: anchors?.[k] ?? { far: 20 + k }, tex: 'photo', label: '촬영 지점',
      show: () => GameState.inParty('eune') && !album(id),
      use: (c: Ctx) => c.toast('사진 찍기 좋은 자리다. 으네라면 좋은 사진을 남길 수 있을 것 같다.'),
      ability: { eune: (c: Ctx) => c.photo(id, cap) },
    } as Thing;
  });
}
/** 빅윈 권한으로 여는 상자 */
function chest(map: string, at: Anchor, reward: number): Thing {
  return {
    id: 'chest', at, tex: 'console', label: '잠긴 상자', show: () => !f(`${map}.chest`),
    use: c => c.toast('설계자 계정으로 잠긴 상자다. 빅윈의 권한이라면 열 수 있을 것 같다.'),
    ability: { bigwin: c => { if (!c.bw()) return; set(`${map}.chest`); c.give('starShard', reward); c.fx('star'); c.toast(`상자가 열렸다! 별조각 ${reward}개.`); c.refresh(); } },
  };
}
const ring = (sign: string, r: number, n: number): Anchor[] => Array.from({ length: n }, (_, i) => ({ sign, dx: Math.round(Math.cos(i / n * Math.PI * 2) * r), dy: Math.round(Math.sin(i / n * Math.PI * 2) * r * 0.7) }));
const far = (a: number, n: number): Anchor[] => Array.from({ length: n }, (_, i) => ({ far: a + i }));

// ═════════════════════════ 거울의 숲 ═════════════════════════
const DIRS = ['북', '북동', '동', '남동', '남', '남서', '서', '북서'];
async function mirrorCenter(c: Ctx) {
  if (f('mq.mirror')) return c.toast('거울 문 속 아홉 명이 손을 흔든다.');
  const n = count(['mq03.e1', 'mq03.e2', 'mq03.e3']);
  if (n < 3) return c.toast(`거울 문이 먹물처럼 어둡다. 숲의 거울 기억을 더 읽어야 해. (${n}/3)`);
  if (!c.need('shiro', '어둠 속 거울 각도를 보려면')) return;
  await c.say('mirror_dark');
  const r = await c.puzzle({
    kind: 'dial', title: '거울 반사', desc: '세 거울을 기억 속 방향으로 돌려 빛을 거울 문에 모으자.\n왼쪽 거울 → 동 · 오른쪽 거울 → 북서 · 숲 속 거울 → 남(아래)',
    slots: [{ label: '왼쪽 거울', options: DIRS }, { label: '오른쪽 거울', options: DIRS }, { label: '숲 속 거울', options: DIRS }], answer: [2, 7, 4],
  });
  if (r !== 'ok') return;
  await c.say('mirror_clear'); set('mq.mirror'); c.world(); c.bond('dodamhi', 'shiro'); c.spend(1, '거울 문 복구'); c.refresh();
}
const echo = (k: 'e1' | 'e2' | 'e3', at: Anchor, label: string): Thing => ({
  id: k, at, tex: 'mirror', label,
  use: c => c.toast(f(`mq03.${k}`) ? '읽어 낸 기억이 아직 거울 속에 일렁인다.' : '거울 속에 오래된 장면이 고여 있다. 도담히라면 읽을 수 있을 것 같다.'),
  ability: { dodamhi: async c => { await c.say(`mirror_echo${k[1]}`); set(`mq03.${k}`); c.refresh(); } },
  mark: () => f('mq03.start') && !f(`mq03.${k}`) ? '✦' : '',
});
const mirror: RegionScript = {
  id: 'mirror',
  arrive: async c => { await c.say('mirror_arrive'); },
  talk: {
    spirit: async c => {
      if (!f('mq03.start')) { await c.say('mirror_spirit_1'); set('mq03.start'); c.refresh(); return; }
      if (!f('sq.03.start')) { await c.say('sq03_start'); set('sq.03.start'); c.mirrorMode('sq03_goal'); c.refresh(); return; }
      if (f('sq03.reached') && !f('sq.03')) { await c.say('sq03_done'); set('sq.03'); c.give('starShard', 30); c.bond('dodamhi'); c.spend(1, '반대쪽 나'); c.refresh(); return; }
      if (!f('sq.03')) {
        const on = f('mode.mirror');
        return c.menu('거울 정령', [
          { label: on ? '좌우를 원래대로 (그만두기)' : '다시 좌우를 바꿔 걷기', act: () => { c.mirrorMode(on ? null : 'sq03_goal'); } },
          { label: '닫기', act: () => {} },
        ], '숲 깊은 곳의 빛나는 표식까지 좌우가 바뀐 채로 걸어가야 해.');
      }
      c.toast('거울 정령: 지워진 건 사라진 게 아니야. 기억해.');
    },
    keeper: async c => {
      if (!f('sq.04.start')) { await c.say('sq04_start'); set('sq.04.start'); c.refresh(); return; }
      if (!f('sq.04') && inv('shard') >= 4) { await c.say('sq04_done'); set('sq.04'); GameState.data.inventory.shard = 0; c.bond('eune'); c.spend(1, '손거울 찾기'); c.refresh(); return; }
      c.toast(f('sq.04') ? '숲지기: 손거울 덕에 길을 안 잃어.' : `숲지기: 손거울 조각… ${inv('shard')}/4. 숲 곳곳을 봐 줘.`);
    },
  },
  npcMark: {
    spirit: () => !f('mq03.start') || !f('sq.03.start') ? '!' : f('sq03.reached') && !f('sq.03') ? '?' : '',
    keeper: () => !f('sq.04.start') ? '!' : !f('sq.04') && inv('shard') >= 4 ? '?' : '',
  },
  things: [
    echo('e1', { sign: 'left' }, '왼쪽 거울'), echo('e2', { sign: 'right' }, '오른쪽 거울'), echo('e3', { far: 6 }, '숲 속 거울'),
    { id: 'center', at: { sign: 'top' }, tex: () => f('mq.mirror') ? 'mirror' : 'mirror_dark', label: '거울 문', use: mirrorCenter, ability: { shiro: mirrorCenter }, mark: () => !f('mq.mirror') && count(['mq03.e1', 'mq03.e2', 'mq03.e3']) === 3 ? '!' : '' },
    ...collect('shard', far(0, 4), 'shard', 'shard', '손거울 조각', () => f('sq.04.start') && !f('sq.04'), '손거울 조각을 다 모았다! 숲지기에게 돌아가자.'),
    chest('mirror', { far: 4 }, 40),
    { id: 'sq03_goal', at: { far: 5 }, tex: 'goal', label: '반대쪽 끝', show: () => f('sq.03.start') && !f('sq03.reached'),
      touch: c => { set('sq03.reached'); c.mirrorMode(null); c.fx('star'); c.toast('도착! 좌우가 원래대로 돌아왔다. 거울 정령에게 돌아가자.'); c.refresh(); } },
    ...photoSpots('mirror', ['안개 속 거울 길', '거울 문 앞의 아홉 그림자', '숲지기의 오두막', '새벽 개울']),
  ],
  hiddenNotes: ['mirror_03'],
  quests: () => [
    Q('MQ03', '메인', '비치지 않는 사람', f('mq.mirror'), f('mq.mirror') ? '거울 문이 다시 빛난다. 지워진 버전의 우리가 비쳤다.'
      : !f('mq03.start') ? '거울 정령을 찾아가 보자.'
      : `도담히로 숲의 거울 세 개를 읽자 (${count(['mq03.e1', 'mq03.e2', 'mq03.e3'])}/3). 그다음 시로로 거울 문의 각도를 맞추자.`),
    ...(f('sq.03.start') ? [Q('SQ03', '서브', '반대쪽 나', f('sq.03'), f('sq.03') ? '거울 미로를 통과했다.' : f('sq03.reached') ? '거울 정령에게 돌아가자.' : '좌우가 바뀐 채로 빛나는 표식까지 가자.')] : []),
    ...(f('sq.04.start') ? [Q('SQ04', '서브', '깨진 손거울', f('sq.04'), f('sq.04') ? '액세서리 칸이 늘었다.' : `손거울 조각을 모으자. (${inv('shard')}/4)`)] : []),
  ],
};

// ═════════════════════════ 멈춰버린 놀이공원 ═════════════════════════
async function parkPower(c: Ctx) { if (f('mq04.gear') && f('mq04.panel') && !f('mq04.power')) { await c.say('park_power'); set('mq04.power'); c.refresh(); } }
async function ferris(c: Ctx) {
  if (f('mq.park')) return c.toast('관람차가 천천히 돈다. 꼭대기 칸에서 누가 손을 흔든다.');
  if (!f('mq04.power')) return c.toast('관람차가 꿈쩍도 않는다. 회전목마 동력실부터 고쳐야 할 것 같다.');
  if (!f('mq04.pins')) {
    if (!c.need('dotcha', '고정핀을 부수려면')) return;
    await c.say('park_ferris_1');
    const r = await c.puzzle({ kind: 'timing', title: '멈춘 관람차 — 1페이즈', desc: '고정핀이 초록 구간에 들어올 때 돌진! (SPACE / A)', rounds: 3, lives: 3, speed: 1.25, zone: 0.16, labels: ['고정핀 1', '고정핀 2', '고정핀 3'] });
    if (r === 'cancel') return;
    if (r === 'fail') { await c.say('park_ferris_fail'); c.spend(1, '관람차 재도전'); return; }
    set('mq04.pins'); await c.say('park_ferris_2');
  }
  c.switchTo('ttuning');
  const digits = '0123456789'.split('');
  const r2 = await c.puzzle({
    kind: 'dial', title: '멈춘 관람차 — 2페이즈', desc: '제어 코드 = 개장 시각. 매표원은 "10시 정각"이라고 했다.' + (f('sq.07') ? '\n[해석 보조] 네 자리 시각: 시시분분' : ''),
    slots: [{ label: '시 (십)', options: digits }, { label: '시 (일)', options: digits }, { label: '분 (십)', options: digits }, { label: '분 (일)', options: digits }],
    start: [0, 9, 5, 9], answer: [1, 0, 0, 0],
  });
  if (r2 !== 'ok') return;
  await c.say('park_clear'); set('mq.park'); c.world(); c.bond('dotcha', 'ttuning'); c.spend(2, '관람차 재가동'); c.refresh();
}
const park: RegionScript = {
  id: 'park',
  arrive: async c => { await c.say('park_arrive'); },
  signText: { board: '회전목마 순서표 — 첫째는 다리가 넷, 둘째는 바퀴가 넷, 셋째는 날개가 둘, 마지막은 불꽃을 뿜는다.' },
  talk: {
    clerk: async c => {
      if (!f('mq04.start')) { await c.say('park_clerk'); set('mq04.start'); c.refresh(); return; }
      c.toast(f('mq.park') ? '매표원: 개장했습니다! 처음으로요!' : '매표원: 개장 시각은 10시 정각이에요. 회전목마 동력실부터 봐 주세요.');
    },
    kid: async c => {
      if (!f('sq.05.start')) { await c.say('sq05_start'); set('sq.05.start'); c.refresh(); return; }
      if (!f('sq.05') && inv('balloon') >= 6) { await c.say('sq05_done'); set('sq.05'); GameState.data.inventory.balloon = 0; c.give('starShard', 40); c.bond('rumung'); c.spend(1, '풍선 찾기'); c.refresh(); return; }
      c.toast(f('sq.05') ? '길 잃은 아이: 엄마랑 관람차 탈 거예요!' : `길 잃은 아이: 풍선 ${inv('balloon')}/6개…`);
    },
    arcade: async c => {
      if (f('sq.06')) return c.toast('오락실 주인: 신기록은 아직 안 깨졌어!');
      if (!f('sq.06.start')) { await c.say('sq06_start'); set('sq.06.start'); c.refresh(); }
      if (!c.need('dotcha', '레이스에 나가려면')) return;
      c.race(['flag0', 'flag1', 'flag2', 'flag3', 'flag4'], 40, async c2 => { await c2.say('sq06_done'); set('sq.06'); c2.note('park_02'); c2.bond('dotcha'); c2.spend(1, '최고 기록'); c2.refresh(); });
    },
  },
  npcMark: {
    clerk: () => !f('mq04.start') ? '!' : '',
    kid: () => !f('sq.05.start') ? '!' : !f('sq.05') && inv('balloon') >= 6 ? '?' : '',
    arcade: () => !f('sq.06') ? (f('sq.06.start') ? '?' : '!') : '',
  },
  things: [
    { id: 'gear', at: { sign: 'carousel', dx: -3 }, tex: 'gear', label: '빠진 톱니', show: () => !f('mq04.gear'),
      use: c => c.toast('거대한 톱니가 빠져 있다. 힘으로 밀어 넣어야 할 것 같다.'),
      ability: { dotcha: async c => { if (!f('mq04.start')) return c.toast('매표원에게 사정을 먼저 들어 보자.'); set('mq04.gear'); c.fx('shake'); c.toast('돌진! 톱니가 제자리에 끼워졌다.'); c.refresh(); await parkPower(c); } },
      mark: () => f('mq04.start') ? '!' : '' },
    { id: 'panel', at: { sign: 'carousel', dx: 3 }, tex: 'terminal', label: '제어반', show: () => !f('mq04.panel'),
      use: c => c.toast('회전목마 제어반. 순서가 뒤섞여 있다. 해석이 필요하다.'),
      ability: { ttuning: async c => {
        if (!f('mq04.start')) return c.toast('매표원에게 사정을 먼저 들어 보자.');
        const r = await c.puzzle({ kind: 'order', title: '회전목마 제어반', desc: '입구 순서표: 첫째는 다리가 넷, 둘째는 바퀴가 넷, 셋째는 날개가 둘, 마지막은 불꽃을 뿜는다.' + (f('sq.07') ? '\n[해석 보조] 말 → 마차 → … ' : ''), items: ['로켓', '말', '백조', '마차'], answer: [1, 3, 2, 0] });
        if (r !== 'ok') return; set('mq04.panel'); c.toast('제어반 순서가 맞았다!'); c.refresh(); await parkPower(c);
      } },
      mark: () => f('mq04.start') ? '!' : '' },
    { id: 'ferris', at: { sign: 'ferris' }, tex: 'gear', label: '관람차 제어대', use: ferris, ability: { dotcha: ferris, ttuning: ferris }, mark: () => f('mq04.power') && !f('mq.park') ? '!' : '' },
    ...collect('balloon', far(0, 6), 'balloon', 'balloon', '풍선', () => f('sq.05.start') && !f('sq.05'), '풍선을 다 찾았다! 아이에게 돌아가자.'),
    ...(['flag0', 'flag1', 'flag2', 'flag3', 'flag4'].map((id, i) => ({ id, at: { npc: 'arcade', dx: [-6, -9, 0, 9, 6][i], dy: [0, -7, -10, -7, 0][i] }, tex: 'flag', label: `깃발 ${i + 1}`, show: () => f('mode.race') && (GameState.flag('race.next') as number ?? 0) <= i } as Thing))),
    chest('park', { far: 7 }, 40),
    ...photoSpots('park', ['멈춘 노을의 관람차', '회전목마의 말', '고양이 성 입구', '개장 1분 전 시계']),
  ],
  hiddenNotes: ['park_03'], rewardNotes: ['park_02'],
  quests: () => [
    Q('MQ04', '메인', '개장 1분 전', f('mq.park'), f('mq.park') ? '관람차가 다시 돈다. 공원이 처음으로 개장했다.'
      : !f('mq04.start') ? '매표원에게 사정을 들어 보자.'
      : !f('mq04.power') ? `회전목마 동력실: 톱니(돗챠 ${f('mq04.gear') ? '✔' : '…'}) · 제어반(뚜닝 ${f('mq04.panel') ? '✔' : '…'})`
      : '관람차 제어대로 가자. 돗챠로 고정핀을 부수고, 뚜닝으로 제어 코드를 넣자.'),
    ...(f('sq.05.start') ? [Q('SQ05', '서브', '잃어버린 풍선', f('sq.05'), f('sq.05') ? '아이에게 풍선을 돌려줬다.' : `날아간 풍선을 찾자. (${inv('balloon')}/6)`)] : []),
    ...(f('sq.06.start') ? [Q('SQ06', '서브', '최고 기록', f('sq.06'), f('sq.06') ? '신기록!' : '돗챠로 오락실 주인에게 말을 걸어 레이스를 시작하자. 깃발 다섯 개, 40초.')] : []),
  ],
};

// ═════════════════════════ 잊힌 데이터 센터 ═════════════════════════
const GATES = ['AND', 'OR', 'NOT'];
const gateOut = (g: number, a: number, b: number) => g === 0 ? a & b : g === 1 ? a | b : 1 - a;
const DOORS: [string, number, number][] = [['문1 (A=1, B=0)', 1, 0], ['문2 (B=0, C=1)', 0, 1], ['문3 (A=1, C=1)', 1, 1], ['문4 (B=0, B=0)', 0, 0]];
const data: RegionScript = {
  id: 'data',
  arrive: async c => { await c.say('data_arrive'); },
  talk: {
    b07: async c => {
      if (!f('mq05.start')) { await c.say('data_b07'); set('mq05.start'); c.refresh(); return; }
      if (!f('sq.07.start')) { await c.say('sq07_start'); set('sq.07.start'); c.refresh(); return; }
      if (!f('sq.07') && count(['sq07.s0', 'sq07.s1', 'sq07.s2']) === 3) { await c.say('sq07_done'); set('sq.07'); c.bond('ttuning'); c.spend(1, '도우미 수리'); c.refresh(); return; }
      c.toast(f('sq.07') ? 'B-07: 오늘도 안내합니다. 문장이 끝까지 남아 있습니다.' : `B-07: 손상 섹터 ${count(['sq07.s0', 'sq07.s1', 'sq07.s2'])}/3 [삭제 예정]`);
    },
  },
  npcMark: { b07: () => !f('mq05.start') || !f('sq.07.start') ? '!' : !f('sq.07') && count(['sq07.s0', 'sq07.s1', 'sq07.s2']) === 3 ? '?' : '' },
  things: [
    { id: 'gates', at: { sign: 'screen' }, tex: 'terminal', label: '논리 회로', show: () => !f('mq05.gates'),
      use: c => c.toast('서버실 문 네 개를 여는 논리 회로다. 뚜닝이라면 해석할 수 있다.'),
      ability: { ttuning: async c => {
        const r = await c.puzzle({
          kind: 'dial', title: '논리 회로', desc: '네 개의 문에 들어갈 회로를 골라 램프를 전부 켜자.\nAND: 둘 다 1이면 1 · OR: 하나라도 1이면 1 · NOT: 첫 입력을 뒤집는다' + (f('sq.07') ? '\n[해석 보조] 문4는 입력이 둘 다 0이다.' : ''),
          slots: DOORS.map(([l]) => ({ label: l, options: GATES })),
          answer: st => DOORS.every(([, a, b], i) => gateOut(st[i], a, b) === 1),
          view: st => DOORS.map(([, a, b], i) => `문${i + 1} ${gateOut(st[i], a, b) ? '●' : '○'}`).join('   '),
        });
        if (r !== 'ok') return; await c.say('data_gates_ok'); set('mq05.gates'); c.refresh();
      } },
      mark: () => f('mq05.start') ? '!' : '' },
    { id: 'door', at: { sign: 'left' }, tex: 'console', label: '서버실 봉인', show: () => !f('mq05.door'),
      use: c => c.toast(f('mq05.gates') ? '설계자 계정 권한이 필요하다. 빅윈이라면…' : '굳게 잠긴 서버실 문. 논리 회로부터 풀어야 한다.'),
      ability: { bigwin: async c => { if (!f('mq05.gates')) return c.toast('논리 회로가 아직 잠겨 있다.'); if (!c.bw()) return; await c.say('data_door'); set('mq05.door'); c.refresh(); } },
      mark: () => f('mq05.gates') ? '!' : '' },
    { id: 'queue', at: { sign: 'right' }, tex: 'folder', label: '삭제 대기열', show: () => f('mq05.door') && !f('mq05.queue'),
      use: async c => {
        if (!f('mq05.qintro')) { await c.say('data_queue_intro'); set('mq05.qintro'); }
        const good = ['팀 회의록', '캐릭터 시안', '첫 빌드', 'BGM 데모', '단체 채팅'].map(label => ({ label, good: true }));
        const bad = ['임시파일', '중복 백업', '빈 폴더', '캐시', '로그 조각', '휴지 파일'].map(label => ({ label, good: false }));
        const r = await c.puzzle({ kind: 'conveyor', title: '삭제 대기열', desc: '컨베이어 위 파일이 집게 아래 올 때 SPACE / A. 별표(★) 붙은 중요 파일 다섯 개를 백업하자.', need: 5, time: 35, items: [...good, ...bad] });
        if (r === 'cancel') return;
        if (r === 'fail') { await c.say('data_queue_fail'); c.spend(1, '대기열 재도전'); return; }
        set('mq05.queue'); c.toast('중요 파일을 지켜 냈다. 안쪽 단말기에 로그가 떠 있다.'); c.refresh();
      }, mark: () => '!' },
    { id: 'log', at: { sign: 'right', dx: 4 }, tex: 'terminal', label: '정리 로그', show: () => f('mq05.queue') && !f('mq.datacenter'),
      use: c => c.toast('암호화된 정리 로그. 뚜닝이 해석해야 한다.'),
      ability: { ttuning: async c => { await c.say('data_log'); set('mq.datacenter'); c.world(); c.bond('ttuning'); c.spend(2, '정리 로그 해독'); c.refresh(); } }, mark: () => '!' },
    ...['s0', 's1', 's2'].map((s, i) => ({
      id: `sector${i}`, at: { far: i }, tex: 'terminal', label: '손상 섹터', show: () => f('sq.07.start') && !f(`sq07.${s}`),
      use: (c: Ctx) => c.toast('B-07의 손상된 메모리 섹터. 해석이 필요하다.'),
      ability: { ttuning: async (c: Ctx) => {
        const r = await c.puzzle({ kind: 'timing', title: `메모리 섹터 ${i + 1}`, desc: '데이터가 정렬될 때 SPACE / A', rounds: 2, lives: 3, speed: 1, zone: 0.2 });
        if (r !== 'ok') return; set(`sq07.${s}`); c.toast(`섹터 복구 (${count(['sq07.s0', 'sq07.s1', 'sq07.s2'])}/3)`); c.refresh();
      } },
    } as Thing)),
    { id: 'cronlog', at: { sign: 'right', dx: -4 }, tex: 'file', label: '크론의 대기열 기록', show: () => f('mq.datacenter') && !f('sq.08.start'),
      use: async c => { await c.say('sq08_start'); set('sq.08.start'); c.refresh(); }, mark: () => '!' },
    ...collect('file', far(3, 3), 'file', 'file', '정리 직전 파일', () => f('sq.08.start') && !f('sq.08'), '파일을 다 모았다! 백업 폴더로 옮기자.'),
    { id: 'backup', at: { npc: 'b07', dx: 4 }, tex: 'folder', label: '백업 폴더', show: () => f('sq.08.start') && !f('sq.08'),
      use: async c => { if (inv('file') < 3) return c.toast(`백업 폴더. 지킬 파일을 더 모으자. (${inv('file')}/3)`); await c.say('sq08_done'); GameState.data.inventory.file = 0; set('sq.08'); c.note('data_01'); c.bond('bigwin'); c.spend(1, '파일 백업'); c.refresh(); } },
    ...photoSpots('data', ['끝없는 서버 복도', '고양이 얼굴 모니터', '형광등 아래 단말기', '최하층으로 가는 계단']),
  ],
  hiddenNotes: ['data_03'], rewardNotes: ['data_01'],
  quests: () => [
    Q('MQ05', '메인', '정리 로그', f('mq.datacenter'), f('mq.datacenter') ? '오류는 시스템이었다. 저장 연기 47회 — 사용자: 빅윈.'
      : !f('mq05.start') ? '안내 로봇 B-07에게 말을 걸어 보자.'
      : !f('mq05.gates') ? '뚜닝으로 논리 회로를 풀자 (대형 모니터 앞).'
      : !f('mq05.door') ? '빅윈의 설계자 권한으로 서버실 봉인을 풀자.'
      : !f('mq05.queue') ? '삭제 대기열에서 중요 파일 다섯 개를 백업하자.'
      : '뚜닝으로 정리 로그를 해석하자.'),
    ...(f('sq.07.start') ? [Q('SQ07', '서브', '고장 난 도우미', f('sq.07'), f('sq.07') ? '뚜닝의 퍼즐에 해석 보조가 붙는다.' : `뚜닝으로 손상 섹터를 복구하자. (${count(['sq07.s0', 'sq07.s1', 'sq07.s2'])}/3)`)] : []),
    ...(f('sq.08.start') ? [Q('SQ08', '서브', '삭제 대기열', f('sq.08'), f('sq.08') ? '파일 세 개를 지켰다.' : `정리 직전 파일을 모아 백업 폴더로. (${inv('file')}/3)`)] : []),
  ],
};

// ═════════════════════════ 달빛 정원 ═════════════════════════
const PHASES = ['하현', '초승', '그믐', '상현', '보름'];
const BLOOM_ORDER = [1, 3, 4, 0, 2];
const SEEDS = ['해바라기 씨', '이끼 포자', '연꽃 씨', '민들레 씨'];
const BEDS = ['햇빛 화단', '그늘 화단', '물가 화단', '바람 화단'];
const garden: RegionScript = {
  id: 'garden',
  arrive: async c => { await c.say('garden_arrive'); },
  signText: { moon: '비석: 달은 가늘게 태어나(초승) 반쯤 차오르고(상현) 둥글어진 뒤(보름), 다시 기울어(하현) 사라진다(그믐).' },
  talk: {
    lyle: async c => {
      if (!f('mq06.start')) {
        await c.say('garden_lyle'); set('mq06.start');
        const t = String(Story1.getVar('garden_trust') || 'wait'); set('choice.garden_trust', t);
        if (t === 'ask') c.bond('darae', 'ttuning'); else c.bond('bigwin', 'haming');
        c.refresh(); return;
      }
      if (!f('sq.09.start')) { await c.say('sq09_start'); set('sq.09.start'); c.refresh(); return; }
      if (!f('sq.09') && count(['sq09.b0', 'sq09.b1', 'sq09.b2', 'sq09.b3']) === 4) { await c.say('sq09_done'); set('sq.09'); c.give('starCandy', 3); c.bond('haming'); c.spend(1, '씨앗 배달'); c.refresh(); return; }
      c.shop('라일의 씨앗 가게');
    },
    firefly: async c => {
      if (!f('sq.10.start')) { await c.say('sq10_start'); set('sq.10.start'); set('sq10.step', 0); c.refresh(); return; }
      c.toast(f('sq.10') ? '반딧불이: 반짝. 고마워.' : '반딧불이: 반짝. 날 따라와, 저기 빛나는 데.');
    },
  },
  npcMark: { lyle: () => !f('mq06.start') || (f('mq06.start') && !f('sq.09.start')) ? '!' : !f('sq.09') && count(['sq09.b0', 'sq09.b1', 'sq09.b2', 'sq09.b3']) === 4 ? '?' : '', firefly: () => !f('sq.10.start') ? '!' : '' },
  things: [
    { id: 'veil', at: { sign: 'moon' }, tex: 'clock', label: '달 그림자 판', show: () => !f('mq06.veil'),
      use: c => c.toast('달빛을 가리는 판. 구름을 띄울 수 있다면…'),
      ability: { rumung: async c => { if (!f('mq06.start')) return c.toast('정원사 라일에게 먼저 사정을 듣자.'); await c.say('garden_veil'); set('mq06.veil'); set('mq06.step', 0); c.refresh(); } },
      mark: () => f('mq06.start') ? '!' : '' },
    ...PHASES.map((ph, i) => ({
      id: `moon${i}`, at: { sign: 'gazebo', dx: [-7, -4, 0, 4, 7][i], dy: [0, 4, 6, 4, 0][i] }, tex: () => f(`mq06.b${i}`) || f('mq.garden') ? 'moonflower_on' : 'moonflower', label: `${ph}꽃`,
      use: (c: Ctx) => c.toast(f('mq.garden') ? '달꽃이 환하게 피어 있다.' : `${ph}을 닮은 꽃봉오리. 하밍이라면 피울 수 있다.`),
      ability: { haming: async (c: Ctx) => {
        if (f('mq.garden') || f(`mq06.b${i}`)) return c.toast('이미 피었다.');
        if (!f('mq06.veil')) return c.toast('달빛이 너무 밝아 꽃이 눈을 뜨지 못한다. 먼저 달을 가려야 해. (루뭉)');
        const step = (GameState.flag('mq06.step') as number) ?? 0;
        if (BLOOM_ORDER[step] !== i) { PHASES.forEach((_, k) => set(`mq06.b${k}`, false)); set('mq06.step', 0); c.fx('glitch'); c.toast('꽃이 다시 오므라들었다… 비석의 순서를 떠올려 보자.'); c.refresh(); return; }
        set(`mq06.b${i}`); set('mq06.step', step + 1); c.fx('star'); c.toast(`${ph}꽃이 피었다. (${step + 1}/5)`); c.refresh();
        if (step + 1 === 5) { await c.say('garden_clear'); set('mq.garden'); c.world(); c.bond('haming', 'rumung'); c.spend(1, '달꽃 개화'); c.refresh(); }
      } },
    } as Thing)),
    ...BEDS.map((b, i) => ({
      id: `bed${i}`, at: { far: i }, tex: 'bed', label: b, show: () => f('sq.09.start') && !f(`sq09.b${i}`),
      use: (c: Ctx) => c.menu(`${b} — 무엇을 심을까?`, [...SEEDS.map((s, k) => ({ label: s, act: () => {
        if (k !== i) { c.toast('여기엔 안 맞는 것 같다. 라일의 말을 떠올려 보자.'); return; }
        set(`sq09.b${i}`); c.fx('star'); c.toast(`${s}을(를) 심었다. (${count(['sq09.b0', 'sq09.b1', 'sq09.b2', 'sq09.b3'])}/4)`); c.refresh();
      } })), { label: '닫기', act: () => {} }]),
    } as Thing)),
    ...[0, 1, 2].map(i => ({ id: `ff${i}`, at: { far: 4 + i }, tex: 'firefly', label: '반딧불', show: () => f('sq.10.start') && ((GameState.flag('sq10.step') as number) ?? 0) === i,
      touch: (c: Ctx) => { set('sq10.step', i + 1); c.toast('반딧불이 다음 자리로 날아갔다.'); c.refresh(); } } as Thing)),
    { id: 'ffbed', at: { far: 7 }, tex: 'bed', label: '숨은 화단', show: () => f('sq.10.start') && GameState.flag('sq10.step') === 3 && !f('sq.10'),
      touch: async c => { set('sq.10'); await c.say('sq10_done'); c.note('garden_01'); c.bond('darae'); c.spend(1, '반딧불 지도'); c.refresh(); } },
    ...photoSpots('garden', ['다섯 단 계단 정원', '연못에 뜬 달', '정자의 별자리 천장', '반딧불 길']),
  ],
  hiddenNotes: ['garden_03'], rewardNotes: ['garden_01'],
  quests: () => [
    Q('MQ06', '메인', '한밤의 개화', f('mq.garden'), f('mq.garden') ? '달꽃 정원이 다시 피었다.'
      : !f('mq06.start') ? '정원사 라일을 찾아가자.'
      : !f('mq06.veil') ? '루뭉으로 달 그림자 판에 구름을 띄워 달빛을 가리자.'
      : `하밍으로 달꽃을 비석의 순서대로 피우자. (${(GameState.flag('mq06.step') as number) ?? 0}/5)`),
    ...(f('sq.09.start') ? [Q('SQ09', '서브', '씨앗 배달', f('sq.09'), f('sq.09') ? '별사탕 3개를 받았다.' : `화단마다 맞는 씨앗을 심자. (${count(['sq09.b0', 'sq09.b1', 'sq09.b2', 'sq09.b3'])}/4) 다 심으면 라일에게.`)] : []),
    ...(f('sq.10.start') ? [Q('SQ10', '서브', '반딧불 지도', f('sq.10'), f('sq.10') ? '숨은 화단을 찾았다.' : '빛나는 반딧불을 따라가자.')] : []),
  ],
};

// ═════════════════════════ 사라진 기차역 ═════════════════════════
const DATES = ['첫 빌드 7/21', '첫 회의 3/02', 'v0.9 9/09', '지도 완성 4/15', '캐릭터 확정 5/30'];
const station: RegionScript = {
  id: 'station',
  arrive: async c => { await c.say('station_arrive'); },
  signText: { compass: '광장 바닥의 나침반. 지도에서는 선로가 끊긴 곳이 지워져 있다. 측량하면 보일지도.' },
  talk: {
    master: async c => {
      if (!f('mq07.start')) { await c.say('station_master'); set('mq07.start'); c.refresh(); return; }
      if (!f('mq.station') && count(['mq07.r0', 'mq07.r1', 'mq07.r2']) === 3) {
        await c.say('station_rails'); set('mq.station'); set('choice.station_name', String(Story1.getVar('station_name'))); c.world(); c.bond('darae', 'dotcha'); c.spend(2, '선로 복원'); c.refresh(); return;
      }
      if (!f('sq.12') && f('mq07.start')) {
        if (!f('sq.12.start')) { await c.say('sq12_start'); set('sq.12.start'); c.refresh(); }
        const r = await c.puzzle({ kind: 'order', title: '뒤섞인 시간표', desc: '먼저 생긴 날부터 차례로 고르자.', items: DATES, answer: [1, 3, 4, 0, 2] });
        if (r !== 'ok') return;
        await c.say('sq12_done'); set('sq.12'); c.note('station_02'); c.bond('darae'); c.spend(1, '시간표'); c.refresh(); return;
      }
      c.toast(f('mq.station') ? '역장: 기차가 종착역까지 가요. 이름도 생겼고요.' : `역장: 끊긴 선로가 ${count(['mq07.r0', 'mq07.r1', 'mq07.r2'])}/3 이어졌어요.`);
    },
    porter: async c => {
      if (!f('sq.11.start')) { await c.say('sq11_start'); set('sq.11.start'); c.refresh(); return; }
      if (!f('sq.11') && inv('lost') >= 5) { await c.say('sq11_done'); set('sq.11'); GameState.data.inventory.lost = 0; c.give('starShard', 40); c.bond('dodamhi'); c.spend(1, '분실물 찾기'); c.refresh(); return; }
      c.toast(f('sq.11') ? '역무원: 분실물 센터가 텅 비었어요. 좋은 일이죠.' : `역무원: 분실물 ${inv('lost')}/5개…`);
    },
  },
  npcMark: {
    master: () => !f('mq07.start') ? '!' : !f('mq.station') && count(['mq07.r0', 'mq07.r1', 'mq07.r2']) === 3 ? '?' : !f('sq.12') ? '!' : '',
    porter: () => !f('sq.11.start') ? '!' : !f('sq.11') && inv('lost') >= 5 ? '?' : '',
  },
  things: [
    ...[0, 1, 2].map(i => ({
      id: `rail${i}`, at: { far: i }, tex: () => f(`mq07.r${i}`) ? 'rail_ok' : 'rail', label: '끊긴 선로', hidden: true, show: () => f('mq07.start'),
      use: (c: Ctx) => c.toast(f(`mq07.r${i}`) ? '선로가 이어져 있다.' : '선로 블록이 어긋나 있다. 힘껏 밀면 이어질 것 같다.'),
      ability: { dotcha: (c: Ctx) => { if (f(`mq07.r${i}`)) return; set(`mq07.r${i}`); c.fx('shake'); c.toast(`돌진! 선로가 이어졌다. (${count(['mq07.r0', 'mq07.r1', 'mq07.r2'])}/3)`); c.refresh(); } },
      mark: () => f(`mq07.r${i}`) ? '' : '!',
    } as Thing)),
    ...collect('lost', far(3, 5), 'lost', 'lost', '분실물', () => f('sq.11.start') && !f('sq.11'), '분실물을 다 찾았다! 역무원에게 가자.'),
    chest('station', { far: 8 }, 40),
    ...photoSpots('station', ['비 오는 승강장', '얽힌 선로', '멈춘 역사 시계', '종착역의 불빛']),
  ],
  hiddenNotes: ['station_03'], rewardNotes: ['station_02'],
  quests: () => [
    Q('MQ07', '메인', '마지막 역', f('mq.station'), f('mq.station') ? `종착역에 「${f('choice.station_name') ? charById(String(GameState.flag('choice.station_name'))).name : ''} 역」이라는 이름이 붙었다.`
      : !f('mq07.start') ? '역장에게 말을 걸어 보자.'
      : count(['mq07.r0', 'mq07.r1', 'mq07.r2']) === 3 ? '역장에게 돌아가자.'
      : f('survey.station') ? `돗챠로 끊긴 선로를 밀어 잇자. (${count(['mq07.r0', 'mq07.r1', 'mq07.r2'])}/3)` : '다래의 측량(Q)으로 끊긴 선로를 찾자.'),
    ...(f('sq.11.start') ? [Q('SQ11', '서브', '분실물 센터', f('sq.11'), f('sq.11') ? '분실물을 모두 돌려줬다.' : `주인 잃은 물건을 찾자. (${inv('lost')}/5)`)] : []),
    ...(f('sq.12.start') ? [Q('SQ12', '서브', '시간표', f('sq.12'), f('sq.12') ? '시간표를 맞췄다.' : '역장에게 말을 걸어 시간표를 맞추자.')] : []),
  ],
};

// ═════════════════════════ 사진 속 마을 ═════════════════════════
const photo: RegionScript = {
  id: 'photo',
  arrive: async c => { await c.say('photo_arrive'); },
  talk: {
    photographer: async c => {
      if (!f('mq08.start')) { await c.say('photo_master'); set('mq08.start'); c.refresh(); return; }
      if (!f('sq.13.start')) { await c.say('sq13_start'); set('sq.13.start'); c.refresh(); return; }
      if (!f('sq.13') && ['photo_1', 'photo_2', 'photo_3'].every(album)) { await c.say('sq13_done'); set('sq.13'); c.give('starShard', 30); c.bond('eune'); c.spend(1, '초점'); c.refresh(); return; }
      c.toast(f('mq.photo') ? '사진사: 사람이 찍혀요! 여러분 덕분에.' : inv('part') >= 3 ? '사진사: 부품이 다 모였네요! 사진관 암실로 가요.' : `사진사: 암실 부품 ${inv('part')}/3개…`);
    },
    framer: async c => {
      if (!f('sq.14.start')) { await c.say('sq14_start'); set('sq.14.start'); c.refresh(); return; }
      if (!f('sq.14') && inv('mat') >= 3) { await c.say('sq14_done'); set('sq.14'); GameState.data.inventory.mat = 0; c.give('frame'); c.bond('bigwin'); c.spend(1, '액자 만들기'); c.refresh(); return; }
      c.toast(f('sq.14') ? '액자 장인: 그 액자, 꼭 채워요.' : `액자 장인: 재료 ${inv('mat')}/3…`);
    },
  },
  npcMark: {
    photographer: () => !f('mq08.start') || !f('sq.13.start') ? '!' : !f('sq.13') && ['photo_1', 'photo_2', 'photo_3'].every(album) ? '?' : '',
    framer: () => !f('sq.14.start') ? '!' : !f('sq.14') && inv('mat') >= 3 ? '?' : '',
  },
  things: [
    ...[0, 1, 2].map(i => ({
      id: `faded${i}`, at: { far: i }, tex: 'blur', label: '바랜 자리', hidden: true, show: () => f('mq08.start') && !f(`mq08.f${i}`),
      use: (c: Ctx) => c.toast('풍경이 군데군데 바래 있다. 옛 사진을 겹치면 뭔가 나타날 것 같다. (으네)'),
      ability: { eune: async (c: Ctx) => { await c.say('photo_project'); set(`mq08.f${i}`); c.give('part'); c.toast(`암실 부품 (${inv('part')}/3)`); c.refresh(); } },
      mark: () => '!',
    } as Thing)),
    { id: 'darkroom', at: { sign: 'studio' }, tex: 'photo', label: '사진관 암실', show: () => !f('mq.photo'),
      use: async c => {
        if (!f('mq08.start')) return c.toast('사진관 암실. 붉은 불이 꺼져 있다.');
        if (inv('part') < 3) return c.toast(`암실 부품이 모자라. (${inv('part')}/3) 바랜 자리는 측량하면 보일 거야.`);
        await c.say('photo_clear'); GameState.data.inventory.part = 0; set('mq.photo'); set('choice.photo_first', String(Story1.getVar('photo_first')));
        c.world(); c.bond('eune', 'darae'); c.spend(2, '암실 복구'); c.refresh();
      }, mark: () => inv('part') >= 3 ? '!' : '' },
    ...[1, 2, 3].map(i => ({
      id: `blur${i}`, at: { far: 2 + i }, tex: 'blur', label: '흐릿한 자리', show: () => f('sq.13.start') && !album(`photo_${i}`),
      use: (c: Ctx) => c.toast('흐릿한 사진 속 그 자리다. 으네가 다시 찍으면 초점이 돌아올 것 같다.'),
      ability: { eune: (c: Ctx) => c.photo(`photo_${i}`, ['돌다리 위의 오후', '빨래가 날리는 골목', '언덕 위 풍차'][i - 1]) },
    } as Thing)),
    ...collect('mat', far(6, 3), 'frame', 'mat', '액자 재료', () => f('sq.14.start') && !f('sq.14'), '재료를 다 모았다! 액자 장인에게 가자.'),
    chest('photo', { far: 9 }, 40),
    ...photoSpots('photo', ['세피아빛 사진관'], [{ sign: 'easel' }]),
  ],
  hiddenNotes: ['photo_03'],
  quests: () => [
    Q('MQ08', '메인', '없는 사진', f('mq.photo'), f('mq.photo') ? '단체 사진은 한 장도 없었다. 사진 속 빅윈은 별 모양 키링을 쥐고 있었다.'
      : !f('mq08.start') ? '사진사에게 말을 걸어 보자.'
      : inv('part') >= 3 ? '사진관 암실로 가자.'
      : `다래의 측량으로 바랜 자리를 찾고, 으네의 기록으로 옛 사진을 겹치자. (${inv('part')}/3)`),
    ...(f('sq.13.start') ? [Q('SQ13', '서브', '초점', f('sq.13'), f('sq.13') ? '초점이 돌아왔다.' : `흐릿한 자리 세 곳에서 으네로 다시 찍자. (${['photo_1', 'photo_2', 'photo_3'].filter(album).length}/3)`)] : []),
    ...(f('sq.14.start') ? [Q('SQ14', '서브', '액자 가게', f('sq.14'), f('sq.14') ? '큰 빈 액자를 받았다.' : `액자 재료를 모으자. (${inv('mat')}/3)`)] : []),
  ],
};

// ═════════════════════════ 그림자의 도시 ═════════════════════════
const LAMPS = ['lamp0', 'lamp1', 'lamp2', 'lamp3'];
const shadow: RegionScript = {
  id: 'shadow', dark: true,
  arrive: async c => { await c.say('shadow_arrive'); },
  talk: {
    cat: async c => {
      if (!f('mq.shadow')) {
        await c.say('shadow_cat');
        c.chase('chase_start', 'chase_goal', LAMPS, async c2 => {
          await c2.say('shadow_point_scene');
          const ch = String(Story1.getVar('shadow_point') || 'return'); set('choice.shadow', ch);
          set('mq.shadow'); c2.world(); GameState.setBw(GameState.bwMax()); c2.bond('shiro', 'haming'); c2.spend(2, '포인트의 봉인'); c2.refresh();
        });
        return;
      }
      if (!f('sq.15.start')) { await c.say('sq15_start'); set('sq.15.start'); c.refresh(); return; }
      if (!f('sq.15') && inv('kitten') > 0) { await c.say('sq15_done'); set('sq.15'); GameState.data.inventory.kitten = 0; c.note('shadow_02'); c.bond('shiro'); c.spend(1, '길고양이'); c.refresh(); return; }
      c.toast('검은 고양이: 냐.');
    },
    merchant: async c => {
      if (!f('sq.16.start')) { await c.say('sq16_start'); set('sq.16.start'); c.refresh(); return; }
      if (!f('sq.16') && count(['sq16.0', 'sq16.1', 'sq16.2', 'sq16.3']) === 4) { await c.say('sq16_done'); set('sq.16'); c.give('starShard', 50); c.bond('haming'); c.spend(1, '간판 밝히기'); c.refresh(); return; }
      c.shop('그림자 상점');
    },
  },
  npcShow: { cat: () => GameState.data.leader === 'shiro' },
  npcMark: {
    cat: () => !f('mq.shadow') ? '!' : !f('sq.15.start') ? '!' : !f('sq.15') && inv('kitten') > 0 ? '?' : '',
    merchant: () => !f('sq.16.start') ? '!' : !f('sq.16') && count(['sq16.0', 'sq16.1', 'sq16.2', 'sq16.3']) === 4 ? '?' : '',
  },
  things: [
    { id: 'chase_start', at: { npc: 'cat' }, tex: 'step', show: () => false },
    { id: 'chase_goal', at: { far: 0 }, tex: 'goal', label: '탈출구', show: () => f('mode.chase') },
    ...LAMPS.map((id, i) => ({ id, at: { far: 1 + i }, tex: () => f(`chase.${id}`) ? 'lamp_on' : 'lamp', label: '꺼진 가로등', show: () => !f('mq.shadow'),
      use: (c: Ctx) => c.toast('꺼진 가로등. 꽃등을 달면 밝아질 것 같다. (하밍)'),
      ability: { haming: (c: Ctx) => { if (f(`chase.${id}`)) return c.toast('이미 꽃등이 켜져 있다.'); set(`chase.${id}`); c.fx('star'); c.toast('개화! 가로등에 꽃등이 켜졌다.'); c.refresh(); } } } as Thing)),
    { id: 'kitten', at: { gated: true }, tex: 'kitten', label: '새끼 고양이', once: true, show: () => f('sq.15.start') && !f('sq.15'),
      touch: c => { c.give('kitten'); c.toast('새끼 고양이를 안았다. 검은 고양이에게 데려가자.'); } },
    ...[0, 1, 2, 3].map(i => ({ id: `sign${i}`, at: { far: 5 + i }, tex: () => f(`sq16.${i}`) ? 'signboard_on' : 'signboard', label: '꺼진 간판', show: () => f('sq.16.start') || f(`sq16.${i}`),
      use: (c: Ctx) => c.toast(f(`sq16.${i}`) ? '꽃 간판이 환하다.' : '꺼진 간판. 하밍의 꽃등이라면…'),
      ability: { haming: (c: Ctx) => { if (f(`sq16.${i}`)) return; set(`sq16.${i}`); c.fx('star'); c.toast(`간판에 꽃등이 켜졌다. (${count(['sq16.0', 'sq16.1', 'sq16.2', 'sq16.3'])}/4)`); c.refresh(); } } } as Thing)),
    chest('shadow', { far: 9 }, 50),
    ...photoSpots('shadow', ['골목의 보랏빛 수정', '거꾸로 도는 시계탑', '옥상 위 달', '고양이 길']),
  ],
  hiddenNotes: ['shadow_03'], rewardNotes: ['shadow_02'],
  quests: () => [
    Q('MQ09', '메인', '포인트', f('mq.shadow'), f('mq.shadow') ? '포인트는 빅윈이 떼어 낸 기억이었다. 마지막 저장소가 열렸다.'
      : '시로로 바꾸면 검은 고양이가 보인다. 고양이를 따라가자. 크론에게 쫓기면 하밍의 꽃등으로 시야를 끊자.'),
    ...(f('sq.15.start') ? [Q('SQ15', '서브', '길고양이', f('sq.15'), f('sq.15') ? '새끼 고양이를 데려다줬다.' : '시로로 좁은 창살 틈을 지나 새끼 고양이를 데려오자.')] : []),
    ...(f('sq.16.start') ? [Q('SQ16', '서브', '꺼진 간판', f('sq.16'), f('sq.16') ? '도시에 꽃 간판이 켜졌다.' : `하밍으로 간판에 꽃등을 켜자. (${count(['sq16.0', 'sq16.1', 'sq16.2', 'sq16.3'])}/4)`)] : []),
  ],
};

// ═════════════════════════ 마지막 저장소 ═════════════════════════
const GUARD: { text: string; answer: CharId }[] = [
  { text: '놀이공원 개장 계획표', answer: 'dotcha' },
  { text: '구름 마을의 첫 하늘 스케치', answer: 'rumung' },
  { text: '기차역 순환선 노선도', answer: 'darae' },
  { text: '거울 숲 일지의 마지막 장', answer: 'dodamhi' },
  { text: '그림자 도시 옥상의 의자 아홉 개', answer: 'shiro' },
  { text: '팀 폴더 정리 도구 v0.1', answer: 'ttuning' },
  { text: '달빛 정원 물 주기 당번표', answer: 'haming' },
  { text: '사진 속 마을 필름 서른여섯 장', answer: 'eune' },
  { text: '프로젝트 폴더 savria_v0.9', answer: 'bigwin' },
];
async function finalEvent(c: Ctx) {
  if (!f('mq.shadow')) return c.toast('세이브 코어. 아직 다가갈 수 없다.');
  for (const id of CHAR_IDS) Story1.story.variablesState[`b_${id}`] = GameState.data.bond[id] ?? 0;
  Story1.story.variablesState['frame'] = GameState.item('frame') > 0;
  if (!f('final.read')) { await c.say('final_start'); set('final.read'); }
  const r = await c.puzzle({ kind: 'guard', title: '크론 — 정리 대상 목록', desc: '크론이 읽는 기억을 만든 사람을 골라, 그 사람이 기억을 지키게 하자.', entries: GUARD, lives: 3 });
  if (r === 'cancel') return;
  if (r === 'fail') { await c.say('final_fail'); c.spend(1, '최종 이벤트 재도전'); return; }
  await c.say('final_choice_scene');
  const ch = String(Story1.getVar('final_choice'));
  set('mq.final'); set('choice.final', ch);
  const d = GameState.data;
  if (ch === 'none') return c.ending('reset');
  if (ch === 'new' && d.memories.core.length >= 9 && GameState.item('saveKey') > 0) return c.ending('true');
  c.ending('normal');
}
const lastsave: RegionScript = {
  id: 'lastsave',
  arrive: async c => { await c.say('lastsave_arrive'); set('sq.17.start'); },
  things: [
    { id: 'core', at: { sign: 'core' }, tex: 'core', label: '세이브 코어', use: finalEvent, mark: () => '!' },
    ...[0, 1, 2].map(i => ({ id: `rec${i}`, at: { far: i }, tex: 'record', label: '숨은 연기 기록', hidden: true, once: true, show: () => f('sq.17.start') && !f('sq.17'),
      touch: async (c: Ctx) => { c.give('record'); if (inv('record') >= 3) { await c.say('sq17_done'); GameState.data.inventory.record = 0; set('sq.17'); c.bond('bigwin'); c.spend(1, '연기 기록'); c.refresh(); } else c.toast(`숨은 연기 기록을 찾았다. (${inv('record')}/3)`); } } as Thing)),
    ...photoSpots('lastsave', ['나선 계단 아홉 층', '세이브 코어의 별빛', '마흔일곱 개의 기록', '별빛 공간의 끝']),
  ],
  hiddenNotes: ['lastsave_02'],
  quests: () => [
    Q('MQ10', '메인', '마지막 저장점', f('mq.final'), f('mq.final') ? '최종 선택을 마쳤다.' : '세이브 코어로 가서 크론과 마주하자. 크론이 읽는 기억마다 그 기억을 만든 사람을 고르자.'),
    ...(f('sq.17.start') ? [Q('SQ17', '서브', '47개의 연기 기록', f('sq.17'), f('sq.17') ? '숨은 기록 세 개를 찾았다.' : `다래의 측량으로 숨은 연기 기록 세 개를 찾자. (${inv('record')}/3)`)] : []),
  ],
};

// ═════════════════════════ 휴지통 섬 (시크릿) ═════════════════════════
const trash: RegionScript = {
  id: 'trash',
  arrive: async c => { if (f('secret.mode')) await c.say('ending_secret_wake'); },
  talk: { cron: async c => { if (!f('secret.mode')) return c.toast('크론: …아직 대답을 기다리는 중입니다.'); await c.say('ending_secret'); c.ending('secret'); } },
  npcMark: { cron: () => f('secret.mode') ? '!' : '' },
  things: [],
};

// ═════════════════════════ 구름 위의 마을 (추가 요소) ═════════════════════════
const cloud: RegionScript = {
  id: 'cloud',
  things: [
    ...photoSpots('cloud', ['광장 분수대', '시계탑과 하늘', '벚나무 그네', '유리 온실'], [{ sign: 'fountain', dx: 3 }, { pos: 'tower', dy: 3 }, { sign: 'swing', dx: -2 }, { sign: 'dome', dy: 3 }]),
  ],
};

export const SCRIPTS: Record<string, RegionScript> = { cloud, mirror, park, data, garden, station, photo, shadow, lastsave, trash };

// ═════════════════════════ 개인 에피소드 ═════════════════════════
export interface Episode { id: CharId; map: string; home: string; title: string; star: string; at: Anchor; frags?: Anchor[]; fragTex?: string; fragName?: string; puzzle?: PuzzleCfg; reward?: string }
export const EPISODES: Episode[] = [
  { id: 'rumung', map: 'cloud', home: 'mq.cloud', title: '첫 하늘', star: '구름 리본자리', at: { pos: 'tower', dx: 4 }, frags: far(30, 3), fragTex: 'page', fragName: '스케치 조각' },
  { id: 'dodamhi', map: 'mirror', home: 'mq.mirror', title: '찢어진 일지', star: '깃펜자리', at: { sign: 'gate', dx: 4 }, frags: far(12, 3), fragTex: 'page', fragName: '일지 페이지' },
  { id: 'dotcha', map: 'park', home: 'mq.park', title: '1분의 지각', star: '리본 별자리', at: { sign: 'board', dx: 3 },
    puzzle: { kind: 'dial', title: '공원 시계', desc: '지금은 10시 00분. 바늘을 딱 1분 되돌리자.', slots: [{ label: '시', options: ['9', '10'] }, { label: '분', options: ['57', '58', '59', '00'] }], start: [1, 3], answer: [0, 2] } },
  { id: 'ttuning', map: 'data', home: 'mq.datacenter', title: '정리 규칙', star: '고양이 안경자리', at: { far: 13 }, reward: 'cronCfg',
    puzzle: { kind: 'order', title: '원본 설정 파일', desc: '설정 파일을 해석하는 순서. 열고, 누가 썼는지 보고, 규칙을 읽는다.', items: ['규칙 읽기', '파일 열기', '작성자 확인'], answer: [1, 2, 0] } },
  { id: 'bigwin', map: 'lastsave', home: 'mq.shadow', title: '주머니 속 열쇠', star: '왕관자리', at: { sign: 'door' }, frags: far(13, 3), fragTex: 'record', fragName: '빛나는 연기 기록', reward: 'saveKey' },
  { id: 'haming', map: 'garden', home: 'mq.garden', title: '마지막 꽃', star: '데이지자리', at: { far: 12 },
    puzzle: { kind: 'timing', title: '마지막 화분', desc: '꽃잎이 열릴 때 SPACE / A. 천천히, 다정하게.', rounds: 3, lives: 4, speed: 0.8, zone: 0.22, labels: ['떡잎', '봉오리', '꽃'] } },
  { id: 'darae', map: 'station', home: 'mq.station', title: '그리지 못한 선', star: '나뭇잎자리', at: { far: 12 }, frags: far(13, 3), fragTex: 'page', fragName: '노선도 조각' },
  { id: 'eune', map: 'photo', home: 'mq.photo', title: '단체 사진', star: '별 카메라자리', at: { sign: 'camera' },
    puzzle: { kind: 'timing', title: '타이머 카메라', desc: '걸린 태엽이 맞물릴 때 SPACE / A.', rounds: 3, lives: 3, speed: 1.1, zone: 0.18, labels: ['태엽 1', '태엽 2', '태엽 3'] } },
  { id: 'shiro', map: 'shadow', home: 'mq.shadow', title: '혼자의 도시', star: '고양이 귀자리', at: { far: 12 } },
];
export const episodeOpen = (e: Episode) => !!GameState.flag(e.home) && (GameState.data.bond[e.id] ?? 0) >= 3 && !GameState.flag(`ep.${e.id}`);

// ═════════════════════════ 상점 ═════════════════════════
export const SHOP: { k: string; price: number; acc?: boolean }[] = [
  { k: 'starCandy', price: 20 }, { k: 'tea', price: 15 }, { k: 'cotton', price: 10 },
  { k: 'acc_feather', price: 60, acc: true }, { k: 'acc_brooch', price: 80, acc: true }, { k: 'acc_bell', price: 70, acc: true },
];

/** 2막 이후 퀘스트 목록 */
export function regionQuests(): QuestView[] {
  const order = ['mirror', 'park', 'data', 'garden', 'station', 'photo', 'shadow', 'lastsave'];
  return order.filter(id => GameState.flag(`visit.${id}`)).flatMap(id => SCRIPTS[id].quests?.() ?? []);
}
