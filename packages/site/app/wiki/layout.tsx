import type { Metadata } from 'next';
import WikiNav from './WikiNav';

export const metadata: Metadata = { title: '공략 위키 — LAST SAVE : 마지막 저장점' };

export default function WikiLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="wiki">
      <header className="wiki-top">
        <a href="/" className="wiki-logo">LAST SAVE <span>공략 위키</span></a>
        <a href="/play/" className="wiki-play">게임 하기 ▶</a>
      </header>
      <div className="wiki-body">
        <WikiNav />
        <main className="wiki-main">{children}</main>
      </div>
      <footer><p>스포일러는 접혀 있다. 눌러야 보인다.</p></footer>
    </div>
  );
}
