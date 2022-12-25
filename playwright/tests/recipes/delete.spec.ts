import { expect } from '@playwright/test';
import {RecipeFactory} from '@/factories/recipe';
import { test } from '@/fixtures';

let recipeId: string;
test.beforeEach(async ({ page }) => {
  recipeId = await RecipeFactory(page);
});

test('delete a recipe', async ({ page }) => {
  await page.goto(`/#/recipe/${recipeId}`);

  await page.locator('ion-button').filter({ hasText: 'Options' }).getByRole('button').click();
  await page.locator('ion-button').filter({ hasText: 'Trash Delete Recipe' }).getByRole('button').click();

  await Promise.all([
    page.waitForNavigation(),
    page.getByRole('button', { name: 'Delete' }).click()
  ]);

  await page.goto('/#/list/main');

  await expect(page.locator('.recipe-card')).not.toBeVisible();
});

