import { REGIONS } from '@/lib/wiki';

export default function WikiHome() {
  return (
    <article>
      <h1>처음이라면</h1>
      <p className="wiki-lead">세이브리아는 72시간 안에 별을 다시 켜는 게임이다. 막히는 곳은 거의 다 <b>"이 장면엔 누구의 능력이 필요한가"</b>에서 나온다. 아래 다섯 가지만 알면 끝까지 갈 수 있다. 사실 1번 화살표만 따라가도 된다.</p>

      <ol className="wiki-five">
        <li><b>왼쪽 위 ▶ 노란 글씨가 지금 할 일이다.</b> 바닥의 노란 점과 화면 가장자리 화살표가 그곳까지 길을 알려 준다.</li>
        <li><b>사람·물건 앞에서 Space(모바일 A).</b> 동료의 능력이 필요하면 알아서 그 동료로 바꿔서 써 준다.</li>
        <li><b>민트색 칸이 보이면 그 위에서 Space.</b> 구름 발판(루뭉), 바위 부수기(돗챠), 덩굴 피우기(하밍) 같은 능력이 나간다.</li>
        <li><b>안 보이는 건 다래 측량.</b> 끊긴 선로·바랜 자리·숨은 노트는 다래로 Q를 눌러야 지도(M)에 나온다.</li>
        <li><b>시간은 행동마다 흐른다.</b> 처음이면 시작할 때 <b>여유롭게</b>(시간 절반)를 고르자. 막히면 Esc → <b>힌트</b> 또는 <b>이 지역 공략 보기</b>. 자세한 건 <a href="/wiki/basics/">기본 시스템</a>.</li>
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
        <li>여유롭게 모드라면 서브 퀘스트까지 다 해도 시간이 남는다. 72시간 그대로라면 에피소드 위주로, 유대가 모자란 사람의 서브 퀘스트를 골라서 하자.</li>
      </ul>
    </article>
  );
}
