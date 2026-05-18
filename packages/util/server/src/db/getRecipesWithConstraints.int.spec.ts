import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Prisma, prisma, User } from "@recipesage/prisma";
import { getRecipesWithConstraints } from "./getRecipesWithConstraints";
import { userFactory, recipeFactory, labelFactory } from "../general/factories";

type CallArgs = Parameters<typeof getRecipesWithConstraints>[0];

describe("getRecipesWithConstraints (integration)", () => {
  let owner: User;
  const cleanupIds: string[] = [];

  beforeEach(async () => {
    owner = await prisma.user.create({ data: userFactory() });
    cleanupIds.push(owner.id);
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: cleanupIds } } });
    cleanupIds.length = 0;
  });

  const run = (overrides: Partial<CallArgs> = {}) =>
    getRecipesWithConstraints({
      userId: owner.id,
      userIds: [owner.id],
      folder: "main",
      orderBy: { title: "asc" },
      offset: 0,
      limit: 200,
      ...overrides,
    });

  const createRecipe = (
    title: string,
    overrides: Partial<Prisma.RecipeUncheckedCreateInput> = {},
  ) =>
    prisma.recipe.create({
      data: { ...recipeFactory(owner.id), title, ...overrides },
    });

  describe("basic listing", () => {
    it("returns the owner's recipes ordered as requested", async () => {
      await createRecipe("b");
      await createRecipe("a");
      await createRecipe("c");

      const result = await run();
      expect(result.recipes.map((r) => r.title)).toEqual(["a", "b", "c"]);
      expect(result.totalCount).toBe(3);
    });

    it("returns an empty result when the owner has no recipes", async () => {
      const result = await run();
      expect(result.recipes).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    it("returns an empty result when userIds is empty (no visibility)", async () => {
      await createRecipe("a");
      const result = await run({ userIds: [] });
      expect(result.recipes).toEqual([]);
      expect(result.totalCount).toBe(0);
    });
  });

  describe("folder filter", () => {
    it("returns main folder recipes only when folder=main", async () => {
      const main = await createRecipe("m", { folder: "main" });
      await createRecipe("i", { folder: "inbox" });

      const result = await run({ folder: "main" });
      expect(result.recipes.map((r) => r.id)).toEqual([main.id]);
    });

    it("returns inbox folder recipes only when folder=inbox", async () => {
      await createRecipe("m", { folder: "main" });
      const inbox = await createRecipe("i", { folder: "inbox" });

      const result = await run({ folder: "inbox" });
      expect(result.recipes.map((r) => r.id)).toEqual([inbox.id]);
    });
  });

  describe("pagination", () => {
    it("respects offset and limit", async () => {
      await createRecipe("a");
      await createRecipe("b");
      await createRecipe("c");
      await createRecipe("d");
      await createRecipe("e");

      const result = await run({ offset: 1, limit: 2 });
      expect(result.recipes.map((r) => r.title)).toEqual(["b", "c"]);
    });

    it("totalCount reflects the pre-pagination count", async () => {
      for (const t of ["a", "b", "c", "d", "e"]) await createRecipe(t);

      const result = await run({ offset: 2, limit: 2 });
      expect(result.recipes).toHaveLength(2);
      expect(result.totalCount).toBe(5);
    });
  });

  describe("ordering", () => {
    it("orders by title descending", async () => {
      await createRecipe("a");
      await createRecipe("b");
      await createRecipe("c");

      const result = await run({ orderBy: { title: "desc" } });
      expect(result.recipes.map((r) => r.title)).toEqual(["c", "b", "a"]);
    });

    it("orders by createdAt", async () => {
      const earlier = await createRecipe("earlier", {
        createdAt: new Date("2024-01-01T00:00:00Z"),
      });
      const later = await createRecipe("later", {
        createdAt: new Date("2024-06-01T00:00:00Z"),
      });

      const result = await run({ orderBy: { createdAt: "asc" } });
      expect(result.recipes.map((r) => r.id)).toEqual([earlier.id, later.id]);
    });
  });

  describe("recipeIds filter", () => {
    it("limits results to the specified recipeIds and preserves ordering", async () => {
      const a = await createRecipe("a");
      await createRecipe("b");
      const c = await createRecipe("c");

      const result = await run({ recipeIds: [a.id, c.id] });
      expect(result.recipes.map((r) => r.id)).toEqual([a.id, c.id]);
      expect(result.totalCount).toBe(2);
    });
  });

  describe("labels filter", () => {
    it("returns recipes matching any of the given labels (OR mode)", async () => {
      const labelX = await prisma.label.create({
        data: { ...labelFactory(owner.id), title: "x" },
      });
      const labelY = await prisma.label.create({
        data: { ...labelFactory(owner.id), title: "y" },
      });
      const labelZ = await prisma.label.create({
        data: { ...labelFactory(owner.id), title: "z" },
      });
      const rx = await createRecipe("rx", {
        recipeLabels: { create: [{ labelId: labelX.id }] },
      });
      const ry = await createRecipe("ry", {
        recipeLabels: { create: [{ labelId: labelY.id }] },
      });
      const rz = await createRecipe("rz", {
        recipeLabels: { create: [{ labelId: labelZ.id }] },
      });

      const result = await run({ labels: ["x", "y"] });
      const ids = new Set(result.recipes.map((r) => r.id));
      expect(ids).toEqual(new Set([rx.id, ry.id]));
      expect(ids.has(rz.id)).toBe(false);
    });

    it("returns only recipes carrying ALL given labels when labelIntersection is true", async () => {
      const labelX = await prisma.label.create({
        data: { ...labelFactory(owner.id), title: "x" },
      });
      const labelY = await prisma.label.create({
        data: { ...labelFactory(owner.id), title: "y" },
      });
      const both = await createRecipe("both", {
        recipeLabels: {
          create: [{ labelId: labelX.id }, { labelId: labelY.id }],
        },
      });
      const onlyX = await createRecipe("onlyx", {
        recipeLabels: { create: [{ labelId: labelX.id }] },
      });

      const result = await run({
        labels: ["x", "y"],
        labelIntersection: true,
      });
      const ids = result.recipes.map((r) => r.id);
      expect(ids).toEqual([both.id]);
      expect(ids).not.toContain(onlyX.id);
    });

    it("returns only unlabeled recipes when 'unlabeled' is the sole label", async () => {
      const label = await prisma.label.create({
        data: { ...labelFactory(owner.id), title: "x" },
      });
      const labeled = await createRecipe("labeled", {
        recipeLabels: { create: [{ labelId: label.id }] },
      });
      const unlabeled = await createRecipe("unlabeled");

      const result = await run({ labels: ["unlabeled"] });
      const ids = result.recipes.map((r) => r.id);
      expect(ids).toEqual([unlabeled.id]);
      expect(ids).not.toContain(labeled.id);
    });
  });

  describe("ratings filter", () => {
    it("returns only recipes with one of the specified ratings", async () => {
      const r3 = await createRecipe("three", { rating: 3 });
      const r5 = await createRecipe("five", { rating: 5 });
      const r1 = await createRecipe("one", { rating: 1 });

      const result = await run({ ratings: [3, 5] });
      const ids = new Set(result.recipes.map((r) => r.id));
      expect(ids).toEqual(new Set([r3.id, r5.id]));
      expect(ids.has(r1.id)).toBe(false);
    });

    it("includes unrated recipes when null is in the ratings array", async () => {
      const rated = await createRecipe("rated", { rating: 4 });
      const unrated = await createRecipe("unrated", { rating: null });

      const result = await run({ ratings: [null] });
      const ids = result.recipes.map((r) => r.id);
      expect(ids).toEqual([unrated.id]);
      expect(ids).not.toContain(rated.id);
    });
  });

  describe("nutritionFilter", () => {
    it("filters by min and max, excluding nulls", async () => {
      const low = await createRecipe("low", { nutritionCalories: 100 });
      const mid = await createRecipe("mid", { nutritionCalories: 400 });
      const high = await createRecipe("high", { nutritionCalories: 800 });
      const missing = await createRecipe("missing", {
        nutritionCalories: null,
      });

      const result = await run({
        nutritionFilter: { calories: { min: 200, max: 500 } },
      });
      const ids = result.recipes.map((r) => r.id);
      expect(ids).toEqual([mid.id]);
      expect(ids).not.toContain(low.id);
      expect(ids).not.toContain(high.id);
      expect(ids).not.toContain(missing.id);
    });

    it("supports min-only and max-only", async () => {
      const a = await createRecipe("a", { nutritionCalories: 100 });
      const b = await createRecipe("b", { nutritionCalories: 400 });
      const c = await createRecipe("c", { nutritionCalories: 800 });

      const minOnly = await run({
        nutritionFilter: { calories: { min: 300 } },
      });
      expect(new Set(minOnly.recipes.map((r) => r.id))).toEqual(
        new Set([b.id, c.id]),
      );

      const maxOnly = await run({
        nutritionFilter: { calories: { max: 500 } },
      });
      expect(new Set(maxOnly.recipes.map((r) => r.id))).toEqual(
        new Set([a.id, b.id]),
      );
    });

    it("returns only recipes with no value when matchMissing is set alone", async () => {
      const withValue = await createRecipe("withval", {
        nutritionCalories: 200,
      });
      const missing = await createRecipe("missing", {
        nutritionCalories: null,
      });

      const result = await run({
        nutritionFilter: { calories: { matchMissing: true } },
      });
      const ids = result.recipes.map((r) => r.id);
      expect(ids).toEqual([missing.id]);
      expect(ids).not.toContain(withValue.id);
    });

    it("unions range matches with no-value matches when both are set", async () => {
      const inRange = await createRecipe("inrange", { nutritionCalories: 250 });
      const outOfRange = await createRecipe("outofrange", {
        nutritionCalories: 900,
      });
      const missing = await createRecipe("missing", {
        nutritionCalories: null,
      });

      const result = await run({
        nutritionFilter: {
          calories: { min: 100, max: 500, matchMissing: true },
        },
      });
      const ids = new Set(result.recipes.map((r) => r.id));
      expect(ids).toEqual(new Set([inRange.id, missing.id]));
      expect(ids.has(outOfRange.id)).toBe(false);
    });

    it("combines macros with AND across fields", async () => {
      const both = await createRecipe("both", {
        nutritionCalories: 300,
        nutritionProtein: 40,
      });
      const onlyCalories = await createRecipe("cal", {
        nutritionCalories: 300,
        nutritionProtein: 5,
      });
      const onlyProtein = await createRecipe("pro", {
        nutritionCalories: 900,
        nutritionProtein: 40,
      });

      const result = await run({
        nutritionFilter: {
          calories: { max: 500 },
          protein: { min: 20 },
        },
      });
      const ids = result.recipes.map((r) => r.id);
      expect(ids).toEqual([both.id]);
      expect(ids).not.toContain(onlyCalories.id);
      expect(ids).not.toContain(onlyProtein.id);
    });

    it("is a no-op when every range is empty", async () => {
      const a = await createRecipe("a", { nutritionCalories: 100 });
      const b = await createRecipe("b", { nutritionCalories: null });

      const result = await run({
        nutritionFilter: { calories: {}, protein: {} },
      });
      expect(new Set(result.recipes.map((r) => r.id))).toEqual(
        new Set([a.id, b.id]),
      );
    });
  });

  describe("combined filters", () => {
    it("ANDs labels, ratings, and nutritionFilter together", async () => {
      const label = await prisma.label.create({
        data: { ...labelFactory(owner.id), title: "vegetarian" },
      });

      const match = await createRecipe("match", {
        rating: 5,
        nutritionCalories: 400,
        recipeLabels: { create: [{ labelId: label.id }] },
      });
      const wrongRating = await createRecipe("wrong-rating", {
        rating: 1,
        nutritionCalories: 400,
        recipeLabels: { create: [{ labelId: label.id }] },
      });
      const wrongCalories = await createRecipe("wrong-cal", {
        rating: 5,
        nutritionCalories: 900,
        recipeLabels: { create: [{ labelId: label.id }] },
      });
      const wrongLabel = await createRecipe("wrong-label", {
        rating: 5,
        nutritionCalories: 400,
      });

      const result = await run({
        labels: ["vegetarian"],
        ratings: [4, 5],
        nutritionFilter: { calories: { max: 500 } },
      });
      const ids = result.recipes.map((r) => r.id);
      expect(ids).toEqual([match.id]);
      expect(ids).not.toContain(wrongRating.id);
      expect(ids).not.toContain(wrongCalories.id);
      expect(ids).not.toContain(wrongLabel.id);
    });
  });
});
