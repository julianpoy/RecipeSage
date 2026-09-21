import { describe, it, expect } from "vitest";

import { getShoppingListItemGroupTitles } from "./getShoppingListItemGroupTitles";

const groupTitlesFor = (titles: string[], localeHint = "en-us"): string[] =>
  getShoppingListItemGroupTitles(
    titles.map((title) => ({ title })),
    localeHint,
  ).map((item) => item.groupTitle);

describe("getShoppingListItemGroupTitles", () => {
  it("groups an amount stated two ways with the same plain ingredient", () => {
    expect(groupTitlesFor(["1 cup or 250 ml milk", "1 cup milk"])).toEqual([
      "2 cups milk",
      "2 cups milk",
    ]);
  });

  it("counts an amount stated two ways only once", () => {
    expect(groupTitlesFor(["1 cup or 250 ml milk"])).toEqual(["1 cup milk"]);
  });

  it("counts every part that adds to the amount", () => {
    expect(
      groupTitlesFor(["1 cup + 2 tablespoons flour", "1 cup flour"]),
    ).toEqual(["2 cups, 2 tablespoons flour", "2 cups, 2 tablespoons flour"]);
  });

  it("keeps a line that names two ingredients out of the single ingredient group", () => {
    expect(
      groupTitlesFor(["500 g flour plus 1 tsp salt", "200 g flour"]),
    ).toEqual(["500 grams, 1 teaspoon flour plus salt", "200 grams flour"]);
  });

  it("reads a comma-written amount in the reader's notation", () => {
    expect(groupTitlesFor(["1,5 kg oder 1500 g Kartoffeln"], "de-de")).toEqual([
      "1.5 kilograms kartoffeln",
    ]);
  });

  it("leaves an unquantified line on its own", () => {
    expect(groupTitlesFor(["salt or pepper", "1 tsp salt"])).toEqual([
      "salt or pepper",
      "1 teaspoon salt",
    ]);
  });
});
