import {
  prisma,
  DiscoverApprovalState,
  UserDiscoverStanding,
} from "@recipesage/prisma";
import {
  recipeFactory,
  discoverRecipeFactory,
  discoverRecipeContentFactory,
} from "@recipesage/util/server/general";
import { test, createActiveSubscription } from "../../testutils";

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

const eligibleRecipe = (userId: string) =>
  prisma.recipe.create({
    data: {
      ...recipeFactory(userId),
      source: "",
      url: "",
    },
  });

describe("publishDiscoverRecipe", () => {
  beforeEach(() => {
    enqueueJobMock.mockClear();
  });

  describe("success", () => {
    test("creates a pending discover recipe and enqueues moderation", async ({
      trpc,
      user,
    }) => {
      await createActiveSubscription(user.id);
      const recipe = await eligibleRecipe(user.id);

      const response = await trpc.discover.publishDiscoverRecipe({
        recipeId: recipe.id,
        content: discoverRecipeContentFactory(),
        language: "en",
        imageIds: [],
        linkedDiscoverRecipeIds: [],
        agreedToTos: true,
      });

      const discoverRecipe = await prisma.discoverRecipe.findUnique({
        where: { id: response.id },
      });
      expect(discoverRecipe?.authorId).toEqual(user.id);
      expect(discoverRecipe?.sourceRecipeId).toEqual(recipe.id);
      expect(discoverRecipe?.approvalState).toEqual(
        DiscoverApprovalState.PENDING,
      );
      expect(enqueueJobMock).toHaveBeenCalledWith({
        discoverModeration: { discoverRecipeId: response.id },
      });
    });

    test("persists linked recipes", async ({ trpc, user }) => {
      await createActiveSubscription(user.id);
      const recipe = await eligibleRecipe(user.id);
      const linkTarget = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });

      const response = await trpc.discover.publishDiscoverRecipe({
        recipeId: recipe.id,
        content: discoverRecipeContentFactory(),
        language: "en",
        imageIds: [],
        linkedDiscoverRecipeIds: [linkTarget.id],
        agreedToTos: true,
      });

      const links = await prisma.discoverRecipeLink.findMany({
        where: { discoverRecipeId: response.id },
      });
      expect(links.map((link) => link.linkedDiscoverRecipeId)).toEqual([
        linkTarget.id,
      ]);
    });
  });

  describe("error", () => {
    test("rejects recipes with an external source", async ({ trpc, user }) => {
      await createActiveSubscription(user.id);
      const recipe = await prisma.recipe.create({
        data: {
          ...recipeFactory(user.id),
          source: "Some Cookbook",
          url: "",
        },
      });

      await expect(
        trpc.discover.publishDiscoverRecipe({
          recipeId: recipe.id,
          content: discoverRecipeContentFactory(),
          language: "en",
          imageIds: [],
          linkedDiscoverRecipeIds: [],
          agreedToTos: true,
        }),
      ).rejects.toThrow("external source");
    });

    test("rejects a recipe the caller does not own", async ({
      trpc,
      user,
      user2,
    }) => {
      await createActiveSubscription(user.id);
      const recipe = await eligibleRecipe(user2.id);

      await expect(
        trpc.discover.publishDiscoverRecipe({
          recipeId: recipe.id,
          content: discoverRecipeContentFactory(),
          language: "en",
          imageIds: [],
          linkedDiscoverRecipeIds: [],
          agreedToTos: true,
        }),
      ).rejects.toThrow("Could not find that recipe");
    });

    test("rejects a nonexistent linked recipe", async ({ trpc, user }) => {
      await createActiveSubscription(user.id);
      const recipe = await eligibleRecipe(user.id);

      await expect(
        trpc.discover.publishDiscoverRecipe({
          recipeId: recipe.id,
          content: discoverRecipeContentFactory(),
          language: "en",
          imageIds: [],
          linkedDiscoverRecipeIds: ["00000000-0c70-4718-aacc-05add19096b5"],
          agreedToTos: true,
        }),
      ).rejects.toThrow("linked recipes could not be found");
    });

    test("rejects publishing without the discover publish capability", async ({
      trpc,
      user,
    }) => {
      const recipe = await eligibleRecipe(user.id);

      await expect(
        trpc.discover.publishDiscoverRecipe({
          recipeId: recipe.id,
          content: discoverRecipeContentFactory(),
          language: "en",
          imageIds: [],
          linkedDiscoverRecipeIds: [],
          agreedToTos: true,
        }),
      ).rejects.toThrow("contributor subscription");
    });
  });

  describe("publish limit", () => {
    const seedPublishes = async (userId: string, count: number) => {
      for (let i = 0; i < count; i++) {
        await prisma.discoverRecipe.create({
          data: discoverRecipeFactory(userId),
        });
      }
    };

    test("rejects publishing beyond the daily limit", async ({
      trpc,
      user,
    }) => {
      await createActiveSubscription(user.id);
      await seedPublishes(user.id, 5);
      const recipe = await eligibleRecipe(user.id);

      await expect(
        trpc.discover.publishDiscoverRecipe({
          recipeId: recipe.id,
          content: discoverRecipeContentFactory(),
          language: "en",
          imageIds: [],
          linkedDiscoverRecipeIds: [],
          agreedToTos: true,
        }),
      ).rejects.toThrow("at most");
    });

    test("lets trusted users bypass the daily limit", async ({
      trpc,
      user,
    }) => {
      await createActiveSubscription(user.id);
      await prisma.user.update({
        where: { id: user.id },
        data: { discoverStanding: UserDiscoverStanding.TRUSTED },
      });
      await seedPublishes(user.id, 5);
      const recipe = await eligibleRecipe(user.id);

      const response = await trpc.discover.publishDiscoverRecipe({
        recipeId: recipe.id,
        content: discoverRecipeContentFactory(),
        language: "en",
        imageIds: [],
        linkedDiscoverRecipeIds: [],
        agreedToTos: true,
      });

      expect(response.id).toBeDefined();
    });
  });
});
