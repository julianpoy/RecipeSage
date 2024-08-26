import { OutputUnit } from "unitz-ts";
import { getMeasurementsForIngredient, getTitleForIngredient } from "./parsers";
import { parseUnit } from "./units";

export type ItemWithGroupTitle<T> = T & {
  groupId: string;
  groupTitle: string;
};
export type ItemGroup<T> = {
  id: string;
  title: string;
  ingredientName: string;
  combinedMeasurement: string | undefined;
  items: ItemWithGroupTitle<T>[];
};

export const groupIngredientsByTitle = <
  T extends {
    title: string;
  },
>(
  items: T[],
): {
  items: ItemWithGroupTitle<T>[];
  groups: ItemGroup<T>[];
} => {
  const itemsByIngredientName: Record<string, typeof items> = {};
  for (const item of items) {
    const ingredientName = getTitleForIngredient(item.title).toLowerCase();
    itemsByIngredientName[ingredientName] ||= [];
    itemsByIngredientName[ingredientName].push(item);
  }

  const resultItems = [];
  const resultGroups = [];
  for (const [groupId, items] of Object.entries(itemsByIngredientName)) {
    const measurements = items.map((item) =>
      getMeasurementsForIngredient(item.title),
    );
    const ingredientName = getTitleForIngredient(items[0].title);
    let groupTitle = ingredientName;
    let groupMeasurement;

    if (!measurements.find((measurementSet) => !measurementSet.length)) {
      const combinedUz = measurements
        .flat()
        .reduce<ReturnType<
          typeof parseUnit
        > | null>((acc, measurement) => (acc ? acc.add(measurement) : parseUnit(measurement)), null);
      if (combinedUz) {
        const combinedMeasurements = combinedUz.sort().output({
          unitSpacer: " ",
          unit: OutputUnit.LONG,
        });

        groupTitle = combinedMeasurements + " " + ingredientName;
        groupMeasurement = combinedMeasurements;
      }
    }

    const itemsWithGroupTitle = items.map((item) => ({
      ...item,
      groupId,
      groupTitle,
    }));
    resultGroups.push({
      id: groupId,
      title: groupTitle,
      ingredientName,
      combinedMeasurement: groupMeasurement,
      items: itemsWithGroupTitle,
    });
    resultItems.push(...itemsWithGroupTitle);
  }

  return {
    groups: resultGroups,
    items: resultItems,
  };
};
