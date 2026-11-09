'use client';
import { useEffect, useRef } from 'react';

/** 게임을 띄우고 바로 키보드 입력을 받을 수 있게 포커스를 준다 */
export default function GameFrame() {
  const ref = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const f = ref.current; if (!f) return;
    const focus = () => { f.focus(); f.contentWindow?.focus(); };
    f.addEventListener('load', focus); focus();
    return () => f.removeEventListener('load', focus);
  }, []);
  return <iframe ref={ref} src="/game/index.html" title="LAST SAVE 게임" allow="fullscreen; autoplay; gamepad" allowFullScreen />;
}
