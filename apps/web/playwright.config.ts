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
  // Mobile-first: Athiq and Asif run the studio from their phones.
  projects: [{name: 'phone', use: {...devices['Pixel 7']}}],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/login',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
