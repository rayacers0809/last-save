import { SHOP_ITEMS } from '@/lib/wiki';

export default function Items() {
  return (
    <article>
      <h1>상점 · 아이템</h1>
      <p className="wiki-lead">상점은 세 곳. 구름 마을 <b>빵집 할머니</b>(SQ02를 끝내면), 달빛 정원 <b>정원사 라일</b>, 그림자 도시 <b>그림자 상인</b>. 파는 물건은 같다.</p>
      <div className="wiki-table-wrap"><table className="wiki-table">
        <thead><tr><th scope="col">물건</th><th scope="col">별조각</th><th scope="col">효과</th></tr></thead>
        <tbody>{SHOP_ITEMS.map(i => <tr key={i.name}><td>{i.name}</td><td>{i.price}</td><td>{i.desc}</td></tr>)}</tbody>
      </table></div>

      <h2>액세서리</h2>
      <ul className="wiki-list">
        <li>처음엔 칸이 1개, 거울의 숲 <b>SQ04 깨진 손거울</b>을 끝내면 2개.</li>
        <li>가방(I)에서 장착/해제.</li>
        <li>추천: 일찍 <b>별 브로치</b>(별조각 1.5배) → 그림자 도시 전에 <b>고양이 방울</b>로 교체.</li>
      </ul>

      <h2>퀘스트 아이템</h2>
      <ul className="wiki-list">
        <li><b>크론 원본 설정 파일</b> — 뚜닝 에피소드 보상.</li>
        <li><b>저장 열쇠</b> — 빅윈 에피소드 보상. 트루 엔딩 필수.</li>
        <li><b>빈 액자</b> — 사진 마을 SQ14 보상. 최종장 추가 장면.</li>
      </ul>
    </article>
  );
}
