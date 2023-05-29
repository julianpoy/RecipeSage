import { ShoppingListItem } from "@prisma/client";

// Sort must be one of 'createdAt', '-createdAt', '-title'
const itemSort = (a, b, sortBy) => {
  switch (sortBy) {
    case 'createdAt':
      const dateComp = (new Date(a.createdAt).getTime()) - (new Date(b.createdAt).getTime());
      if (dateComp === 0) {
        return a.title.localeCompare(b.title);
      }
      return dateComp;
    case '-createdAt':
      const reverseDateComp = (new Date(b.createdAt).getTime()) - (new Date(a.createdAt).getTime());
      if (reverseDateComp === 0) {
        return a.title.localeCompare(b.title);
      }
      return reverseDateComp;
    case '-title':
    default:
      const localeComp = a.title.localeCompare(b.title);
      if (localeComp === 0) {
        return (new Date(a.createdAt).getTime()) - (new Date(b.createdAt).getTime());
      }
      return localeComp;
  }
};

// TODO: Implement item type instead of any
const groupAndSort = (items: any[], keyName: string, sortBy: string) => {
  const itemsGroupedByKey = items.reduce((acc, item) => {
    const key = item[keyName] as string;
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {} as);

  const entries = Object.entries(itemsGroupedByKey);

  const groupedAndSorted = entries.reduce((acc, [key, items]) => {
    acc[key] = items.sort((a, b) => {
      return itemSort(a, b, sortBy);
    });
    return acc;
  }, {});

  return groupedAndSorted;
}

// items must be an array of objects with the properties groupTitle, categoryTitle, createdAt, and title
// sortBy must be one of 'createdAt', '-createdAt', '-title'
// Result will be items grouped by group/category/groupcategory
// TODO: Implement item type instead of any
export const getShoppingListItemGroupings = (items: any, sortBy: string): {
  items: any[],
  groupTitles: string[],
  categoryTitles: string[],
  itemsByGroupTitle: any,
  itemsByCategoryTitle: any,
  groupsByCategoryTitle: any,
} => {
  const sortedItems = items.sort((a, b) => {
    return itemSort(a, b, sortBy);
  });

  // TODO: Implement item type instead of Set<any>
  const groupTitles = Array.from(new Set<any>(items.map(item => item.groupTitle))).sort((a, b) => {
    // Sort groups by title (always)
    return a.localeCompare(b);
  });

  // TODO: Implement item type instead of Set<any>
  const categoryTitles = Array.from(new Set<any>(items.map(item => item.categoryTitle))).sort((a, b) => {
    // Sort categories by title (always)
    return a.localeCompare(b);
  });

  const itemsByGroupTitle = groupAndSort(items, 'groupTitle', sortBy);
  const itemsByCategoryTitle = groupAndSort(items, 'categoryTitle', sortBy);

  const groupsByCategoryTitle = items.reduce((acc, item) => {
    acc[item.categoryTitle] = acc[item.categoryTitle] || [];
    const arr = acc[item.categoryTitle];
    let grouping = arr.find(el => el.title === item.groupTitle);
    if (!grouping) {
      grouping = {
        title: item.groupTitle,
        items: []
      };
      arr.push(grouping);
    }
    grouping.items.push(item);
    return acc;
  }, {});

  return {
    items: sortedItems,
    groupTitles,
    categoryTitles,
    itemsByGroupTitle,
    itemsByCategoryTitle,
    groupsByCategoryTitle,
  }
};
