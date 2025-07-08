import {
  setup,
  cleanup,
  randomString,
  createUser,
  createRecipe,
} from "../testutils";

import { sequelize, Recipe } from "../models";

describe("recipe", () => {
  beforeAll(async () => {
    await setup();
  });

  afterAll(async () => {
    await cleanup();
  });

  describe("findTitle", () => {
    let findTitleSpy;

    beforeAll(() => {
      findTitleSpy = vi
        .spyOn(Recipe, "_findTitle")
        .mockResolvedValue(undefined);
    });

    afterAll(() => {
      findTitleSpy.mockRestore();
    });

    it("calls and returns result of _findTitle with proper args", async () => {
      const userId = randomString(20);
      const recipeId = randomString(20);
      const basename = randomString(20);
      const transaction = randomString(20);

      await Recipe.findTitle(userId, recipeId, basename, transaction);

      expect(findTitleSpy).toHaveBeenCalledTimes(1);
      const [argUserId, argRecipeId, argBasename, argTransaction, argIndex] =
        findTitleSpy.mock.calls[0];

      expect(argUserId).toBe(userId);
      expect(argRecipeId).toBe(recipeId);
      expect(argBasename).toBe(basename);
      expect(argTransaction).toBe(transaction);
      expect(argIndex).toBe(1);
    });
  });

  describe("_findTitle", () => {
    it("returns initial name when no conflicts arise", async () => {
      const user = await createUser();
      const recipe = await createRecipe(user.id);

      await sequelize.transaction(async (t) => {
        const adjustedTitle = await Recipe.findTitle(
          user.id,
          recipe.id,
          recipe.title,
          t,
        );
        expect(adjustedTitle).toBe(recipe.title);
      });
    });

    it("returns incremented name when conflict arises", async () => {
      const user = await createUser();
      const recipe1 = await createRecipe(user.id);
      const recipe2 = await createRecipe(user.id);

      await sequelize.transaction(async (t) => {
        const adjustedTitle = await Recipe.findTitle(
          user.id,
          recipe1.id,
          recipe2.title,
          t,
        );
        expect(adjustedTitle).toBe(recipe2.title + " (2)");
      });
    });

    it("returns initial name when no conflicts arise with no recipeId", async () => {
      const user = await createUser();
      const desiredTitle = randomString(20);

      await sequelize.transaction(async (t) => {
        const adjustedTitle = await Recipe.findTitle(
          user.id,
          null,
          desiredTitle,
          t,
        );
        expect(adjustedTitle).toBe(desiredTitle);
      });
    });

    it("returns incremented name when conflict arises with no recipeId", async () => {
      const user = await createUser();
      const recipe1 = await createRecipe(user.id);

      await sequelize.transaction(async (t) => {
        const adjustedTitle = await Recipe.findTitle(
          user.id,
          null,
          recipe1.title,
          t,
        );
        expect(adjustedTitle).toBe(recipe1.title + " (2)");
      });
    });
  });

  describe("model.share", () => {
    let shareSpy;

    beforeAll(() => {
      shareSpy = vi
        .spyOn(Recipe.prototype, "share")
        .mockResolvedValue(undefined);
    });

    afterAll(() => {
      shareSpy.mockRestore();
    });

    it("calls and returns result of share with proper args", async () => {
      const user1 = await createUser();
      const user2 = await createUser();
      const recipe = await createRecipe(user1.id);

      await sequelize.transaction(async (t) => {
        await Recipe.share(recipe.id, user2.id, t);

        expect(shareSpy).toHaveBeenCalledTimes(1);
        const [argUserId, argTransaction] = shareSpy.mock.calls[0];
        const thisContext = shareSpy.mock.instances[0];

        expect(argUserId).toBe(user2.id);
        expect(argTransaction).toBe(t);
        expect(thisContext.id).toBe(recipe.id);
      });
    });
  });

  describe("instance.share", () => {
    let findTitleSpy;

    beforeAll(() => {
      findTitleSpy = vi
        .spyOn(Recipe, "findTitle")
        .mockImplementation((_, __, title) => Promise.resolve(title));
    });

    afterAll(() => {
      findTitleSpy.mockRestore();
    });

    describe("shares recipe to recipient", () => {
      let user1, user2, recipe, sharedRecipe;

      beforeAll(async () => {
        user1 = await createUser();
        user2 = await createUser();
        recipe = await createRecipe(user1.id);

        await sequelize.transaction(async (t) => {
          sharedRecipe = await recipe.share(user2.id, t);
        });
      });

      it("creates a new recipe", async () => {
        expect(recipe.id).not.toBe(sharedRecipe.id);

        const user1Count = await Recipe.count({
          where: {
            userId: user1.id,
          },
        });
        const user2Count = await Recipe.count({
          where: {
            userId: user2.id,
          },
        });
        const original = await Recipe.findByPk(recipe.id);
        const shared = await Recipe.findByPk(sharedRecipe.id);

        expect(user1Count).toBe(1);
        expect(user2Count).toBe(1);
        expect(original).not.toBeNull();
        expect(shared).not.toBeNull();
      });

      it("creates the recipes under the proper owners", () => {
        expect(recipe.userId).toBe(user1.id);
        expect(sharedRecipe.userId).toBe(user2.id);
      });

      it("includes the same data as original recipe", () => {
        expect(sharedRecipe.title).toBe(recipe.title);
        expect(sharedRecipe.description).toBe(recipe.description);
        expect(sharedRecipe.yield).toBe(recipe.yield);
        expect(sharedRecipe.activeTime).toBe(recipe.activeTime);
        expect(sharedRecipe.totalTime).toBe(recipe.totalTime);
        expect(sharedRecipe.source).toBe(recipe.source);
        expect(sharedRecipe.url).toBe(recipe.url);
        expect(sharedRecipe.notes).toBe(recipe.notes);
        expect(sharedRecipe.ingredients).toBe(recipe.ingredients);
        expect(sharedRecipe.instructions).toBe(recipe.instructions);
        // expect(sharedRecipe.image).toBe(recipe.image);
      });

      it("sets the fromUserId to the sending user", () => {
        expect(sharedRecipe.fromUserId).toBe(user1.id);
      });

      it("sets the folder to inbox on new recipe", () => {
        expect(sharedRecipe.folder).toBe("inbox");
      });
    });
  });
});
