import * as Sentry from "@sentry/node";

/**
 * This is largly important since the classifier has an inbuilt limit to conserve RAM.
 */
const MAX_BATCH_SIZE = 49;

export const getShoppingListItemCategories = async (
  items: string[],
): Promise<string[]> => {
  try {
    if (!process.env.GROCERY_CATEGORIZER_URL) {
      throw new Error(
        "GROCERY_CATEGORIZER_URL must be set to get shopping list categories",
      );
    }
    const url = process.env.GROCERY_CATEGORIZER_URL + "categorize";

    const batches = [];
    for (let i = 0; i < items.length; i += MAX_BATCH_SIZE) {
      batches.push(items.slice(i, i + MAX_BATCH_SIZE));
    }

    const results: string[] = [];
    for (const batch of batches) {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          items: batch,
        }),
      });

      const json = await response.json();

      const batchResult = json.results.map(
        (el: { category: string }) => el.category,
      );
      results.push(...batchResult);
    }

    return results;
  } catch (e) {
    console.error(e);
    Sentry.captureException(e);

    return items.map(() => "uncategorized");
  }
};
