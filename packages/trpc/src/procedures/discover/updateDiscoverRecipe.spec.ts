import { prisma, DiscoverApprovalState } from "@recipesage/prisma";
import {
  discoverRecipeFactory,
  discoverRecipeContentFactory,
} from "@recipesage/util/server/general";
import { test } from "../../testutils";

const { enqueueJobMock } = vi.hoisted(() => ({
  enqueueJobMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@recipesage/util/server/general", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@recipesage/util/server/general")>();
  return {
    ...actual,
    enqueueJob: enqueueJobMock,
  };
});

describe("updateDiscoverRecipe", () => {
  beforeEach(() => {
    enqueueJobMock.mockClear();
  });

  describe("success", () => {
    test("updates content, resets to pending, and enqueues moderation", async ({
      trpc,
      user,
    }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });

      const content = discoverRecipeContentFactory();
      await trpc.discover.updateDiscoverRecipe({
        id: recipe.id,
        content,
        language: "fr",
        imageIds: [],
        linkedDiscoverRecipeIds: [],
      });

      const updated = await prisma.discoverRecipe.findUnique({
        where: { id: recipe.id },
      });
      expect(updated?.title).toEqual(content.title);
      expect(updated?.language).toEqual("fr");
      expect(updated?.approvalState).toEqual(DiscoverApprovalState.PENDING);
      expect(updated?.modifiedAt).not.toBeNull();
      expect(enqueueJobMock).toHaveBeenCalledWith({
        discoverModeration: { discoverRecipeId: recipe.id },
      });
    });

    test("adds and removes links across edits", async ({ trpc, user }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });
      const targetA = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });
      const targetB = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });

      await trpc.discover.updateDiscoverRecipe({
        id: recipe.id,
        content: discoverRecipeContentFactory(),
        language: "en",
        imageIds: [],
        linkedDiscoverRecipeIds: [targetA.id],
      });
      let links = await prisma.discoverRecipeLink.findMany({
        where: { discoverRecipeId: recipe.id },
      });
      expect(links.map((link) => link.linkedDiscoverRecipeId)).toEqual([
        targetA.id,
      ]);

      await trpc.discover.updateDiscoverRecipe({
        id: recipe.id,
        content: discoverRecipeContentFactory(),
        language: "en",
        imageIds: [],
        linkedDiscoverRecipeIds: [targetB.id],
      });
      links = await prisma.discoverRecipeLink.findMany({
        where: { discoverRecipeId: recipe.id },
      });
      expect(links.map((link) => link.linkedDiscoverRecipeId)).toEqual([
        targetB.id,
      ]);
    });

    test("ignores a self link", async ({ trpc, user }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });

      await trpc.discover.updateDiscoverRecipe({
        id: recipe.id,
        content: discoverRecipeContentFactory(),
        language: "en",
        imageIds: [],
        linkedDiscoverRecipeIds: [recipe.id],
      });

      const links = await prisma.discoverRecipeLink.findMany({
        where: { discoverRecipeId: recipe.id },
      });
      expect(links).toHaveLength(0);
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
        trpc.discover.updateDiscoverRecipe({
          id: recipe.id,
          content: discoverRecipeContentFactory(),
          language: "en",
          imageIds: [],
          linkedDiscoverRecipeIds: [],
        }),
      ).rejects.toThrow("Could not find that discover recipe");
    });

    test("rejects a nonexistent linked recipe", async ({ trpc, user }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });

      await expect(
        trpc.discover.updateDiscoverRecipe({
          id: recipe.id,
          content: discoverRecipeContentFactory(),
          language: "en",
          imageIds: [],
          linkedDiscoverRecipeIds: ["00000000-0c70-4718-aacc-05add19096b5"],
        }),
      ).rejects.toThrow("linked recipes could not be found");
    });
  });
});
