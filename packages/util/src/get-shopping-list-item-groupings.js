// Sort must be one of 'createdAt', '-createdAt', '-title'
const itemSort = (a, b, sortBy) => {
  switch (sortBy) {
    case 'createdAt':
      const dateComp = (new Date(a.createdAt)) - (new Date(b.createdAt));
      if (dateComp === 0) {
        return a.title.localeCompare(b.title);
      }
      return dateComp;
    case '-createdAt':
      const reverseDateComp = (new Date(b.createdAt)) - (new Date(a.createdAt));
      if (reverseDateComp === 0) {
        return a.title.localeCompare(b.title);
      }
      return reverseDateComp;
    case '-title':
    default:
      const localeComp = a.title.localeCompare(b.title);
      if (localeComp === 0) {
        return (new Date(a.createdAt)) - (new Date(b.createdAt));
      }
      return localeComp;
  }
};

const groupAndSort = (items, keyName, sortBy) => {
  return Object.entries(items.reduce((acc, item) => {
    const key = item[keyName];
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {})).reduce((acc, [key, items]) => {
    acc[key] = items.sort((a, b) => {
      return itemSort(a, b, sortBy);
    });
    return acc;
  }, {});
}

// items must be an array of objects with the properties groupTitle, categoryTitle, createdAt, and title
// sortBy must be one of 'createdAt', '-createdAt', '-title'
// Result will be items grouped by group/category/groupcategory
module.exports = (items, sortBy) => {
  const sortedItems = items.sort((a, b) => {
    return itemSort(a, b, sortBy);
  });

  const groupTitles = Array.from(new Set(items.map(item => item.groupTitle))).sort((a, b) => {
    // Sort groups by title (always)
    return a.localeCompare(b);
  });

  const categoryTitles = Array.from(new Set(items.map(item => item.categoryTitle))).sort((a, b) => {
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
