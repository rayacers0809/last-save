import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'LAST SAVE : 마지막 저장점',
  description: '미완성 게임 세이브리아에 갇힌 아홉 명. 72시간 안에 마지막 저장을 해야 한다. 브라우저에서 바로 하는 스토리 픽셀 RPG.',
};
export const viewport: Viewport = { themeColor: '#160f33', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ko"><body>{children}</body></html>;
}
