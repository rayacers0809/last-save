'use client';
import { useEffect, useState } from 'react';

// 게임과 같은 Supabase 공개 통계 함수(ls_stats). 개인 정보 없음.
const URL = 'https://tqwndebjhvkntiqhadnl.supabase.co/rest/v1/rpc/ls_stats';
const KEY = 'sb_publishable_aScqzh8RDDFjRp2vbWuj7g_4Eb-euiH';
type S = { players: number; endings: Record<string, number> };

export default function Stats() {
  const [s, setS] = useState<S | null>(null);
  useEffect(() => {
    fetch(URL, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: '{}' })
      .then(r => (r.ok ? r.json() : null)).then(j => j && setS(j)).catch(() => {});
  }, []);
  if (!s || !s.players) return null;
  const e = s.endings ?? {};
  const rows: [string, string][] = [['normal', '노멀'], ['true', '트루'], ['secret', '시크릿'], ['reset', '초기화']];
  return (
    <div className="stats" aria-live="polite">
      <p className="stats-head">지금까지 <b>{s.players.toLocaleString('ko-KR')}명</b>이 세이브리아에 접속했다.</p>
      <ul>{rows.map(([k, n]) => <li key={k}><span>{n} 엔딩</span><b>{(e[k] ?? 0).toLocaleString('ko-KR')}명</b></li>)}</ul>
    </div>
  );
}
