import type { Metadata } from 'next';
import GameFrame from './GameFrame';

export const metadata: Metadata = { title: '플레이 — LAST SAVE' };

export default function Play() {
  return (
    <main className="play">
      <a className="back" href="/">사이트로 돌아가기</a>
      <GameFrame />
    </main>
  );
}
