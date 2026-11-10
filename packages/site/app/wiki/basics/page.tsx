export default function Basics() {
  return (
    <article>
      <h1>기본 시스템</h1>

      <h2>조작</h2>
      <div className="wiki-table-wrap"><table className="wiki-table">
        <thead><tr><th scope="col">할 일</th><th scope="col">PC</th><th scope="col">모바일</th></tr></thead>
        <tbody>
          <tr><td>이동 · 달리기</td><td><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> (방향키) · <kbd>Shift</kbd></td><td>왼쪽 조이스틱, 끝까지 밀면 달리기</td></tr>
          <tr><td>대화 · 조사 · 결정</td><td><kbd>Space</kbd> <kbd>E</kbd> <kbd>Enter</kbd></td><td>A</td></tr>
          <tr><td>능력</td><td><kbd>Q</kbd></td><td>B</td></tr>
          <tr><td>캐릭터 교체</td><td><kbd>1</kbd>~<kbd>9</kbd> · <kbd>Tab</kbd></td><td>아래 얼굴 버튼</td></tr>
          <tr><td>퀘스트 · 가방 · 지도</td><td><kbd>J</kbd> <kbd>I</kbd> <kbd>M</kbd></td><td>≡ 메뉴 안</td></tr>
          <tr><td>메뉴 (앨범 · 동료 · 소리)</td><td><kbd>Esc</kbd></td><td>≡</td></tr>
        </tbody>
      </table></div>

      <h2>72시간</h2>
      <p>화면 위 시간은 실제 시간이 아니라 <b>행동</b>으로 줄어든다. 0이 되면 초기화 엔딩.</p>
      <div className="wiki-table-wrap"><table className="wiki-table">
        <thead><tr><th scope="col">행동</th><th scope="col">시간</th></tr></thead>
        <tbody>
          <tr><td>처음 가는 지역으로 이동</td><td>2시간</td></tr>
          <tr><td>가 본 지역으로 이동</td><td>1시간</td></tr>
          <tr><td>메인 퀘스트 클리어</td><td>1~2시간</td></tr>
          <tr><td>서브 퀘스트 완료</td><td>1시간</td></tr>
          <tr><td>개인 에피소드</td><td>2시간</td></tr>
          <tr><td>휴식</td><td>6시간 (따뜻한 차를 마시면 4시간)</td></tr>
          <tr><td>보스·퍼즐 실패, 크론에게 붙잡힘</td><td>1시간</td></tr>
        </tbody>
      </table></div>
      <p className="wiki-tip">걸어 다니고, 대화하고, 퍼즐 화면을 여는 것만으로는 시간이 안 간다. 퍼즐은 Esc로 그냥 나와도 손해 없음.</p>

      <h2>저장 · 휴식 (포인트 ★)</h2>
      <ul className="wiki-list">
        <li>지역마다 있는 <b>포인트</b>에게 말을 걸면 저장과 휴식을 할 수 있다.</li>
        <li>저장은 <b>계정</b>에 된다. 다른 기기에서 같은 아이디로 로그인하면 이어 할 수 있다.</li>
        <li>휴식은 시간을 6시간 쓰지만 <b>빅윈 권한이 가득 차고</b>, 처음 보는 휴식 대화가 있으면 그 두 사람의 유대가 오른다 (12종).</li>
      </ul>

      <h2>빅윈 설계자 권한</h2>
      <p>잠긴 상자와 봉인을 여는 횟수. 화면 HUD에 남은 횟수가 보인다.</p>
      <ul className="wiki-list">
        <li>최대치 = 1 + (세계 기억 ÷ 2) + (그림자 도시를 끝내면 2).</li>
        <li>충전: 휴식(가득) 또는 별사탕(1회).</li>
        <li>그림자 도시에서 포인트를 <b>보류</b>하면 마지막 선택 전까지 최대치가 1로 묶인다.</li>
      </ul>

      <h2>유대 (0~5)</h2>
      <p>퍼즐·메인 퀘스트·서브 퀘스트·휴식 대화·선택지로 오른다. <b>3</b>이 되면 그 사람의 개인 에피소드가 열리고, <b>5</b>면 최종장에서 대사가 추가된다. 어디서 오르는지는 <a href="/wiki/characters/">능력 · 유대</a>.</p>

      <h2>오류 번짐</h2>
      <p>별을 아직 못 켠 지역은 검은 픽셀이 번져 있고, 남은 시간이 24시간 아래로 떨어지면 더 심해진다. 연출일 뿐 진행에는 지장 없다.</p>
    </article>
  );
}
