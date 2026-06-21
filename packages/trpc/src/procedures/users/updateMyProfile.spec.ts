import { prisma } from "@recipesage/prisma";
import { recipeFactory } from "@recipesage/util/server/general";
import { test, anonymousTrpc } from "../../testutils";

const createOwnImage = (userId: string) =>
  prisma.image.create({
    data: {
      userId,
      location: "https://example.com/image.jpg",
      key: "example-key",
      json: {},
    },
  });

describe("updateMyProfile", () => {
  describe("success", () => {
    test("updates name, handle, and enableProfile", async ({ trpc, user }) => {
      await trpc.users.updateMyProfile({
        name: "New Name",
        handle: "NewHandle",
        enableProfile: true,
      });

      const updated = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(updated.name).toEqual("New Name");
      expect(updated.handle).toEqual("newhandle");
      expect(updated.enableProfile).toEqual(true);
    });

    test("replaces the caller's profile items", async ({ trpc, user }) => {
      const recipe = await prisma.recipe.create({
        data: recipeFactory(user.id),
      });

      await trpc.users.updateMyProfile({
        profileItems: [
          {
            title: "All my recipes",
            type: "all-recipes",
            visibility: "public",
          },
          {
            title: "A recipe",
            type: "recipe",
            recipeId: recipe.id,
            visibility: "friends-only",
          },
        ],
      });

      const items = await prisma.profileItem.findMany({
        where: { userId: user.id },
        orderBy: { order: "asc" },
      });
      expect(items.map((item) => item.title)).toEqual([
        "All my recipes",
        "A recipe",
      ]);
      expect(items[1].recipeId).toEqual(recipe.id);

      await trpc.users.updateMyProfile({
        profileItems: [
          {
            title: "Only this now",
            type: "all-recipes",
            visibility: "public",
          },
        ],
      });

      const itemsAfter = await prisma.profileItem.findMany({
        where: { userId: user.id },
      });
      expect(itemsAfter.map((item) => item.title)).toEqual(["Only this now"]);
    });

    test("sets a single profile image", async ({ trpc, user }) => {
      const image = await createOwnImage(user.id);

      await trpc.users.updateMyProfile({
        profileImageIds: [image.id],
      });

      const profileImages = await prisma.userProfileImage.findMany({
        where: { userId: user.id },
      });
      expect(profileImages.map((profileImage) => profileImage.imageId)).toEqual(
        [image.id],
      );
    });

    test("drops extra freshly-uploaded images without the multiple images capability", async ({
      trpc,
      user,
    }) => {
      const image1 = await createOwnImage(user.id);
      const image2 = await createOwnImage(user.id);

      await trpc.users.updateMyProfile({
        profileImageIds: [image1.id, image2.id],
      });

      const profileImages = await prisma.userProfileImage.findMany({
        where: { userId: user.id },
      });
      expect(profileImages.map((profileImage) => profileImage.imageId)).toEqual(
        [image1.id],
      );
    });
  });

  describe("error", () => {
    test("rejects an invalid handle", async ({ trpc }) => {
      await expect(
        trpc.users.updateMyProfile({ handle: "not a valid handle!" }),
      ).rejects.toThrow("Handle must only contain");
    });

    test("rejects a handle already in use by another account", async ({
      trpc,
      user2,
    }) => {
      await prisma.user.update({
        where: { id: user2.id },
        data: { handle: "taken" },
      });

      await expect(
        trpc.users.updateMyProfile({ handle: "taken" }),
      ).rejects.toThrow("already in use");
    });

    test("throws when the caller is not logged in", async () => {
      await expect(
        anonymousTrpc.users.updateMyProfile({ name: "Nope" }),
      ).rejects.toThrow("Must be logged in");
    });
  });
});
