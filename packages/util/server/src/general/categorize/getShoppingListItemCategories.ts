import * as Sentry from '@sentry/node';

export const getShoppingListItemCategories = async (items: string[]): Promise<string[]> => {
  try {
    if (!process.env.GROCERY_CLASSIFIER_URL) {
      throw new Error("GROCERY_CLASSIFIER_URL must be set to get shopping list categories");
    }
    const url = process.env.GROCERY_CLASSIFIER_URL;

    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify({
        items,
      })
    });

    const json = await response.json();

    return json.results.map((el: any) => el.category);
  } catch(e) {
    console.error(e);
    Sentry.captureException(e);

    return items.map(() => 'uncategorized');
  }
}
