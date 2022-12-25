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
    baseURL: process.env.WEBUI_URL,
    storageState: 'storageState.json',
    launchOptions: {
      slowMo: parseInt(process.env.SLOWMO || '0'),
    }
  },
};
export default config;

