import {describe, expect, it} from 'vitest';
import {isIosSafari, minutesBetween, offlineNotice, shouldOfferInstall} from '@/lib/pwa';

// Real strings, copied from the devices the studio actually carries.
const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) ' +
  'Version/18.1 Mobile/15E148 Safari/604.1';
const IPAD_SAFARI =
  'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) ' +
  'Version/17.5 Mobile/15E148 Safari/604.1';
// An iPad on iPadOS 13 and up says it is a Mac unless the site asks for the mobile layout.
const IPAD_AS_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) ' +
  'Version/17.5 Safari/605.1.15';
const MAC_SAFARI = IPAD_AS_MAC;
const IOS_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) ' +
  'CriOS/130.0.6723.37 Mobile/15E148 Safari/604.1';
const IOS_FIREFOX =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) ' +
  'FxiOS/132.0 Mobile/15E148 Safari/605.1.15';
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/130.0.0.0 Mobile Safari/537.36';
const DESKTOP_CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/130.0.0.0 Safari/537.36';
// Once Arcoin is on the home screen, iOS drops both Safari and Version from the string.
const INSTALLED_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';

describe('isIosSafari', () => {
  it('knows the phones the partners carry', () => {
    expect(isIosSafari(IPHONE_SAFARI)).toBe(true);
    expect(isIosSafari(IPAD_SAFARI)).toBe(true);
  });

  it('tells an iPad calling itself a Mac from a Mac, by its touch screen', () => {
    expect(isIosSafari(IPAD_AS_MAC, 5)).toBe(true);
    expect(isIosSafari(MAC_SAFARI, 0)).toBe(false);
    expect(isIosSafari(DESKTOP_CHROME, 5)).toBe(false);
  });

  it('leaves every other browser alone, because their share sheets differ', () => {
    expect(isIosSafari(IOS_CHROME)).toBe(false);
    expect(isIosSafari(IOS_FIREFOX)).toBe(false);
    expect(isIosSafari(ANDROID_CHROME)).toBe(false);
    expect(isIosSafari(DESKTOP_CHROME)).toBe(false);
    expect(isIosSafari(INSTALLED_IOS)).toBe(false);
  });
});

describe('shouldOfferInstall', () => {
  it('offers the card on an iPhone that has not installed it or said no', () => {
    expect(shouldOfferInstall({userAgent: IPHONE_SAFARI, installed: false, dismissed: false})).toBe(true);
  });

  it('never offers it twice, and never once the app is on the home screen', () => {
    expect(shouldOfferInstall({userAgent: IPHONE_SAFARI, installed: false, dismissed: true})).toBe(false);
    expect(shouldOfferInstall({userAgent: IPHONE_SAFARI, installed: true, dismissed: false})).toBe(false);
  });

  it('says nothing on Android or a laptop, where the browser offers the install itself', () => {
    expect(shouldOfferInstall({userAgent: ANDROID_CHROME, installed: false, dismissed: false})).toBe(false);
    expect(shouldOfferInstall({userAgent: DESKTOP_CHROME, installed: false, dismissed: false})).toBe(false);
  });

  it('counts an iPad as a phone for this, touch screen and all', () => {
    expect(shouldOfferInstall({userAgent: IPAD_AS_MAC, maxTouchPoints: 5, installed: false, dismissed: false})).toBe(
      true,
    );
  });
});

describe('minutesBetween', () => {
  it('counts whole minutes', () => {
    const noon = Date.parse('2026-10-21T12:00:00Z');
    expect(minutesBetween(noon, noon)).toBe(0);
    expect(minutesBetween(noon, noon + 59_000)).toBe(0);
    expect(minutesBetween(noon, noon + 60_000)).toBe(1);
    expect(minutesBetween(noon, noon + 14 * 60_000 + 30_000)).toBe(14);
  });

  it('never counts backwards when the phone corrects its clock', () => {
    const noon = Date.parse('2026-10-21T12:00:00Z');
    expect(minutesBetween(noon, noon - 5 * 60_000)).toBe(0);
    expect(minutesBetween(Number.NaN, noon)).toBe(0);
  });
});

describe('offlineNotice', () => {
  it('reads as the strip is drawn', () => {
    expect(offlineNotice(14)).toBe('Offline — showing the last update, 14 minutes ago');
  });

  it.each([
    [0, 'a moment ago'],
    [1, '1 minute ago'],
    [2, '2 minutes ago'],
    [59, '59 minutes ago'],
    [60, '1 hour ago'],
    [119, '1 hour ago'],
    [120, '2 hours ago'],
    [1439, '23 hours ago'],
    [1440, '1 day ago'],
    [2880, '2 days ago'],
  ])('says %i minutes as "%s"', (minutes, words) => {
    expect(offlineNotice(minutes)).toBe(`Offline — showing the last update, ${words}`);
  });

  it('would rather say "a moment ago" than invent an age', () => {
    expect(offlineNotice(-3)).toBe('Offline — showing the last update, a moment ago');
    expect(offlineNotice(Number.NaN)).toBe('Offline — showing the last update, a moment ago');
  });
});
