import {
  CalendarCheckIcon,
  ChartGanttIcon,
  LayoutGridIcon,
  ListChecksIcon,
  SettingsIcon,
  TriangleAlertIcon,
  UsersIcon,
} from 'lucide-react';
import type {ComponentType} from 'react';

export interface NavLink {
  href: string;
  label: string;
  icon: ComponentType<{className?: string}>;
  adminOnly: boolean;
  /** Shown in the phone's bottom bar rather than behind More. Four at most — a fifth slot is More itself. */
  onBar: boolean;
}

/**
 * The studio's screens, left to right as the partners read them. One registry for both bars, so adding a
 * screen is a line here rather than a hunt through two components that can drift apart.
 *
 * Settings is shown to admins only. That is a matter of what to show: the database refuses everyone else's
 * writes whatever this renders.
 */
export const NAV_LINKS: readonly NavLink[] = [
  {href: '/today', label: 'Today', icon: CalendarCheckIcon, adminOnly: false, onBar: true},
  {href: '/my-work', label: 'My work', icon: ListChecksIcon, adminOnly: false, onBar: true},
  {href: '/projects', label: 'Portfolio', icon: LayoutGridIcon, adminOnly: false, onBar: true},
  {href: '/timeline', label: 'Timeline', icon: ChartGanttIcon, adminOnly: false, onBar: true},
  {href: '/clashes', label: 'Clashes', icon: TriangleAlertIcon, adminOnly: false, onBar: false},
  {href: '/people', label: 'People', icon: UsersIcon, adminOnly: false, onBar: false},
  {href: '/settings', label: 'Settings', icon: SettingsIcon, adminOnly: true, onBar: false},
];

/** The screens this person may see, in reading order. */
export function linksFor(isAdmin: boolean): readonly NavLink[] {
  return NAV_LINKS.filter((link) => isAdmin || !link.adminOnly);
}

/** Whether `href` is the screen currently open, counting `/projects/[id]` as Portfolio. */
export function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
