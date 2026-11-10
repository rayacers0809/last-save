import { ITEMS, SHOP_ITEMS } from '@/lib/wiki';

const GROUPS = ['재화 · 소모품', '액세서리', '퀘스트 물건', '중요한 물건'];

export default function Items() {
  return (
    <article>
      <h1>아이템 도감 · 상점</h1>
      <p className="wiki-lead">가방(I)에서 아이템에 커서를 올리면 설명이 나온다. 별사탕·차·구름솜은 가방에서 쓰고, 액세서리는 가방에서 장착한다.</p>

      {GROUPS.map(g => (
        <div key={g}>
          <h2>{g}</h2>
          <ul className="wiki-items">
            {ITEMS.filter(i => i.group === g).map(i => (
              <li key={i.k}>
                <img src={`/items/${i.k}.png`} alt="" width={64} height={64} />
                <div>
                  <h3>{i.name}</h3>
                  <p>{i.desc}</p>
                  <p className="where">{i.where}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <h2>상점</h2>
      <p>상점은 세 곳. 구름 마을 <b>빵집 할머니</b>(SQ02를 끝내면), 달빛 정원 <b>정원사 라일</b>, 그림자 도시 <b>그림자 상인</b>. 파는 물건은 같다. 액세서리는 하나씩만 산다.</p>
      <div className="wiki-table-wrap"><table className="wiki-table">
        <thead><tr><th scope="col">물건</th><th scope="col">별조각</th><th scope="col">효과</th></tr></thead>
        <tbody>{SHOP_ITEMS.map(i => <tr key={i.name}><td>{i.name}</td><td>{i.price}</td><td>{i.desc}</td></tr>)}</tbody>
      </table></div>

      <h2>액세서리 고르기</h2>
      <ul className="wiki-list">
        <li>처음엔 칸이 1개, 거울의 숲 <b>SQ04 깨진 손거울</b>을 끝내면 2개.</li>
        <li>추천: 일찍 <b>별 브로치</b>(별조각 1.5배) → 그림자 도시 전에 <b>고양이 방울</b>로 바꾸거나 같이 끼기.</li>
      </ul>
    </article>
  );
}
