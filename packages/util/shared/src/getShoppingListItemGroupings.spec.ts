import { describe, it, expect } from "vitest";
import type { ShoppingListItemSummary } from "@recipesage/prisma";
import { getShoppingListItemGroupings } from "./getShoppingListItemGroupings";
import { ShoppingListSortOptions } from "./preferences";

const user: ShoppingListItemSummary["user"] = {
  id: "00000000-0000-0000-0000-000000000000",
  name: "Test User",
  handle: null,
  enableProfile: false,
  profileImages: [],
};

let itemSeq = 0;
const makeItem = (
  title: string,
  overrides: Partial<ShoppingListItemSummary> = {},
): ShoppingListItemSummary => {
  itemSeq += 1;
  return {
    id: `00000000-0000-0000-0000-${itemSeq.toString().padStart(12, "0")}`,
    shoppingListId: "00000000-0000-0000-0000-00000000ffff",
    title,
    completed: false,
    categoryTitle: null,
    createdAt: new Date("2020-01-01T00:00:00.000Z"),
    updatedAt: new Date("2020-01-01T00:00:00.000Z"),
    user,
    recipeId: null,
    recipe: null,
    groupTitle: title,
    ...overrides,
  };
};

describe("getShoppingListItemGroupings", () => {
  describe("title sort", () => {
    it("orders by ingredient name, ignoring leading measurement and unit", () => {
      const items = [
        makeItem("3 cups flour"),
        makeItem("2 apples"),
        makeItem("1 tablespoon salt"),
        makeItem("4 eggs"),
      ];

      const { items: sorted } = getShoppingListItemGroupings(
        items,
        ShoppingListSortOptions.TitleAsc,
        "Uncategorized",
        null,
      );

      expect(sorted.map((item) => item.title)).toEqual([
        "2 apples",
        "4 eggs",
        "3 cups flour",
        "1 tablespoon salt",
      ]);
    });

    it("falls back to the raw title when nothing remains after stripping", () => {
      const items = [makeItem("zucchini"), makeItem("2 cups")];

      const { items: sorted } = getShoppingListItemGroupings(
        items,
        ShoppingListSortOptions.TitleAsc,
        "Uncategorized",
        null,
      );

      expect(sorted.map((item) => item.title)).toEqual(["2 cups", "zucchini"]);
    });
  });

  describe("group title ordering", () => {
    it("orders group headings by ingredient name, ignoring measurement", () => {
      const items = [
        makeItem("5 cups flour", { groupTitle: "5 cups flour" }),
        makeItem("2 apples", { groupTitle: "2 apples" }),
      ];

      const { groupTitles } = getShoppingListItemGroupings(
        items,
        ShoppingListSortOptions.TitleAsc,
        "Uncategorized",
        null,
      );

      expect(groupTitles).toEqual(["2 apples", "5 cups flour"]);
    });
  });
});
