import { prisma } from "@recipesage/prisma";
import { recipeFactory } from "@recipesage/util/server/general";
import { test } from "../../testutils";

describe("upsertLabel", () => {
  test("attaches the label to the caller's own recipes", async ({
    user,
    trpc,
  }) => {
    const recipe = await prisma.recipe.create({
      data: { ...recipeFactory(user.id), title: "Mine" },
    });

    await trpc.labels.upsertLabel({
      title: "dinner",
      labelGroupId: null,
      addToRecipeIds: [recipe.id],
    });

    const attached = await prisma.recipeLabel.findMany({
      where: { recipeId: recipe.id },
      select: { label: { select: { title: true, userId: true } } },
    });
    expect(attached).toEqual([{ label: { title: "dinner", userId: user.id } }]);
  });

  test("refuses to attach a label to another user's recipe", async ({
    user2,
    trpc,
  }) => {
    const theirs = await prisma.recipe.create({
      data: { ...recipeFactory(user2.id), title: "Theirs" },
    });

    await expect(
      trpc.labels.upsertLabel({
        title: "dinner",
        labelGroupId: null,
        addToRecipeIds: [theirs.id],
      }),
    ).rejects.toThrow();

    const attached = await prisma.recipeLabel.findMany({
      where: { recipeId: theirs.id },
    });
    expect(attached).toEqual([]);
  });

  test("attaches nothing when only some of the recipes are the caller's", async ({
    user,
    user2,
    trpc,
  }) => {
    const mine = await prisma.recipe.create({
      data: { ...recipeFactory(user.id), title: "Mine" },
    });
    const theirs = await prisma.recipe.create({
      data: { ...recipeFactory(user2.id), title: "Theirs" },
    });

    await expect(
      trpc.labels.upsertLabel({
        title: "dinner",
        labelGroupId: null,
        addToRecipeIds: [mine.id, theirs.id],
      }),
    ).rejects.toThrow();

    const attached = await prisma.recipeLabel.findMany({
      where: { recipeId: { in: [mine.id, theirs.id] } },
    });
    expect(attached).toEqual([]);
  });

  test("rejects a recipe id that is not a uuid", async ({ trpc }) => {
    await expect(
      trpc.labels.upsertLabel({
        title: "dinner",
        labelGroupId: null,
        addToRecipeIds: ["not-a-uuid"],
      }),
    ).rejects.toThrow();
  });
});
