import type { PlaywrightTestConfig } from '@playwright/test';
const config: PlaywrightTestConfig = {
  testDir: './tests',
  globalTimeout: 60 * 60 * 1000,
  webServer: [
    {
      command: 'cd ../Backend && npm run start',
      port: 3000,
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'cd ../Frontend && npm run start -- --configuration=playwright',
      port: 8100,
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
    }
  ],
  use: {
    baseURL: 'http://localhost:8100/#/',
  },
};
export default config;

