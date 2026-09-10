import { prisma } from "@recipesage/prisma";
import { exampleRecipeDefinitions } from "@recipesage/util/server/db";
import { createCaller, test } from "../../testutils";

const exampleImageIds = exampleRecipeDefinitions.flatMap((definition) =>
  definition.images.map((image) => image.id),
);

describe("createExampleRecipes", () => {
  describe("success", () => {
    test("creates the example recipes sharing the seeded images under one label", async ({
      session,
      user,
    }) => {
      const seededImages = await prisma.image.findMany({
        where: { id: { in: exampleImageIds } },
        select: { id: true },
      });
      if (seededImages.length !== exampleImageIds.length) {
        throw new Error(
          "Example recipe images are not seeded in the test database. Run the CLI seed command before this test.",
        );
      }

      const trpc = createCaller({ session, language: "en-us", ip: null });

      const response = await trpc.recipes.createExampleRecipes();
      expect(response.created).toEqual(exampleRecipeDefinitions.length);

      const recipes = await prisma.recipe.findMany({
        where: { userId: user.id },
        include: {
          recipeImages: true,
          recipeLabels: { include: { label: true } },
        },
      });

      expect(recipes.length).toEqual(exampleRecipeDefinitions.length);

      const labelTitles = new Set(
        recipes.flatMap((recipe) =>
          recipe.recipeLabels.map((recipeLabel) => recipeLabel.label.title),
        ),
      );
      expect(labelTitles.size).toEqual(1);

      const attachedImageIds = recipes
        .flatMap((recipe) => recipe.recipeImages.map((image) => image.imageId))
        .sort();
      expect(attachedImageIds).toEqual([...exampleImageIds].sort());

      const imageCounts = recipes
        .map((recipe) => recipe.recipeImages.length)
        .sort();
      const expectedCounts = exampleRecipeDefinitions
        .map((definition) => definition.images.length)
        .sort();
      expect(imageCounts).toEqual(expectedCounts);
    });
  });
});
