const SharedUtils = require('../../../SharedUtils/src');
const Unitz = SharedUtils.unitUtils.Unitz;

const ingredientsList = require('../constants/ingredients.json');
const itemCategories = require('../constants/itemCategories.json');

const itemTitles = Object.keys(itemCategories).sort((a, b) => b.length - a.length);

const formattedCategoryTitles = {
  "produce": "Produce",
  "dairy": "Dairy",
  "meat": "Meats",
  "bakery": "Baked Goods",
  "grocery": "Grocery Items",
  "liquor": "Liquor"
};

const capitalizeEachWord = input => input.split(" ").map(word => word.charAt(0).toUpperCase + word.substring(1)).join(" ");

const categoryForTitle = itemTitle => {
  itemTitle = itemTitle.toLowerCase();
  const itemTitleMatch = itemTitles.find(potentialMatch => potentialMatch.split(" ").filter(token => !itemTitle.includes(token)).length === 0);
  if (!itemTitleMatch) return null;

  const category = itemCategories[itemTitleMatch];
  return formattedCategoryTitles[category] || capitalizeEachWord(category);
};

exports.getCategoryTitle = itemTitle => {
  if (itemTitle.includes("canned") || itemTitle.includes(" can ")) return "Canned";
  if (itemTitle.includes("frozen")) return "Frozen";

  const titleMatch = categoryForTitle(itemTitle);
  if (titleMatch) return titleMatch;

  return "Uncategorized";
};

exports.groupShoppingListItems = items => {
  // Ingredient grouping into map by ingredientName
  const itemGrouper = {};
  for (var i = 0; i < items.length; i++) {
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
      itemGrouper[itemTitle] = itemGrouper[itemTitle] || [];
      itemGrouper[itemTitle].push(item);
    }
  }

  // Load map of groups by ingredientName into array of objects
  const result = [];
  for (let [ingredientName, items] of Object.entries(itemGrouper)) {
    const measurements = items.map(item => SharedUtils.getMeasurementsForIngredient(item.title));
    let title = ingredientName;

    if (!measurements.find(measurementSet => !measurementSet.length)) {
      const combinedUz = measurements.reduce((acc, measurement) => acc ? acc.add(measurement) : Unitz.uz(measurement), null);
      if (combinedUz) {
        const combinedMeasurements = combinedUz.sort().output({
          unitSpacer: " ",
          unit: Unitz.OutputUnit.LONG
        });

        title = combinedMeasurements + " " + ingredientName;
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
}
