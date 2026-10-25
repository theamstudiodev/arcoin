import {removeRowsFromEarlierRuns} from './helpers/accounts';

/**
 * Runs once after the suite. Without it a finished run leaves twenty-odd `E2E …` people behind, and
 * they are not invisible: they show up on People, carry a row each on the timeline, and count
 * towards the studio's capacity. Somebody opening the app after a test run was reading a studio
 * three times the size of the real one.
 *
 * The two accounts the suite signs in as are kept — see helpers/accounts.ts.
 */
export default function globalTeardown(): void {
  removeRowsFromEarlierRuns();
}
