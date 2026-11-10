import { REGIONS } from '@/lib/wiki';

export default function WikiHome() {
  return (
    <article>
      <h1>처음이라면</h1>
      <p className="wiki-lead">세이브리아는 72시간 안에 별을 다시 켜는 게임이다. 막히는 곳은 거의 다 <b>"이 장면엔 누구의 능력이 필요한가"</b>에서 나온다. 아래 다섯 가지만 알면 끝까지 갈 수 있다.</p>

      <ol className="wiki-five">
        <li><b>퀘스트 창(J)이 다음 할 일을 알려 준다.</b> 진행 중인 퀘스트 설명에 누구로 무엇을 할지 적혀 있다.</li>
        <li><b>머리 위 표시를 따라가자.</b> <code>!</code> 새 일 · <code>?</code> 완료 보고 · <code>✦</code> 도담히로 읽을 것 · <code>♥</code> 개인 에피소드.</li>
        <li><b>캐릭터 바꾸기(1~9, Tab) → Q 능력.</b> 오브젝트 이름에 힌트가 있다. 바위=돗챠, 단말기=뚜닝, 빈 하늘=루뭉, 꽃=하밍, 잠긴 상자=빅윈.</li>
        <li><b>안 보이는 건 다래 측량.</b> 끊긴 선로·바랜 자리·숨은 노트는 다래로 Q를 눌러야 지도(M)에 나온다.</li>
        <li><b>시간은 행동마다 흐른다.</b> 이동, 퍼즐 클리어, 휴식, 실패가 시간을 쓴다. 0이 되면 초기화 엔딩. 자세한 건 <a href="/wiki/basics/">기본 시스템</a>.</li>
      </ol>

      <h2>진행 순서</h2>
      <p>막 안에서는 지역 순서를 자유롭게 골라도 된다. 각 지역의 하늘 정류장에서 이동한다.</p>
      <div className="wiki-route">
        {[['프롤로그', ['studio']], ['1막', ['cloud']], ['2막', ['mirror', 'park', 'data']], ['3막', ['garden', 'station', 'photo']], ['4막', ['shadow', 'lastsave']], ['시크릿', ['trash']]].map(([act, ids]) => (
          <section key={act as string} className="wiki-act">
            <h3>{act as string}</h3>
            <ul>
              {(ids as string[]).map(id => { const r = REGIONS.find(x => x.id === id)!; return (
                <li key={id}><a href={`/wiki/region/${id}/`}><span className="nm">{r.name}</span><span className="un">{r.unlock}</span></a></li>
              ); })}
            </ul>
          </section>
        ))}
      </div>

      <h2>트루 엔딩을 노린다면</h2>
      <ul className="wiki-list">
        <li>개인 에피소드 9개(핵심 기억 9)와 빅윈 에피소드의 <b>저장 열쇠</b>가 필요하다.</li>
        <li>에피소드는 그 사람의 지역 별을 켜고 <b>유대 3</b>이 되어야 열린다. 서브 퀘스트와 휴식 대화로 유대를 올리자. → <a href="/wiki/characters/">유대 올리는 곳</a></li>
        <li>72시간으로 서브 퀘스트까지 전부 하기는 빠듯하다. 에피소드 위주로, 유대가 모자란 사람의 서브 퀘스트를 골라서 하자.</li>
      </ul>
    </article>
  );
}
