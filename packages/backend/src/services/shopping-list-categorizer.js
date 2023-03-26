const UtilService = require('./util');
const SharedUtils = require('@recipesage/util');
const Unitz = SharedUtils.unitUtils.Unitz;

const ingredientsList = require('../constants/ingredients.json');
const itemCategories = require('../constants/itemCategories.json');

const itemTitles = Object.keys(itemCategories).sort((a, b) => b.length - a.length);

const formattedCategoryTitles = {
  'produce': 'Produce',
  'dairy': 'Dairy',
  'meat': 'Meats',
  'bakery': 'Baked Goods',
  'grocery': 'Grocery Items',
  'liquor': 'Liquor',
  'seafood': 'Seafood',
  'nonfood': 'Non-Food and Household',
  'deli': 'Deli'
};

exports.getCategoryTitle = itemTitle => {
  itemTitle = itemTitle.toLowerCase();
  if (itemTitle.includes('canned') || itemTitle.includes(' can ') || itemTitle.includes(' cans ')) return 'Canned';
  if (itemTitle.includes('frozen')) return 'Frozen';

  const itemTitleMatch = itemTitles.find(potentialMatch => {
    const potentialChunks = potentialMatch.charAt(0) === '*' ? [potentialMatch.substring(1)] : potentialMatch.split(' '); // Matchers beginning with * should be matched whole
    const diffChunks = potentialChunks.filter(token => !itemTitle.includes(token)); // Filter by any chunks that _do not_ match our itemTitle

    return diffChunks.length === 0;
  });
  if (!itemTitleMatch) return 'Uncategorized';

  const category = itemCategories[itemTitleMatch];
  return formattedCategoryTitles[category] || UtilService.capitalizeEachWord(category);
};

exports.groupShoppingListItems = items => {
  // Ingredient grouping into map by ingredientName
  const itemGrouper = {};
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemTitle = item.title.toLowerCase();

    const foundIngredientGroup = ingredientsList.some(ingredient => {
      if (itemTitle.includes(ingredient.toLowerCase())) {
        itemGrouper[ingredient] = itemGrouper[ingredient] || [];
        itemGrouper[ingredient].push(item);
        return true;
      }

      return false;
    });

    if (!foundIngredientGroup) {
      const strippedIngredientTitle = SharedUtils.getTitleForIngredient(itemTitle);
      itemGrouper[strippedIngredientTitle] = itemGrouper[strippedIngredientTitle] || [];
      itemGrouper[strippedIngredientTitle].push(item);
    }
  }

  // Load map of groups by ingredientName into array of objects
  const result = [];
  for (let [ingredientName, items] of Object.entries(itemGrouper)) {
    const measurements = items.map(item => SharedUtils.getMeasurementsForIngredient(item.title));
    let title = ingredientName;

    if (!measurements.find(measurementSet => !measurementSet.length)) {
      const flatMeasurements = measurements.reduce((acc, val) => acc.concat(val), []); // Flatten (equiv to .flat)
      const combinedUz = flatMeasurements.reduce((acc, measurement) => acc ? acc.add(measurement) : Unitz.uz(measurement), null);
      if (combinedUz) {
        const combinedMeasurements = combinedUz.sort().output({
          unitSpacer: ' ',
          unit: Unitz.OutputUnit.LONG
        });

        title = combinedMeasurements + ' ' + ingredientName;
      }
    }

    items.forEach(item => item.groupTitle = title);

    result.push({
      title,
      items,
      completed: false
    });
  }

  return result;
};
