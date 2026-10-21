/*
 * The installed app's rules, kept pure so they can be tested without a browser.
 *
 * Two jobs: deciding whether to offer an iPhone the install card, and saying how stale the screen is while
 * the phone has no network. Everything that touches the DOM lives in the components under app/(app).
 */

/**
 * Where a dismissed install card is remembered.
 *
 * localStorage, deliberately, and the one place in the app that may use it: this is a per-device
 * convenience, not studio data. Asif dismissing the card on his iPhone says nothing about his iPad, nothing
 * that any other person or any server needs to know, and losing it costs him one tap. Anything that has to
 * survive or be shared goes in Postgres.
 */
export const INSTALL_DISMISSED_KEY = 'arcoin.install-card.dismissed';

/** Chrome, Firefox, Edge, Opera and the in-app browsers, all of them Safari's engine with a different share sheet. */
const OTHER_IOS_BROWSERS = /CriOS|FxiOS|EdgiOS|OPiOS|FBAN|FBAV|Instagram|Line\/|MicroMessenger/;

/**
 * Is this iOS Safari — the one browser that has no install prompt and needs telling?
 *
 * An iPad on iPadOS 13 and up calls itself a Macintosh, so touch points are what separates Athiq's iPad from
 * a MacBook. Every other browser on iOS runs Safari's engine but its own share sheet, where the steps on the
 * card would be wrong, so they are left alone.
 */
export function isIosSafari(userAgent: string, maxTouchPoints = 0): boolean {
  const isIos = /iPhone|iPod|iPad/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
  if (!isIos || OTHER_IOS_BROWSERS.test(userAgent)) return false;
  return /Safari\//.test(userAgent) && /Version\//.test(userAgent);
}

export type InstallContext = {
  userAgent: string;
  maxTouchPoints?: number;
  /** Already on the home screen: display-mode is standalone, or old iOS's navigator.standalone. */
  installed: boolean;
  /** This device has seen the card and said Not now. */
  dismissed: boolean;
};

/** The card is for iOS Safari, once, and never once the app is already on the home screen. */
export function shouldOfferInstall({userAgent, maxTouchPoints, installed, dismissed}: InstallContext): boolean {
  if (installed || dismissed) return false;
  return isIosSafari(userAgent, maxTouchPoints);
}

const MINUTE = 60_000;

/** Whole minutes between two clock readings, floored, and never negative if the clock steps back. */
export function minutesBetween(from: number, to: number): number {
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0;
  return Math.max(0, Math.floor((to - from) / MINUTE));
}

/**
 * The amber strip's line. The age is real — measured from the last time the screen was loaded or refreshed
 * with a connection — because "a few minutes ago" is the difference between trusting a forecast and
 * re-reading it on the laptop.
 */
export function offlineNotice(ageMinutes: number): string {
  return `Offline — showing the last update, ${elapsed(ageMinutes)}`;
}

function elapsed(ageMinutes: number): string {
  const minutes = Number.isFinite(ageMinutes) ? Math.max(0, Math.floor(ageMinutes)) : 0;
  if (minutes < 1) return 'a moment ago';
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;

  const hours = Math.floor(minutes / 60);
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;

  const days = Math.floor(hours / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}
