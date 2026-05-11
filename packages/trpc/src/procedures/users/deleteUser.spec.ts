import { prisma } from "@recipesage/prisma";
import { recipeFactory } from "@recipesage/util/server/general";
import { test, anonymousTrpc } from "../../testutils";

describe("deleteUser", () => {
  describe("success", () => {
    test("deletes the caller's account", async ({ trpc, user }) => {
      const response = await trpc.users.deleteUser();
      expect(response).toEqual("Deleted");

      const deleted = await prisma.user.findUnique({
        where: { id: user.id },
      });
      expect(deleted).toBeNull();
    });

    test("deletes the caller's recipes", async ({ trpc, user }) => {
      const recipe = await prisma.recipe.create({
        data: recipeFactory(user.id),
      });

      await trpc.users.deleteUser();

      const deletedRecipe = await prisma.recipe.findUnique({
        where: { id: recipe.id },
      });
      expect(deletedRecipe).toBeNull();
    });

    test("does not delete another user's recipes", async ({ trpc, user2 }) => {
      const recipe = await prisma.recipe.create({
        data: recipeFactory(user2.id),
      });

      await trpc.users.deleteUser();

      const otherRecipe = await prisma.recipe.findUnique({
        where: { id: recipe.id },
      });
      expect(otherRecipe?.id).toEqual(recipe.id);
    });
  });

  describe("error", () => {
    test("throws when the caller is not logged in", async () => {
      await expect(anonymousTrpc.users.deleteUser()).rejects.toThrow(
        "Must be logged in",
      );
    });
  });
});
