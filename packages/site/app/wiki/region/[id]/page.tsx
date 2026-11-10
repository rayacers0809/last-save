import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { REGIONS } from '@/lib/wiki';
import Rich from '@/components/Rich';

export function generateStaticParams() { return REGIONS.map(r => ({ id: r.id })); }
export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const r = REGIONS.find(x => x.id === params.id);
  return { title: `${r?.name ?? ''} 공략 — LAST SAVE 위키` };
}

export default function RegionPage({ params }: { params: { id: string } }) {
  const i = REGIONS.findIndex(x => x.id === params.id);
  if (i < 0) notFound();
  const r = REGIONS[i], prev = REGIONS[i - 1], next = REGIONS[i + 1];
  return (
    <article>
      <p className="wiki-kicker">{r.act}</p>
      <h1>{r.name}</h1>
      {['studio', 'trash'].includes(r.id) ? null : <img className="wiki-map" src={`/maps/${r.id}.webp`} alt="" />}
      <p className="wiki-lead">{r.summary}</p>
      <dl className="wiki-info">
        <div><dt>만든 사람</dt><dd>{r.owner}</dd></div>
        <div><dt>열리는 조건</dt><dd>{r.unlock}</dd></div>
        <div><dt>주요 NPC</dt><dd>{r.npcs}</dd></div>
      </dl>

      <h2>메인 진행</h2>
      <ol className="wiki-steps">{r.steps.map((s, k) => <li key={k}><Rich t={s} /></li>)}</ol>
      {r.tips?.map((t, k) => <p key={k} className="wiki-tip"><Rich t={t} /></p>)}

      {r.answers.length > 0 && <>
        <h2>퍼즐 정답</h2>
        {r.answers.map(a => (
          <details key={a.label} className="spoiler">
            <summary>{a.label} <span>정답 보기</span></summary>
            <ul>{a.body.map((b, k) => <li key={k}><Rich t={b} /></li>)}</ul>
          </details>
        ))}
      </>}

      {r.choice && <>
        <h2>선택지</h2>
        <details className="spoiler">
          <summary>{r.choice.label} <span>결과 보기</span></summary>
          <p><Rich t={r.choice.body} /></p>
        </details>
      </>}

      {r.subs.length > 0 && <>
        <h2>서브 퀘스트</h2>
        <ul className="wiki-subs">{r.subs.map(s => (
          <li key={s.id}>
            <h3><span className="qid">{s.id}</span>{s.title}</h3>
            <dl>
              <div><dt>받는 곳</dt><dd>{s.giver}</dd></div>
              <div><dt>할 일</dt><dd><Rich t={s.how} /></dd></div>
              <div><dt>보상</dt><dd><Rich t={s.reward} /></dd></div>
            </dl>
          </li>
        ))}</ul>
      </>}

      {r.episode && <>
        <h2>개인 에피소드</h2>
        <div className="wiki-card">
          <h3>♥ {r.episode.title}</h3>
          <p>이 지역 별을 켜고 {r.owner} 유대가 3 이상이면 ♥ 표시가 생긴다. 다가가면 {r.owner}(으)로 바뀌어 진행된다. 끝나면 핵심 기억 +1 (2시간).</p>
          <p><Rich t={r.episode.how} /></p>
          {r.episode.answer && <details className="spoiler"><summary>퍼즐 정답 <span>보기</span></summary><p><Rich t={r.episode.answer} /></p></details>}
        </div>
      </>}

      {r.extras.length > 0 && <>
        <h2>수집 · 기타</h2>
        <ul className="wiki-list">{r.extras.map((e, k) => <li key={k}><Rich t={e} /></li>)}</ul>
      </>}

      <nav className="wiki-pager" aria-label="이전 · 다음 지역">
        {prev ? <a href={`/wiki/region/${prev.id}/`}>← {prev.name}</a> : <span />}
        {next ? <a href={`/wiki/region/${next.id}/`}>{next.name} →</a> : <span />}
      </nav>
    </article>
  );
}
