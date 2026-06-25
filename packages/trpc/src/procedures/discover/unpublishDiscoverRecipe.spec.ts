import { prisma } from "@recipesage/prisma";
import { discoverRecipeFactory } from "@recipesage/util/server/general";
import { test, anonymousTrpc } from "../../testutils";

describe("unpublishDiscoverRecipe", () => {
  describe("success", () => {
    test("deletes the author's own discover recipe", async ({ trpc, user }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });

      await trpc.discover.unpublishDiscoverRecipe({ id: recipe.id });

      const found = await prisma.discoverRecipe.findUnique({
        where: { id: recipe.id },
      });
      expect(found).toBeNull();
    });
  });

  describe("error", () => {
    test("rejects a recipe the caller does not own", async ({
      trpc,
      user2,
    }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user2.id),
      });

      await expect(
        trpc.discover.unpublishDiscoverRecipe({ id: recipe.id }),
      ).rejects.toThrow("Could not find that discover recipe");

      const stillThere = await prisma.discoverRecipe.findUnique({
        where: { id: recipe.id },
      });
      expect(stillThere).not.toBeNull();
    });

    test("requires authentication", async ({ user }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });

      await expect(
        anonymousTrpc.discover.unpublishDiscoverRecipe({ id: recipe.id }),
      ).rejects.toThrow("Must be logged in");
    });
  });
});
