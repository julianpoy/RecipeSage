import { Base, OutputUnit } from "unitz-ts";
import Ahocorasick from "ahocorasick";
import ingredientNames from "./ingredients.json";
import {
  parseUnit,
  getMeasurementsForIngredient,
  stripIngredient,
} from "@recipesage/util/shared";

const ingredientNamesAhocorasic = new Ahocorasick(
  ingredientNames
    .map((el) => el.toLowerCase())
    .map((el) => (el.endsWith("s") ? el.substring(0, el.length - 1) : el)),
);

export const getShoppingListItemGroupTitles = <
  T extends {
    title: string;
  },
>(
  items: T[],
) => {
  // Ingredient grouping into map by ingredientName
  const itemGrouper: Record<string, T[]> = {};
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const strippedIngredientTitle = stripIngredient(item.title).toLowerCase();

    const ahocorasicMatches = ingredientNamesAhocorasic.search(
      strippedIngredientTitle,
    );

    let foundIngredientTitle: string | null = null;
    for (const [_, matches] of ahocorasicMatches) {
      for (const match of matches) {
        if (
          !foundIngredientTitle ||
          foundIngredientTitle.length < match.length
        ) {
          foundIngredientTitle = match;
        }
      }
    }

    if (foundIngredientTitle) {
      itemGrouper[foundIngredientTitle] ||= [];
      itemGrouper[foundIngredientTitle].push(item);
    } else {
      const groupTitle = strippedIngredientTitle.endsWith("s")
        ? strippedIngredientTitle.substring(
            0,
            strippedIngredientTitle.length - 1,
          )
        : strippedIngredientTitle;
      itemGrouper[groupTitle] = itemGrouper[groupTitle] || [];
      itemGrouper[groupTitle].push(item);
    }
  }

  const results: (T & {
    groupTitle: string;
  })[] = [];
  for (const [ingredientName, items] of Object.entries(itemGrouper)) {
    const measurements = items.map((item) =>
      getMeasurementsForIngredient(item.title),
    );
    let title = ingredientName;

    if (!measurements.find((measurementSet) => !measurementSet.length)) {
      const combinedUz = measurements
        .flat()
        .reduce<Base | null>(
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
    results.push(
      ...items.map((item) => ({
        ...item,
        groupTitle: title,
      })),
    );
  }

  return results;
};
