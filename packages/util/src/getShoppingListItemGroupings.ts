import { ShoppingListItem } from "@prisma/client";
import { ShoppingListSortOptions } from "./preferences";

interface SortableItem {
  title: string;
  createdAt: string | Date;
}

const itemSort = (
  a: SortableItem,
  b: SortableItem,
  sortBy: ShoppingListSortOptions,
): number => {
  switch (sortBy) {
    case "createdAt": {
      const dateComp =
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (dateComp === 0) {
        return a.title.localeCompare(b.title);
      }
      return dateComp;
    }
    case "-createdAt": {
      const reverseDateComp =
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (reverseDateComp === 0) {
        return a.title.localeCompare(b.title);
      }
      return reverseDateComp;
    }
    case "-title":
    default: {
      const localeComp = a.title.localeCompare(b.title);
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
        return itemSort(a, b, sortBy);
      });
      return acc;
    },
    {} as { [key: string]: T[] },
  );

  return groupedAndSorted;
};

type GroupableShoppingListItem = ShoppingListItem & {
  categoryTitle: string;
  groupTitle: string;
};

// This whole thing needs to be redone
interface GroupableShoppingListItemsByGroupAndCategory {
  [key: string]: {
    title: string;
    items: ShoppingListItem[];
  }[];
}

// items must be an array of objects with the properties groupTitle, categoryTitle, createdAt, and title
// sortBy must be one of 'createdAt', '-createdAt', '-title'
// Result will be items grouped by group/category/groupcategory
export const getShoppingListItemGroupings = (
  items: GroupableShoppingListItem[],
  sortBy: ShoppingListSortOptions,
): {
  items: GroupableShoppingListItem[];
  groupTitles: string[];
  categoryTitles: string[];
  itemsByGroupTitle: { [key: string]: GroupableShoppingListItem[] };
  itemsByCategoryTitle: { [key: string]: GroupableShoppingListItem[] };
  groupsByCategoryTitle: GroupableShoppingListItemsByGroupAndCategory;
} => {
  const sortedItems = items.sort((a, b) => {
    return itemSort(a, b, sortBy);
  });

  const groupTitles = Array.from(
    new Set<string>(items.map((item) => item.groupTitle)),
  ).sort((a, b) => {
    // Sort groups by title (always)
    return a.localeCompare(b);
  });

  const categoryTitles = Array.from(
    new Set<string>(items.map((item) => item.categoryTitle)),
  ).sort((a, b) => {
    // Sort categories by title (always)
    return a.localeCompare(b);
  });

  const itemsByGroupTitle = groupAndSort(items, "groupTitle", sortBy);
  const itemsByCategoryTitle = groupAndSort(items, "categoryTitle", sortBy);

  const groupsByCategoryTitle = items.reduce((acc, item) => {
    acc[item.categoryTitle] = acc[item.categoryTitle] || [];
    const arr = acc[item.categoryTitle];
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
  }, {} as GroupableShoppingListItemsByGroupAndCategory);

  return {
    items: sortedItems,
    groupTitles,
    categoryTitles,
    itemsByGroupTitle,
    itemsByCategoryTitle,
    groupsByCategoryTitle,
  };
};
