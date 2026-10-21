'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';

// The studio's screens, left to right as the partners read them. Registered here in one place so adding
// a screen is one line rather than a hunt.
const LINKS = [
  {href: '/today', label: 'Today', adminOnly: false},
  {href: '/my-work', label: 'My work', adminOnly: false},
  {href: '/projects', label: 'Portfolio', adminOnly: false},
  {href: '/timeline', label: 'Timeline', adminOnly: false},
  {href: '/clashes', label: 'Clashes', adminOnly: false},
  {href: '/people', label: 'People', adminOnly: false},
  {href: '/settings', label: 'Settings', adminOnly: true},
] as const;

/**
 * The working screens, in the navy bar. 44px tall on a phone so each one is easy to tap, and it scrolls
 * sideways rather than wrapping when five labels will not fit at 390px.
 *
 * Settings is shown to admins only. That is a matter of what to show: the database refuses everyone else's
 * writes whatever this renders.
 */
export function TopNav({isAdmin}: {isAdmin: boolean}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Studio"
      className="-mx-1 flex min-w-0 items-center gap-0.5 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {LINKS.filter((link) => isAdmin || !link.adminOnly).map(({href, label}) => {
        const current = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? 'page' : undefined}
            className={`flex h-11 shrink-0 items-center rounded-md px-2.5 text-sm transition-colors md:h-9 md:px-3 ${
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
