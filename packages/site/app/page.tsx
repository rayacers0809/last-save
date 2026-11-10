import { CHARS, CHAPTERS } from '@/lib/data';
import Countdown from './Countdown';

export default function Home() {
  return (
    <main>
      {/* 타이틀 화면 */}
      <section className="hero" aria-labelledby="title">
        <div className="stars" aria-hidden />
        <div className="hero-inner">
          <h1 id="title" className="logo">LAST SAVE</h1>
          <p className="sub">마지막 저장점</p>
          <div className="syswin" role="status">
            <p className="err">SYSTEM ERROR</p>
            <p>SAVE DATA 0% · 현재 접속 인원 9명</p>
            <p>세계 초기화까지 <Countdown /></p>
          </div>
          <nav className="title-menu" aria-label="시작">
            <a href="/play/" className="menu-item primary">새로 시작</a>
            <a href="#slots" className="menu-item">아홉 명 만나기</a>
            <a href="#world" className="menu-item">세이브리아 둘러보기</a>
            <a href="/wiki/" className="menu-item">공략 위키</a>
          </nav>
        </div>
        <ul className="lineup" aria-label="아홉 명의 별지기">
          {CHARS.map(c => <li key={c.id}><img src={`/chars/${c.id}_card.png`} alt={c.name} /></li>)}
        </ul>
      </section>

      {/* 소개 */}
      <section className="intro">
        <div className="wrap">
        <p>빅윈이 몇 년째 끝내지 못한 게임, <b>세이브리아</b>. 오랜만에 모인 아홉 명이 테스트 플레이를 켜자 화면이 깨지고, 모두 게임 안에 갇힌다.</p>
        <p>오래 방치된 프로젝트를 지우는 정리 프로그램 크론이 별을 하나씩 꺼 간다. 72시간 안에 흩어진 기억을 되찾고 세계를 마지막으로 저장해야 한다.</p>
        </div>
      </section>

      {/* 캐릭터: 세이브 슬롯 */}
      <section id="slots" className="slots" aria-labelledby="slots-h">
        <div className="wrap">
        <h2 id="slots-h">세이브 슬롯</h2>
        <p className="lead">시작할 때 아홉 명 중 한 명을 첫 접속자로 고른다. 슬롯 번호는 게임 안에서 그 캐릭터로 바꾸는 숫자키다.</p>
        <ol className="slot-list">
          {CHARS.map((c, i) => (
            <li key={c.id} className="slot" style={{ '--c': c.color } as React.CSSProperties} tabIndex={0}>
              <span className="slot-no" aria-label={`슬롯 ${i + 1}`}>{i + 1}</span>
              <img className="slot-por" src={`/chars/${c.id}_por.png`} alt="" />
              <div className="slot-body">
                <h3><span className="nm">{c.name}</span> <span className="tt">{c.title}</span></h3>
                <p className="where">{c.region}</p>
                <p className="abil"><b>{c.ability}</b> {c.does}</p>
                <p className="line">“{c.line}”</p>
              </div>
            </li>
          ))}
        </ol>
        </div>
      </section>

      {/* 세계 */}
      <section id="world" className="world" aria-labelledby="world-h">
        <div className="wrap">
        <h2 id="world-h">세이브리아</h2>
        <p className="lead">기억이 별로 저장되는 세계. 지역은 아홉 명이 하나씩 맡아 만든 곳이고, 그 사람의 능력이 그 지역의 길을 연다.</p>
        <ol className="acts">
          {CHAPTERS.map(ch => (
            <li key={ch.act} className="act">
              <div className="act-head"><span className="act-no">{ch.act}</span><h3>{ch.title}</h3></div>
              <p>{ch.story}</p>
              <ul className="places">
                {ch.places.map(p => <li key={p.id}><img src={`/maps/${p.id}.webp`} alt="" /><span>{p.name}</span></li>)}
              </ul>
            </li>
          ))}
        </ol>
        <p className="endings">엔딩은 넷. 무엇을 되찾았는지, 그리고 마지막에 무엇을 저장할지에 따라 갈린다.</p>
        </div>
      </section>

      {/* 조작 */}
      <section className="how" aria-labelledby="how-h">
        <div className="wrap">
        <h2 id="how-h">조작</h2>
        <table>
          <thead><tr><th scope="col">할 일</th><th scope="col">PC</th><th scope="col">모바일</th></tr></thead>
          <tbody>
            <tr><td>이동 · 달리기</td><td><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> · <kbd>Shift</kbd></td><td>왼쪽 조이스틱</td></tr>
            <tr><td>대화 · 결정</td><td><kbd>Space</kbd></td><td>A 버튼</td></tr>
            <tr><td>능력</td><td><kbd>Q</kbd></td><td>B 버튼</td></tr>
            <tr><td>캐릭터 교체</td><td><kbd>1</kbd>~<kbd>9</kbd> · <kbd>Tab</kbd></td><td>아래 얼굴 버튼</td></tr>
            <tr><td>퀘스트 · 가방 · 지도</td><td><kbd>J</kbd> <kbd>I</kbd> <kbd>M</kbd></td><td>≡ 메뉴</td></tr>
          </tbody>
        </table>
        <p className="note">아이디·비밀번호로 가입하면 바로 시작한다. 포인트(노란 별)에게 말을 걸어 저장하면 계정에 남아서 다른 기기에서도 이어 할 수 있다.</p>
        <a href="/play/" className="menu-item primary big">새로 시작</a>
        <p className="note">처음이라 막막하면 <a href="/wiki/">공략 위키</a>부터.</p>
        </div>
      </section>

      <footer><p>LAST SAVE : 마지막 저장점 · <a href="/wiki/">공략 위키</a></p></footer>
    </main>
  );
}
