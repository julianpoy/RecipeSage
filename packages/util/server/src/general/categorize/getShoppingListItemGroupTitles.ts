import { Base, OutputUnit } from "@recipesage/unitz-ts";
import {
  parseUnit,
  getPlainMeasurementsForLocaleIngredient,
  getMeasurementsForIngredient,
  stripIngredient,
  inferDecimalNotation,
  resolveDecimalNotation,
  type DecimalNotation,
} from "@recipesage/util/shared";

const normalizeGroupKey = (title: string): string => {
  const normalized = stripIngredient(title)
    .normalize("NFC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  return normalized.length > 3 && normalized.endsWith("s")
    ? normalized.substring(0, normalized.length - 1)
    : normalized;
};

export const getShoppingListItemGroupTitles = <
  T extends {
    title: string;
  },
>(
  items: T[],
  localeHint: string | undefined,
) => {
  const readerDecimalNotationMode = resolveDecimalNotation(localeHint);
  const decimalNotationModeForItem = (title: string): DecimalNotation =>
    inferDecimalNotation(
      getMeasurementsForIngredient(title),
      readerDecimalNotationMode,
    );
  // Ingredient grouping into map by ingredientName
  const itemGrouper: Record<string, T[]> = {};
  const ungroupedItems: T[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const groupKey = normalizeGroupKey(item.title);
    if (!groupKey) {
      ungroupedItems.push(item);
      continue;
    }
    itemGrouper[groupKey] ||= [];
    itemGrouper[groupKey].push(item);
  }

  const results: (T & {
    groupTitle: string;
  })[] = [];
  for (const [ingredientName, items] of Object.entries(itemGrouper)) {
    const measurements = items.map((item) =>
      getPlainMeasurementsForLocaleIngredient(
        item.title,
        decimalNotationModeForItem(item.title),
      ),
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

  for (const item of ungroupedItems) {
    results.push({
      ...item,
      groupTitle: item.title,
    });
  }

  return results;
};
