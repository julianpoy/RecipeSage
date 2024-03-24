/**
 * Removes the duplicate-numbered recipe title
 * `Chicken Soup (2)` would become `Chicken Soup`
 */
export const stripNumberedRecipeTitle = (title: string) => {
  return title.replace(/\s?\(\d\)$/, "");
};
