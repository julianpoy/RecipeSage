import { Base, OutputUnit } from "unitz-ts";
import Ahocorasick from 'ahocorasick';
import ingredientNames from './ingredients.json';
import {
  parseUnit,
  getTitleForIngredient,
  getMeasurementsForIngredient,
} from "@recipesage/util/shared";

const ingredientNamesAhocorasic = new Ahocorasick(ingredientNames.map((el) => el.toLowerCase()));

export const getShoppingListItemGroupTitles = <T extends {
  title: string;
}>(items: T[]) => {
  // Ingredient grouping into map by ingredientName
  const itemGrouper: Record<string, T[]> = {};
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemTitle = item.title.toLowerCase();

    const ahocorasicMatches = ingredientNamesAhocorasic.search(itemTitle);

    let foundIngredientTitle: string | null = null;
    for (const [_, matches] of ahocorasicMatches) {
      for (const match of matches) {
        if (!foundIngredientTitle || foundIngredientTitle.length < match.length) {
          foundIngredientTitle = match;
        }
      }
    }

    if (foundIngredientTitle) {
      itemGrouper[foundIngredientTitle] ||= [];
      itemGrouper[foundIngredientTitle].push(item);
    } else {
      const strippedIngredientTitle = getTitleForIngredient(itemTitle);
      itemGrouper[strippedIngredientTitle] =
        itemGrouper[strippedIngredientTitle] || [];
      itemGrouper[strippedIngredientTitle].push(item);
    }
  }

  const results: (T & {
    groupTitle: string,
  })[] = [];
  for (const [ingredientName, items] of Object.entries(itemGrouper)) {
    const measurements = items.map((item) =>
      getMeasurementsForIngredient(item.title),
    );
    let title = ingredientName;

    if (!measurements.find((measurementSet) => !measurementSet.length)) {
      const combinedUz = measurements.flat().reduce<Base | null>(
        (acc, measurement) =>
          acc ? acc.add(measurement) : parseUnit(measurement),
        null,
      );
      if (combinedUz) {
        const combinedMeasurements = combinedUz.sort().output({
          unitSpacer: " ",
          unit: OutputUnit.LONG,
        });

        title = combinedMeasurements + " " + ingredientName;
      }
    }
    results.push(...items.map((item) => ({
      ...item,
      groupTitle: title,
    })));
  }

  return results;
};
