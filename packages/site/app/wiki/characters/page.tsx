import { ABILITIES, BONDS } from '@/lib/wiki';
import { CHARS } from '@/lib/data';
import Rich from '@/components/Rich';

export default function Characters() {
  return (
    <article>
      <h1>능력 · 유대</h1>
      <p className="wiki-lead">맨 앞에 선 사람(리더)의 능력만 Q로 쓸 수 있다. 1~9 숫자키는 세이브 슬롯 번호와 같다.</p>
      <ul className="wiki-chars">
        {ABILITIES.map((a, i) => {
          const c = CHARS.find(x => x.id === a.id)!;
          return (
            <li key={a.id} style={{ '--c': c.color } as React.CSSProperties}>
              <img src={`/chars/${a.id}_por.png`} alt="" />
              <div>
                <h2><span className="no">{i + 1}</span> {a.name} <small>{a.ability}</small></h2>
                <p><Rich t={a.use} /></p>
                <p className="where">쓰는 곳: {a.where}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <h2>유대 올리는 곳</h2>
      <p>개인 에피소드는 <b>유대 3</b>부터. 서브 퀘스트를 고를 때 유대가 모자란 사람 것부터 하자. 휴식 대화는 두 사람이 모두 동료일 때, 그 지역을 가 본 뒤에 나온다.</p>
      <div className="wiki-table-wrap"><table className="wiki-table">
        <thead><tr><th scope="col">캐릭터</th><th scope="col">유대가 오르는 곳</th></tr></thead>
        <tbody>{BONDS.map(b => <tr key={b.name}><td>{b.name}</td><td>{b.from}</td></tr>)}</tbody>
      </table></div>
    </article>
  );
}
