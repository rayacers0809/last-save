'use client';
import { useEffect, useState } from 'react';

/** 72:00:00에서 줄어드는 시스템 타이머 (페이지를 연 뒤부터 센다) */
export default function Countdown() {
  const [left, setLeft] = useState(72 * 3600);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t0 = Date.now();
    const id = setInterval(() => setLeft(Math.max(0, 72 * 3600 - Math.floor((Date.now() - t0) / 1000))), 1000);
    return () => clearInterval(id);
  }, []);
  const p = (n: number) => String(n).padStart(2, '0');
  return <span className="timer">{p(Math.floor(left / 3600))}:{p(Math.floor(left / 60) % 60)}:{p(left % 60)}</span>;
}
