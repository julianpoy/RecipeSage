import { prisma } from "@recipesage/prisma";
import { recipeFactory } from "@recipesage/util/server/general";
import { test } from "../../testutils";

describe("createMessage", () => {
  describe("success", () => {
    test("creates a text message", async ({ trpc, user, user2 }) => {
      const message = await trpc.messages.createMessage({
        to: user2.id,
        body: "Hello there",
      });

      expect(message.body).toEqual("Hello there");
      expect(message.fromUserId).toEqual(user.id);
      expect(message.toUserId).toEqual(user2.id);
      expect(message.recipeId).toEqual(null);
      expect(message.originalRecipeId).toEqual(null);

      const persisted = await prisma.message.findUnique({
        where: { id: message.id },
      });
      expect(persisted?.fromUserId).toEqual(user.id);
      expect(persisted?.toUserId).toEqual(user2.id);
    });

    test("shares a recipe into the recipient's inbox", async ({
      trpc,
      user,
      user2,
    }) => {
      const recipe = await prisma.recipe.create({
        data: {
          ...recipeFactory(user.id),
          nutritionServingSize: "1 cup",
          nutritionCalories: 250,
          nutritionProtein: 12,
        },
      });

      const message = await trpc.messages.createMessage({
        to: user2.id,
        recipeId: recipe.id,
      });

      expect(message.originalRecipeId).toEqual(recipe.id);
      expect(message.recipeId).not.toEqual(null);
      expect(message.recipeId).not.toEqual(recipe.id);
      expect(message.recipe?.id).toEqual(message.recipeId);
      expect(message.originalRecipe?.id).toEqual(recipe.id);

      const sharedRecipe = await prisma.recipe.findUnique({
        where: { id: message.recipeId ?? "" },
      });
      expect(sharedRecipe?.userId).toEqual(user2.id);
      expect(sharedRecipe?.folder).toEqual("inbox");
      expect(sharedRecipe?.fromUserId).toEqual(user.id);
      expect(sharedRecipe?.title).toEqual(recipe.title);
      expect(sharedRecipe?.nutritionServingSize).toEqual("1 cup");
      expect(sharedRecipe?.nutritionCalories).toEqual(250);
      expect(sharedRecipe?.nutritionProtein).toEqual(12);
    });
  });

  describe("error", () => {
    test("throws when neither body nor recipeId is provided", async ({
      trpc,
      user2,
    }) => {
      await expect(
        trpc.messages.createMessage({
          to: user2.id,
        }),
      ).rejects.toThrow("recipeId or body is required");
    });

    test("throws when the recipient does not exist", async ({ trpc }) => {
      await expect(
        trpc.messages.createMessage({
          to: "00000000-0c70-4718-aacc-05add19096b5",
          body: "Hello",
        }),
      ).rejects.toThrow("Could not find user under that ID.");
    });
  });
});
