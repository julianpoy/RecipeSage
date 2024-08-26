import dedent from "ts-dedent";
import { OpenAIHelper, SupportedGPTModel } from "./openai";

const openAiHelper = new OpenAIHelper();

export enum ShoppingListCategory {
  Grocery = "grocery",
  Produce = "produce",
  Dairy = "dairy",
  Meat = "meat",
  Seafood = "seafood",
  Deli = "deli",
  Bakery = "bakery",
  Liquor = "liquor",
  Frozen = "frozen",
  Canned = "canned",
  Home = "home",
  Uncategorized = "uncategorized",
  Failed = "failed",
}

const gptCategories = [
  ShoppingListCategory.Grocery,
  ShoppingListCategory.Produce,
  ShoppingListCategory.Dairy,
  ShoppingListCategory.Meat,
  ShoppingListCategory.Seafood,
  ShoppingListCategory.Deli,
  ShoppingListCategory.Bakery,
  ShoppingListCategory.Liquor,
  ShoppingListCategory.Frozen,
  ShoppingListCategory.Canned,
  ShoppingListCategory.Home,
];

export const categorizeShoppingListItem = async (
  shoppingListItem: string,
): Promise<ShoppingListCategory> => {
  if (shoppingListItem.includes("frozen")) {
    return ShoppingListCategory.Frozen;
  }
  if (
    shoppingListItem.includes("canned") ||
    shoppingListItem.includes(" can ")
  ) {
    return ShoppingListCategory.Canned;
  }

  const response = await openAiHelper.getJsonResponse(
    SupportedGPTModel.GPT4OMini,
    [
      {
        role: "system",
        content: dedent`
          Classify this text: ${shoppingListItem} into one of the following categories:

          ${gptCategories.join("\n")}

          Return your response in JSON format, with the key "category" as one of the categories above.
        `,
      },
    ],
  );

  try {
    const results = JSON.parse((response.at(0)?.content as string) || "null");
    const category = gptCategories.includes(results.category)
      ? results.category
      : ShoppingListCategory.Failed;

    return category;
  } catch (e) {
    console.error("GPT returned:", response.at(0)?.content, e);
    return ShoppingListCategory.Failed;
  }
};

export const categorizeShoppingListItems = async (
  shoppingListItems: string[],
): Promise<ShoppingListCategory[]> => {
  if (!shoppingListItems.length) return [];

  if (shoppingListItems.length === 1) {
    return [await categorizeShoppingListItem(shoppingListItems[0])];
  }

  const response = await openAiHelper.getJsonResponse(
    SupportedGPTModel.GPT4OMini,
    [
      {
        role: "system",
        content: dedent`
          Classify each of these items:

          ${shoppingListItems.join("\n")}

          into the following categories:

          ${gptCategories.join("\n")}

          Return your response in JSON format, with the key "categories" as an array of strings of the categories above.
        `,
      },
    ],
  );

  try {
    const results = JSON.parse((response.at(0)?.content as string) || "null");
    const categories = results.categories.map((el: string) =>
      gptCategories.includes(el as unknown as ShoppingListCategory)
        ? el
        : ShoppingListCategory.Failed,
    );
    console.error("GPT returned:", results);

    return categories;
  } catch (e) {
    console.error("GPT returned:", response.at(0)?.content, e);
    return shoppingListItems.map(() => ShoppingListCategory.Failed);
  }
};
