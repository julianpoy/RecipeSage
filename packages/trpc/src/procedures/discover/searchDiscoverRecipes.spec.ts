import {
  prisma,
  DiscoverApprovalState,
  UserDiscoverStanding,
  Prisma,
} from "@recipesage/prisma";
import { faker } from "@faker-js/faker";
import { discoverRecipeFactory } from "@recipesage/util/server/general";
import { test, anonymousTrpc } from "../../testutils";

const uniqueLanguage = () => faker.string.alpha(12).toLowerCase();

const createActive = (
  authorId: string,
  overrides: Partial<Prisma.DiscoverRecipeUncheckedCreateInput> & {
    language: string;
  },
) =>
  prisma.discoverRecipe.create({
    data: {
      ...discoverRecipeFactory(authorId),
      ...overrides,
    },
  });

describe("searchDiscoverRecipes", () => {
  describe("success", () => {
    test("returns only active recipes", async ({ user }) => {
      const language = uniqueLanguage();
      const active = await createActive(user.id, { language });
      await createActive(user.id, {
        language,
        approvalState: DiscoverApprovalState.PENDING,
      });
      await createActive(user.id, {
        language,
        approvalState: DiscoverApprovalState.SHADOWBANNED,
      });

      const response = await anonymousTrpc.discover.searchDiscoverRecipes({
        languages: [language],
      });
      expect(response.recipes.map((recipe) => recipe.id)).toEqual([active.id]);
    });

    test("excludes recipes from shadowbanned authors", async ({
      user,
      user2,
    }) => {
      const language = uniqueLanguage();
      const visible = await createActive(user.id, { language });
      await createActive(user2.id, { language });
      await prisma.user.update({
        where: { id: user2.id },
        data: { discoverStanding: UserDiscoverStanding.SHADOWBANNED },
      });

      const response = await anonymousTrpc.discover.searchDiscoverRecipes({
        languages: [language],
      });
      expect(response.recipes.map((recipe) => recipe.id)).toEqual([visible.id]);
    });

    test("matches on the search term", async ({ user }) => {
      const language = uniqueLanguage();
      const token = faker.string.alpha(12).toLowerCase();
      const match = await createActive(user.id, { language, title: token });
      await createActive(user.id, {
        language,
        title: faker.string.alpha(12).toLowerCase(),
      });

      const response = await anonymousTrpc.discover.searchDiscoverRecipes({
        languages: [language],
        searchTerm: token,
      });
      expect(response.recipes.map((recipe) => recipe.id)).toEqual([match.id]);
    });

    test("filters by language", async ({ user }) => {
      const language = uniqueLanguage();
      await createActive(user.id, { language });

      const response = await anonymousTrpc.discover.searchDiscoverRecipes({
        languages: [uniqueLanguage()],
      });
      expect(response.recipes).toHaveLength(0);
    });

    test("filters by minimum rating", async ({ user }) => {
      const language = uniqueLanguage();
      const highlyRated = await createActive(user.id, {
        language,
        ratingAverage: 5,
        ratingCount: 3,
      });
      await createActive(user.id, {
        language,
        ratingAverage: 2,
        ratingCount: 3,
      });

      const response = await anonymousTrpc.discover.searchDiscoverRecipes({
        languages: [language],
        minRating: 4,
      });
      expect(response.recipes.map((recipe) => recipe.id)).toEqual([
        highlyRated.id,
      ]);
    });

    test("filters by minimum rating count", async ({ user }) => {
      const language = uniqueLanguage();
      const wellReviewed = await createActive(user.id, {
        language,
        ratingCount: 10,
      });
      await createActive(user.id, { language, ratingCount: 1 });

      const response = await anonymousTrpc.discover.searchDiscoverRecipes({
        languages: [language],
        minRatingCount: 5,
      });
      expect(response.recipes.map((recipe) => recipe.id)).toEqual([
        wellReviewed.id,
      ]);
    });

    test("matches any selected category by default", async ({ user }) => {
      const language = uniqueLanguage();
      const both = await createActive(user.id, {
        language,
        categories: ["cat-a", "cat-b"],
      });
      const onlyA = await createActive(user.id, {
        language,
        categories: ["cat-a"],
      });

      const response = await anonymousTrpc.discover.searchDiscoverRecipes({
        languages: [language],
        categories: ["cat-a", "cat-b"],
      });
      expect(response.recipes.map((recipe) => recipe.id).sort()).toEqual(
        [both.id, onlyA.id].sort(),
      );
    });

    test("requires all selected categories when matchAllCategories is set", async ({
      user,
    }) => {
      const language = uniqueLanguage();
      const both = await createActive(user.id, {
        language,
        categories: ["cat-a", "cat-b"],
      });
      await createActive(user.id, { language, categories: ["cat-a"] });

      const response = await anonymousTrpc.discover.searchDiscoverRecipes({
        languages: [language],
        categories: ["cat-a", "cat-b"],
        matchAllCategories: true,
      });
      expect(response.recipes.map((recipe) => recipe.id)).toEqual([both.id]);
    });

    test("filters by photo presence", async ({ user }) => {
      const language = uniqueLanguage();
      const recipe = await createActive(user.id, { language });

      const requiresPhoto = await anonymousTrpc.discover.searchDiscoverRecipes({
        languages: [language],
        photo: "required",
      });
      expect(requiresPhoto.recipes).toHaveLength(0);

      const withoutPhoto = await anonymousTrpc.discover.searchDiscoverRecipes({
        languages: [language],
        photo: "none",
      });
      expect(withoutPhoto.recipes.map((r) => r.id)).toEqual([recipe.id]);
    });

    test("sorts by newest, top rated, and most saved", async ({ user }) => {
      const language = uniqueLanguage();
      const oldest = await createActive(user.id, {
        language,
        createdAt: new Date("2020-01-01T00:00:00Z"),
        ratingAverage: 1,
        ratingCount: 1,
        saveCount: 100,
      });
      const middle = await createActive(user.id, {
        language,
        createdAt: new Date("2021-01-01T00:00:00Z"),
        ratingAverage: 5,
        ratingCount: 1,
        saveCount: 1,
      });
      const newest = await createActive(user.id, {
        language,
        createdAt: new Date("2022-01-01T00:00:00Z"),
        ratingAverage: 3,
        ratingCount: 1,
        saveCount: 50,
      });

      const byNewest = await anonymousTrpc.discover.searchDiscoverRecipes({
        languages: [language],
        sortBy: "newest",
      });
      expect(byNewest.recipes.map((r) => r.id)).toEqual([
        newest.id,
        middle.id,
        oldest.id,
      ]);

      const byTopRated = await anonymousTrpc.discover.searchDiscoverRecipes({
        languages: [language],
        sortBy: "topRated",
      });
      expect(byTopRated.recipes.map((r) => r.id)).toEqual([
        middle.id,
        newest.id,
        oldest.id,
      ]);

      const byMostSaved = await anonymousTrpc.discover.searchDiscoverRecipes({
        languages: [language],
        sortBy: "mostSaved",
      });
      expect(byMostSaved.recipes.map((r) => r.id)).toEqual([
        oldest.id,
        newest.id,
        middle.id,
      ]);
    });
  });
});
