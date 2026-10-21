'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';

const LINKS = [
  {href: '/projects', label: 'Projects'},
  {href: '/people', label: 'People'},
] as const;

/** The working screens, in the navy bar. 44px tall on a phone so each one is easy to tap. */
export function TopNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Studio" className="flex items-center gap-0.5">
      {LINKS.map(({href, label}) => {
        const current = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? 'page' : undefined}
            className={`flex h-11 items-center rounded-md px-2.5 text-sm transition-colors md:h-9 md:px-3 ${
              current ? 'bg-white/15 font-medium text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
