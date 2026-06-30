export const DISCOVER_CATEGORY_GROUPS = [
  "course",
  "cuisine",
  "dietary",
  "mainIngredient",
  "method",
] as const;

export type DiscoverCategoryGroup = (typeof DISCOVER_CATEGORY_GROUPS)[number];

export const DISCOVER_CATEGORY_GROUP_LABEL_KEYS: Record<
  DiscoverCategoryGroup,
  string
> = {
  course: "pages.discover.categoryGroups.course",
  cuisine: "pages.discover.categoryGroups.cuisine",
  dietary: "pages.discover.categoryGroups.dietary",
  mainIngredient: "pages.discover.categoryGroups.mainIngredient",
  method: "pages.discover.categoryGroups.method",
};

export interface DiscoverCategory {
  key: string;
  group: DiscoverCategoryGroup;
  labelKey: string;
}

export const DISCOVER_CATEGORIES: DiscoverCategory[] = [
  {
    key: "breakfast",
    group: "course",
    labelKey: "pages.discover.categories.breakfast",
  },
  {
    key: "lunch",
    group: "course",
    labelKey: "pages.discover.categories.lunch",
  },
  {
    key: "dinner",
    group: "course",
    labelKey: "pages.discover.categories.dinner",
  },
  {
    key: "appetizer",
    group: "course",
    labelKey: "pages.discover.categories.appetizer",
  },
  {
    key: "sideDish",
    group: "course",
    labelKey: "pages.discover.categories.sideDish",
  },
  {
    key: "salad",
    group: "course",
    labelKey: "pages.discover.categories.salad",
  },
  { key: "soup", group: "course", labelKey: "pages.discover.categories.soup" },
  {
    key: "dessert",
    group: "course",
    labelKey: "pages.discover.categories.dessert",
  },
  {
    key: "snack",
    group: "course",
    labelKey: "pages.discover.categories.snack",
  },
  {
    key: "beverage",
    group: "course",
    labelKey: "pages.discover.categories.beverage",
  },
  {
    key: "bread",
    group: "course",
    labelKey: "pages.discover.categories.bread",
  },
  {
    key: "sauce",
    group: "course",
    labelKey: "pages.discover.categories.sauce",
  },
  {
    key: "northAmerican",
    group: "cuisine",
    labelKey: "pages.discover.categories.northAmerican",
  },
  {
    key: "latinAmerican",
    group: "cuisine",
    labelKey: "pages.discover.categories.latinAmerican",
  },
  {
    key: "mediterranean",
    group: "cuisine",
    labelKey: "pages.discover.categories.mediterranean",
  },
  {
    key: "westernEuropean",
    group: "cuisine",
    labelKey: "pages.discover.categories.westernEuropean",
  },
  {
    key: "easternEuropean",
    group: "cuisine",
    labelKey: "pages.discover.categories.easternEuropean",
  },
  {
    key: "middleEastern",
    group: "cuisine",
    labelKey: "pages.discover.categories.middleEastern",
  },
  {
    key: "african",
    group: "cuisine",
    labelKey: "pages.discover.categories.african",
  },
  {
    key: "southAsian",
    group: "cuisine",
    labelKey: "pages.discover.categories.southAsian",
  },
  {
    key: "eastAsian",
    group: "cuisine",
    labelKey: "pages.discover.categories.eastAsian",
  },
  {
    key: "southeastAsian",
    group: "cuisine",
    labelKey: "pages.discover.categories.southeastAsian",
  },
  {
    key: "vegetarian",
    group: "dietary",
    labelKey: "pages.discover.categories.vegetarian",
  },
  {
    key: "vegan",
    group: "dietary",
    labelKey: "pages.discover.categories.vegan",
  },
  {
    key: "pescatarian",
    group: "dietary",
    labelKey: "pages.discover.categories.pescatarian",
  },
  {
    key: "glutenFree",
    group: "dietary",
    labelKey: "pages.discover.categories.glutenFree",
  },
  {
    key: "dairyFree",
    group: "dietary",
    labelKey: "pages.discover.categories.dairyFree",
  },
  {
    key: "nutFree",
    group: "dietary",
    labelKey: "pages.discover.categories.nutFree",
  },
  { key: "keto", group: "dietary", labelKey: "pages.discover.categories.keto" },
  {
    key: "lowCarb",
    group: "dietary",
    labelKey: "pages.discover.categories.lowCarb",
  },
  {
    key: "highProtein",
    group: "dietary",
    labelKey: "pages.discover.categories.highProtein",
  },
  {
    key: "sugarFree",
    group: "dietary",
    labelKey: "pages.discover.categories.sugarFree",
  },
  {
    key: "halal",
    group: "dietary",
    labelKey: "pages.discover.categories.halal",
  },
  {
    key: "kosher",
    group: "dietary",
    labelKey: "pages.discover.categories.kosher",
  },
  {
    key: "chicken",
    group: "mainIngredient",
    labelKey: "pages.discover.categories.chicken",
  },
  {
    key: "beef",
    group: "mainIngredient",
    labelKey: "pages.discover.categories.beef",
  },
  {
    key: "pork",
    group: "mainIngredient",
    labelKey: "pages.discover.categories.pork",
  },
  {
    key: "lamb",
    group: "mainIngredient",
    labelKey: "pages.discover.categories.lamb",
  },
  {
    key: "seafood",
    group: "mainIngredient",
    labelKey: "pages.discover.categories.seafood",
  },
  {
    key: "tofu",
    group: "mainIngredient",
    labelKey: "pages.discover.categories.tofu",
  },
  {
    key: "beansLegumes",
    group: "mainIngredient",
    labelKey: "pages.discover.categories.beansLegumes",
  },
  {
    key: "pasta",
    group: "mainIngredient",
    labelKey: "pages.discover.categories.pasta",
  },
  {
    key: "rice",
    group: "mainIngredient",
    labelKey: "pages.discover.categories.rice",
  },
  {
    key: "vegetables",
    group: "mainIngredient",
    labelKey: "pages.discover.categories.vegetables",
  },
  {
    key: "baking",
    group: "method",
    labelKey: "pages.discover.categories.baking",
  },
  {
    key: "grilling",
    group: "method",
    labelKey: "pages.discover.categories.grilling",
  },
  {
    key: "frying",
    group: "method",
    labelKey: "pages.discover.categories.frying",
  },
  {
    key: "airFryer",
    group: "method",
    labelKey: "pages.discover.categories.airFryer",
  },
  {
    key: "slowCooker",
    group: "method",
    labelKey: "pages.discover.categories.slowCooker",
  },
  {
    key: "pressureCooker",
    group: "method",
    labelKey: "pages.discover.categories.pressureCooker",
  },
  {
    key: "onePot",
    group: "method",
    labelKey: "pages.discover.categories.onePot",
  },
  {
    key: "noCook",
    group: "method",
    labelKey: "pages.discover.categories.noCook",
  },
];

export const DISCOVER_CATEGORY_KEYS: string[] = DISCOVER_CATEGORIES.map(
  (category) => category.key,
);

export const DISCOVER_CATEGORY_LABEL_KEYS: Record<string, string> =
  Object.fromEntries(
    DISCOVER_CATEGORIES.map((category) => [category.key, category.labelKey]),
  );

export const MAX_DISCOVER_CATEGORIES_PER_RECIPE = 8;

export const isDiscoverCategoryKey = (key: string): boolean =>
  DISCOVER_CATEGORY_KEYS.includes(key);

export const filterToValidDiscoverCategoryKeys = (keys: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const key of keys) {
    if (isDiscoverCategoryKey(key) && !seen.has(key)) {
      seen.add(key);
      result.push(key);
    }
  }
  return result;
};
