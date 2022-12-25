import { test as baseTest } from '@playwright/test';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

import playwrightConfig from '../playwright.config';

export const test = baseTest.extend({
  storageState: async ({ browser }, use, testInfo) => {
    const random = crypto.randomBytes(32).toString('hex');

    const fileName = path.join(testInfo.project.outputDir, 'storage-' + random);
    if (!fs.existsSync(fileName)) {
      // Make sure we are not using any other storage state.
      const page = await browser.newPage({ storageState: undefined });

      await page.goto(`${playwrightConfig.use?.baseURL}auth/register`);
      await page.getByLabel('Full Name or Nickname').fill('Test User');
      await page.getByLabel('Email').fill(`julian+pw-${random}@recipesage.com`);
      await page.getByLabel('Password').first().fill('testing');
      await page.getByLabel('Confirm Password').fill('testing');

      await Promise.all([
        page.waitForNavigation(),
        page.getByText('CREATE ACCOUNT').click()
      ]);

      await page.context().storageState({ path: fileName });
      await page.close();
    }
    await use(fileName);
  },
});
