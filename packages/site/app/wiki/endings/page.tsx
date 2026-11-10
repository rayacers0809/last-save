export default function Endings() {
  return (
    <article>
      <h1>엔딩 · 수집</h1>
      <p className="wiki-lead">엔딩은 넷. 마지막 저장소의 최종 선택과, 그때까지 무엇을 모았는지로 갈린다.</p>

      <details className="spoiler" open={false}>
        <summary>엔딩 조건 <span>스포일러 보기</span></summary>
        <div className="wiki-table-wrap"><table className="wiki-table">
          <thead><tr><th scope="col">엔딩</th><th scope="col">조건</th></tr></thead>
          <tbody>
            <tr><td>초기화</td><td>남은 시간이 0이 되거나, 마지막 선택에서 <b>"저장하지 않는다"</b></td></tr>
            <tr><td>노멀</td><td>마지막 선택에서 <b>"예전 기억을 되돌린다"</b>, 또는 트루 조건이 모자란 채 "새 기억을 만든다"</td></tr>
            <tr><td>트루</td><td><b>핵심 기억 9개</b>(개인 에피소드 전부) + <b>저장 열쇠</b>(빅윈 에피소드) + <b>"새 기억을 만든다"</b>. 크레딧에 앨범 사진이 나온다</td></tr>
            <tr><td>시크릿</td><td>트루 엔딩 조건 + <b>버그 노트 27개</b> → 엔딩 뒤 휴지통 섬에서 깨어난다. 크론에게 말 걸기</td></tr>
          </tbody>
        </table></div>
        <p>빈 액자(SQ14)를 가지고 있거나 유대 5인 사람이 있으면 최종장에 장면·대사가 추가된다.</p>
      </details>

      <h2>모을 것</h2>
      <div className="wiki-table-wrap"><table className="wiki-table">
        <thead><tr><th scope="col">이름</th><th scope="col">개수</th><th scope="col">얻는 법</th><th scope="col">쓰는 곳</th></tr></thead>
        <tbody>
          <tr><td>세계 기억</td><td>8</td><td>지역 메인 퀘스트(별 켜기)</td><td>빅윈 권한 최대치 증가</td></tr>
          <tr><td>핵심 기억</td><td>9</td><td>개인 에피소드</td><td>트루 엔딩</td></tr>
          <tr><td>버그 노트</td><td>27</td><td>9지역 × 3. 길에 떨어진 것 · 다래 측량으로만 보이는 것 · 서브 퀘스트 보상</td><td>시크릿 엔딩</td></tr>
          <tr><td>앨범 사진</td><td>36</td><td>9지역 × 4. 카메라 표시 지점에서 으네로 Q (사진 마을은 SQ13 포함)</td><td>트루 엔딩 크레딧</td></tr>
          <tr><td>별조각</td><td>—</td><td>서브 퀘스트, 잠긴 상자(빅윈)</td><td>상점</td></tr>
        </tbody>
      </table></div>
      <p className="wiki-tip">노트를 줍지 못한 지역이 있다면: 그 지역에서 다래로 측량 → M 지도를 열어 보자. 구름 걸음·돌진·덩굴 너머에 있는 것도 있다.</p>

      <h2>한 번 깬 뒤</h2>
      <p>초기화 엔딩을 본 뒤 다시 시작하면 타이틀이 조금 달라진다. 시크릿 엔딩을 보면 타이틀에 표시가 하나 붙는다.</p>
    </article>
  );
}
