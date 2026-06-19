import type { ShoppingListItemSummary } from "@recipesage/prisma";
import { ShoppingListSortOptions } from "./preferences";
import { getTitleForIngredient } from "./parsers";

interface SortableItem {
  title: string;
  createdAt: string | Date;
}

const getSortTitle = (title: string): string => {
  const parsed = getTitleForIngredient(title).trim();
  return parsed.length > 0 ? parsed : title;
};

type SortTitleResolver = (title: string) => string;

const createSortTitleResolver = (): SortTitleResolver => {
  const cache = new Map<string, string>();
  return (title) => {
    let resolved = cache.get(title);
    if (resolved === undefined) {
      resolved = getSortTitle(title);
      cache.set(title, resolved);
    }
    return resolved;
  };
};

const itemSort = (
  a: SortableItem,
  b: SortableItem,
  sortBy: ShoppingListSortOptions,
  getSortKey: SortTitleResolver,
): number => {
  switch (sortBy) {
    case "createdAt": {
      const dateComp =
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (dateComp === 0) {
        return getSortKey(a.title).localeCompare(getSortKey(b.title));
      }
      return dateComp;
    }
    case "-createdAt": {
      const reverseDateComp =
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (reverseDateComp === 0) {
        return getSortKey(a.title).localeCompare(getSortKey(b.title));
      }
      return reverseDateComp;
    }
    case "-title":
    default: {
      const localeComp = getSortKey(a.title).localeCompare(getSortKey(b.title));
      if (localeComp === 0) {
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      }
      return localeComp;
    }
  }
};

/**
 * Will group all items by by similar keyName and sort
 */
const groupAndSort = <T extends SortableItem>(
  items: T[],
  keyName: keyof T,
  sortBy: ShoppingListSortOptions,
): { [key: string]: T[] } => {
  const getSortKey = createSortTitleResolver();

  const itemsGroupedByKey = items.reduce(
    (acc, item) => {
      const key = item[keyName] as string;
      acc[key] = acc[key] || [];
      acc[key].push(item);
      return acc;
    },
    {} as { [key: string]: T[] },
  );

  const entries = Object.entries(itemsGroupedByKey);

  const groupedAndSorted = entries.reduce(
    (acc, [key, items]) => {
      acc[key] = items.sort((a, b) => {
        return itemSort(a, b, sortBy, getSortKey);
      });
      return acc;
    },
    {} as { [key: string]: T[] },
  );

  return groupedAndSorted;
};

export interface ShoppingListItemSummariesByGroupAndCategory {
  [key: string]: {
    title: string;
    items: ShoppingListItemSummary[];
  }[];
}

// items must be an array of objects with the properties groupTitle, categoryTitle, createdAt, and title
// sortBy must be one of 'createdAt', '-createdAt', '-title'
// Result will be items grouped by group/category/groupcategory
export const getShoppingListItemGroupings = (
  items: ShoppingListItemSummary[],
  sortBy: ShoppingListSortOptions,
  uncategorizedTitle: string,
  categoryOrder: string | null,
): {
  items: ShoppingListItemSummary[];
  groupTitles: string[];
  categoryTitles: string[];
  itemsByGroupTitle: { [key: string]: ShoppingListItemSummary[] };
  itemsByCategoryTitle: { [key: string]: ShoppingListItemSummary[] };
  groupsByCategoryTitle: ShoppingListItemSummariesByGroupAndCategory;
} => {
  const getSortKey = createSortTitleResolver();

  const sortedItems = items.sort((a, b) => {
    return itemSort(a, b, sortBy, getSortKey);
  });

  const groupTitles = Array.from(
    new Set<string>(items.map((item) => item.groupTitle)),
  ).sort((a, b) => {
    // Sort groups by title (always), ignoring measurement/unit where possible
    return getSortKey(a).localeCompare(getSortKey(b));
  });

  const categoryOrderSet = new Set(categoryOrder?.toLowerCase().split("\n"));
  const categoryOrderMap = Object.fromEntries(
    Array.from(categoryOrderSet).map((el, idx) => [el, idx + 1]),
  );

  const categoryTitles = Array.from(
    new Set<string>(
      items.map((item) => item.categoryTitle || uncategorizedTitle),
    ),
  ).sort((a, b) => {
    const aOrder =
      categoryOrderMap[a.toLowerCase()] || categoryOrderSet.size + 1;
    const bOrder =
      categoryOrderMap[b.toLowerCase()] || categoryOrderSet.size + 1;

    if (aOrder === bOrder) {
      return a.localeCompare(b);
    }

    return aOrder - bOrder;
  });

  const itemsByGroupTitle = groupAndSort(items, "groupTitle", sortBy);
  const itemsByCategoryTitle = groupAndSort(items, "categoryTitle", sortBy);

  const groupsByCategoryTitle = items.reduce((acc, item) => {
    acc[item.categoryTitle || uncategorizedTitle] =
      acc[item.categoryTitle || uncategorizedTitle] || [];
    const arr = acc[item.categoryTitle || uncategorizedTitle];
    let grouping = arr.find((el) => el.title === item.groupTitle);
    if (!grouping) {
      grouping = {
        title: item.groupTitle,
        items: [],
      };
      arr.push(grouping);
    }
    grouping.items.push(item);
    return acc;
  }, {} as ShoppingListItemSummariesByGroupAndCategory);

  return {
    items: sortedItems,
    groupTitles,
    categoryTitles,
    itemsByGroupTitle,
    itemsByCategoryTitle,
    groupsByCategoryTitle,
  };
};
