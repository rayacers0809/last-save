/** **굵게** 표시만 지원하는 작은 텍스트 렌더러 */
export default function Rich({ t }: { t: string }) {
  const parts = t.split(/\*\*(.+?)\*\*/g);
  return <>{parts.map((p, i) => i % 2 ? <b key={i}>{p}</b> : p)}</>;
}
