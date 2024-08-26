import { ShoppingListSortOptions } from "./preferences";
import {
  groupIngredientsByTitle,
  type ItemWithGroupTitle,
} from "./groupIngredientsByTitle";

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

export type GroupableItem = {
  title: string;
  category: string;
  createdAt: string | Date;
};

export interface GroupableItemsByGroupAndCategory<T> {
  [key: string]: {
    id: string;
    title: string;
    items: T[];
  }[];
}

// items must be an array of objects with the properties groupTitle, categoryTitle, createdAt, and title
// sortBy must be one of 'createdAt', '-createdAt', '-title'
// Result will be items grouped by group/category/groupcategory
export const getShoppingListItemGroupings = <T extends GroupableItem>(
  items: T[],
  sortBy: ShoppingListSortOptions,
): {
  items: ItemWithGroupTitle<T>[];
  groupTitles: string[];
  categoryTitles: string[];
  itemsByGroupTitle: { [key: string]: ItemWithGroupTitle<T>[] };
  itemsByCategoryTitle: { [key: string]: ItemWithGroupTitle<T>[] };
  groupsByCategoryTitle: GroupableItemsByGroupAndCategory<
    ItemWithGroupTitle<T>
  >;
} => {
  const { groups, items: itemsWithGroupTitles } =
    groupIngredientsByTitle(items);

  const sortedItems = itemsWithGroupTitles.sort((a, b) => {
    return itemSort(a, b, sortBy);
  });

  const groupTitles = groups
    .map((item) => item.title)
    .sort((a, b) => {
      // Sort groups by title (always)
      return a.localeCompare(b);
    });

  const categoryTitles = Array.from(
    new Set(items.map((item) => item.category)),
  ).sort((a, b) => {
    // Sort categories by title (always)
    return a.localeCompare(b);
  });

  const itemsByGroupTitle = groupAndSort(
    itemsWithGroupTitles,
    "groupTitle",
    sortBy,
  );
  const itemsByCategoryTitle = groupAndSort(
    itemsWithGroupTitles,
    "category",
    sortBy,
  );

  const groupsByCategoryTitle = itemsWithGroupTitles.reduce(
    (acc, item) => {
      acc[item.category] = acc[item.category] || [];
      const arr = acc[item.category];
      let grouping = arr.find((el) => el.id === item.groupId);
      if (!grouping) {
        grouping = {
          id: item.groupId,
          title: item.groupTitle,
          items: [],
        };
        arr.push(grouping);
      }
      grouping.items.push(item);
      return acc;
    },
    {} as GroupableItemsByGroupAndCategory<ItemWithGroupTitle<T>>,
  );

  return {
    items: sortedItems,
    groupTitles,
    categoryTitles,
    itemsByGroupTitle,
    itemsByCategoryTitle,
    groupsByCategoryTitle,
  };
};
