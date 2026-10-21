import path from 'node:path';
import {defineConfig, devices} from '@playwright/test';

// The same local Supabase keys `next dev` reads. If the file is missing, e2e/global-setup.ts says what to do.
try {
  process.loadEnvFile(path.join(__dirname, '.env.local'));
} catch {}

export default defineConfig({
  testDir: './e2e',
  // One worker: the tests share one local database and one Mailpit inbox.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // `next dev` compiles each route on its first visit, and a busy laptop can stretch one auth round trip to
  // several seconds. Generous limits keep the suite honest about behaviour, not speed.
  timeout: 60_000,
  expect: {timeout: 20_000},
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    // Mobile-first: Athiq and Asif run the studio from their phones, so every spec runs here.
    {name: 'phone', use: {...devices['Pixel 7']}},
    // The timeline and the drawing register are desktop screens — the scope calls them "unusable at
    // 390px" and does not plan a phone version. Nothing had ever tested an `md:` layout, and the
    // acceptance test runs through the timeline, so those specs run again at laptop size. Only those:
    // running all 48 twice would double the suite to prove nothing about the phone screens.
    {
      name: 'desktop',
      testMatch: ['**/timeline.spec.ts', '**/register.spec.ts', '**/acceptance.spec.ts'],
      use: {...devices['Desktop Chrome'], viewport: {width: 1440, height: 900}},
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/login',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
