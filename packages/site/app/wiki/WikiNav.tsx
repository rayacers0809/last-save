'use client';
import { usePathname } from 'next/navigation';
import { NAV } from '@/lib/wiki';

export default function WikiNav() {
  const path = usePathname();
  const norm = (p: string) => (p.endsWith('/') ? p : p + '/');
  return (
    <nav className="wiki-nav" aria-label="위키 목차">
      <ul>
        {NAV.map(n => (
          <li key={n.href}>
            <a href={n.href} aria-current={norm(path) === n.href ? 'page' : undefined}>{n.label}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
