import './globals.css';
import type { Metadata, Viewport } from 'next';

const DESC = '미완성 게임 세이브리아에 갇힌 아홉 명. 72시간 안에 마지막 저장을 해야 한다. 브라우저에서 바로 하는 스토리 픽셀 RPG.';
/** 공유 미리보기 이미지는 절대 주소가 필요하다. 배포 주소를 SITE_URL(빌드 환경 변수)로 넘기면 그걸 쓴다 */
const SITE = process.env.SITE_URL || process.env.CF_PAGES_URL || '';

export const metadata: Metadata = {
  ...(SITE ? { metadataBase: new URL(SITE) } : {}),
  title: 'LAST SAVE : 마지막 저장점',
  description: DESC,
  openGraph: { type: 'website', siteName: 'LAST SAVE', title: 'LAST SAVE : 마지막 저장점', description: DESC, locale: 'ko_KR', ...(SITE ? { images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'LAST SAVE — 아홉 명의 별지기' }] } : {}) },
  twitter: { card: 'summary_large_image', title: 'LAST SAVE : 마지막 저장점', description: DESC, ...(SITE ? { images: ['/og.jpg'] } : {}) },
};
export const viewport: Viewport = { themeColor: '#160f33', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      {/* SITE_URL이 없으면 상대 주소로라도 미리보기 이미지를 알린다 */}
      {!SITE && <head><meta property="og:image" content="/og.jpg" /><meta property="og:image:width" content="1200" /><meta property="og:image:height" content="630" /><meta name="twitter:image" content="/og.jpg" /></head>}
      <body>{children}</body>
    </html>
  );
}
