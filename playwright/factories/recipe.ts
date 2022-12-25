import {Page} from "@playwright/test";

export const RecipeFactory = async (page: Page): Promise<string> => {
  await page.goto('/#/edit-recipe/new');

  if (process.env.ENABLE_IMAGES) {
    await page.locator('#filePicker').setInputFiles('test.png');
  }
  await page.getByRole('textbox', { name: 'Title' }).click();
  await page.getByRole('textbox', { name: 'Title' }).fill('Test recipe');
  await page.getByRole('textbox', { name: 'Description' }).click();
  await page.getByRole('textbox', { name: 'Description' }).fill('Test description');
  await page.getByRole('textbox', { name: 'Yield' }).click();
  await page.getByRole('textbox', { name: 'Yield' }).fill('Test yield');
  await page.getByRole('textbox', { name: 'Active Time' }).click();
  await page.getByRole('textbox', { name: 'Active Time' }).fill('Test active time');
  await page.getByRole('textbox', { name: 'Total Time' }).click();
  await page.getByRole('textbox', { name: 'Total Time' }).fill('Test total time');
  await page.locator('input[name="ion-input-4"]').click();
  await page.locator('input[name="ion-input-4"]').fill('Test source');
  await page.getByRole('textbox', { name: 'Source URL' }).click();
  await page.getByRole('textbox', { name: 'Source URL' }).fill('https://example.com');
  await page.getByRole('textbox', { name: 'Ingredients' }).click();
  await page.getByRole('textbox', { name: 'Ingredients' }).fill('Test ingredient 1');
  await page.getByRole('textbox', { name: 'Ingredients' }).press('Enter');
  await page.getByRole('textbox', { name: 'Ingredients' }).fill('Test ingredient 1\nTest ingredient 2');
  await page.getByRole('textbox', { name: 'Instructions' }).click();
  await page.getByRole('textbox', { name: 'Instructions' }).fill('Test instruction 1');
  await page.getByRole('textbox', { name: 'Instructions' }).press('Enter');
  await page.getByRole('textbox', { name: 'Instructions' }).fill('Test instruction 1\nTest instruction 2');
  await page.getByRole('textbox', { name: 'Instructions' }).press('Enter');
  await page.getByRole('textbox', { name: 'Instructions' }).fill('Test instruction 1\nTest instruction 2');
  await page.getByRole('textbox', { name: 'Notes' }).click();
  await page.getByRole('textbox', { name: 'Notes' }).fill('Test notes');

  await Promise.all([
    page.waitForNavigation(),
    page.locator('ion-button').filter({ hasText: 'Create' }).getByRole('button').click()
  ]);

  const recipeId = page.url().split('/').at(-1);

  return recipeId;
};
