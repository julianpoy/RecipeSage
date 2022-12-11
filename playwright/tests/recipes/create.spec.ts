import { test, expect } from '@playwright/test';

test('homepage has Playwright in title and get started link linking to the intro page', async ({ page }) => {
  await page.goto('/list/main');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/RecipeSage - The Personal Recipe Keeper/);

  // Expects the URL to contain intro.
  await expect(page).toHaveURL(/.*intro/);
});

