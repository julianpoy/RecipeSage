import {RecipeFactory} from '@/factories/recipe';
import { expect } from '@playwright/test';
import { test } from '@/fixtures';

test('create a recipe', async ({ page }) => {
  await RecipeFactory(page);

  if (process.env.ENABLE_IMAGES) {
    await expect(page.locator('multi-image-upload img')).toBeVisible();
  }
  await expect(page.getByRole('heading').filter({ hasText: 'Test recipe' })).toBeVisible();
  await expect(page.getByRole('paragraph').filter({ hasText: 'Source: Test source' })).toBeVisible();
  await expect(page.getByRole('paragraph').filter({ hasText: 'Active Time: Test active time' }).locator('b')).toBeVisible();
  await expect(page.getByRole('paragraph').filter({ hasText: 'Total Time: Test total time' }).locator('b')).toBeVisible();
  await expect(page.getByRole('paragraph').filter({ hasText: 'Yield: Test yield' }).locator('b')).toBeVisible();
  await expect(page.getByText('Test description')).toBeVisible();
  await expect(page.getByText('Test ingredient 1')).toBeVisible();
  await expect(page.getByText('Test ingredient 2')).toBeVisible();
  await expect(page.getByText('Test instruction 1')).toBeVisible();
  await expect(page.getByText('Test instruction 2')).toBeVisible();
  await expect(page.getByText('Test notes')).toBeVisible();
});

