import { expect } from '@playwright/test';
import {RecipeFactory} from '@/factories/recipe';
import { test } from '@/fixtures';

let recipeId: string;
test.beforeEach(async ({ page }) => {
  recipeId = await RecipeFactory(page);
});

test('edit a recipe', async ({ page }) => {
  await page.goto(`/#/recipe/${recipeId}`);

  await page.locator('ion-button').filter({ hasText: 'Options' }).getByRole('button').click();

  await Promise.all([
    page.waitForNavigation(),
    page.locator('page-recipe-details-popover ion-button').filter({ hasText: 'Create Edit' }).getByRole('button').click()
  ]);

  await page.getByRole('textbox', { name: 'Description' }).click();
  await page.getByRole('textbox', { name: 'Description' }).fill('Test description updated');

  await Promise.all([
    page.waitForNavigation(),
    page.locator('ion-button').filter({ hasText: 'Save' }).getByRole('button').click()
  ]);

  await expect(page.getByText('Test description updated')).toBeVisible();
});

