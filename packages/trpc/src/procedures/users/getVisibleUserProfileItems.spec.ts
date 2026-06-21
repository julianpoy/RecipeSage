import { prisma } from "@recipesage/prisma";
import {
  profileItemFactory,
  recipeFactory,
} from "@recipesage/util/server/general";
import { test, anonymousTrpc } from "../../testutils";

describe("getVisibleUserProfileItems", () => {
  describe("success", () => {
    test("returns only public items to an anonymous caller", async ({
      user,
    }) => {
      await prisma.user.update({
        where: { id: user.id },
        data: { enableProfile: true },
      });
      await prisma.profileItem.createMany({
        data: [
          profileItemFactory({
            userId: user.id,
            type: "all-recipes",
            visibility: "public",
          }),
          profileItemFactory({
            userId: user.id,
            type: "all-recipes",
            visibility: "friends-only",
          }),
        ],
      });

      const items = await anonymousTrpc.users.getVisibleUserProfileItems({
        userId: user.id,
      });

      expect(items).toHaveLength(1);
      expect(items[0].visibility).toEqual("public");
    });

    test("hides friends-only items from a logged-in non-friend", async ({
      trpc,
      user2,
    }) => {
      await prisma.user.update({
        where: { id: user2.id },
        data: { enableProfile: true },
      });
      await prisma.profileItem.createMany({
        data: [
          profileItemFactory({
            userId: user2.id,
            type: "all-recipes",
            visibility: "public",
          }),
          profileItemFactory({
            userId: user2.id,
            type: "all-recipes",
            visibility: "friends-only",
          }),
        ],
      });

      const items = await trpc.users.getVisibleUserProfileItems({
        userId: user2.id,
      });

      expect(items).toHaveLength(1);
      expect(items[0].visibility).toEqual("public");
    });

    test("returns friends-only items when the owner has friended the caller", async ({
      trpc,
      user,
      user2,
    }) => {
      await prisma.user.update({
        where: { id: user2.id },
        data: { enableProfile: true },
      });
      await prisma.friendship.create({
        data: { userId: user2.id, friendId: user.id },
      });
      await prisma.profileItem.createMany({
        data: [
          profileItemFactory({
            userId: user2.id,
            type: "all-recipes",
            visibility: "public",
          }),
          profileItemFactory({
            userId: user2.id,
            type: "all-recipes",
            visibility: "friends-only",
          }),
        ],
      });

      const items = await trpc.users.getVisibleUserProfileItems({
        userId: user2.id,
      });

      expect(items).toHaveLength(2);
    });

    test("returns all of the caller's own items", async ({ trpc, user }) => {
      await prisma.profileItem.createMany({
        data: [
          profileItemFactory({
            userId: user.id,
            type: "all-recipes",
            visibility: "public",
          }),
          profileItemFactory({
            userId: user.id,
            type: "all-recipes",
            visibility: "friends-only",
          }),
        ],
      });

      const items = await trpc.users.getVisibleUserProfileItems({
        userId: user.id,
      });

      expect(items).toHaveLength(2);
    });

    test("orders items by their order field", async ({ trpc, user }) => {
      await prisma.profileItem.createMany({
        data: [
          {
            ...profileItemFactory({
              userId: user.id,
              type: "all-recipes",
              visibility: "public",
            }),
            title: "second",
            order: 1,
          },
          {
            ...profileItemFactory({
              userId: user.id,
              type: "all-recipes",
              visibility: "public",
            }),
            title: "first",
            order: 0,
          },
        ],
      });

      const items = await trpc.users.getVisibleUserProfileItems({
        userId: user.id,
      });

      expect(items.map((item) => item.title)).toEqual(["first", "second"]);
    });

    test("includes the recipe with its images for recipe items", async ({
      trpc,
      user,
    }) => {
      const recipe = await prisma.recipe.create({
        data: recipeFactory(user.id),
      });
      const image = await prisma.image.create({
        data: {
          userId: user.id,
          location: "https://example.com/image.jpg",
          key: "example-key",
          json: {},
        },
      });
      await prisma.recipeImage.create({
        data: { recipeId: recipe.id, imageId: image.id, order: 0 },
      });
      await prisma.profileItem.create({
        data: profileItemFactory({
          userId: user.id,
          type: "recipe",
          visibility: "public",
          recipeId: recipe.id,
        }),
      });

      const items = await trpc.users.getVisibleUserProfileItems({
        userId: user.id,
      });

      expect(items[0].recipe?.id).toEqual(recipe.id);
      expect(items[0].recipe?.images[0]?.location).toEqual(image.location);
      expect(items[0].label).toEqual(null);
    });

    test("returns the owner's own items even when their profile is disabled", async ({
      trpc,
      user,
    }) => {
      await prisma.profileItem.create({
        data: profileItemFactory({
          userId: user.id,
          type: "all-recipes",
          visibility: "public",
        }),
      });

      const items = await trpc.users.getVisibleUserProfileItems({
        userId: user.id,
      });

      expect(items).toHaveLength(1);
    });
  });

  describe("privacy", () => {
    test("returns no items for a disabled profile viewed by another user", async ({
      trpc,
      user2,
    }) => {
      await prisma.profileItem.create({
        data: profileItemFactory({
          userId: user2.id,
          type: "all-recipes",
          visibility: "public",
        }),
      });

      const items = await trpc.users.getVisibleUserProfileItems({
        userId: user2.id,
      });

      expect(items).toEqual([]);
    });

    test("returns no items for a disabled profile viewed anonymously", async ({
      user,
    }) => {
      await prisma.profileItem.create({
        data: profileItemFactory({
          userId: user.id,
          type: "all-recipes",
          visibility: "public",
        }),
      });

      const items = await anonymousTrpc.users.getVisibleUserProfileItems({
        userId: user.id,
      });

      expect(items).toEqual([]);
    });
  });
});
