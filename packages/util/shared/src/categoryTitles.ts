export const formattedCategoryTitles = {
  produce: "Produce",
  dairy: "Dairy",
  meat: "Meats",
  bakery: "Baked Goods",
  grocery: "Grocery Items",
  liquor: "Liquor",
  seafood: "Seafood",
  nonfood: "Non-Food and Household",
  deli: "Deli",
} as const;

export const allCategoryTitles: string[] = Object.values(
  formattedCategoryTitles,
);
