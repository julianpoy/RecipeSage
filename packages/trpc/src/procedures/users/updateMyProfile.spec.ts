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

    test("ignores profile image ids that do not exist", async ({
      trpc,
      user,
    }) => {
      const image = await createOwnImage(user.id);

      await trpc.users.updateMyProfile({
        profileImageIds: [image.id, "00000000-0000-0000-0000-000000000000"],
      });

      const profileImages = await prisma.userProfileImage.findMany({
        where: { userId: user.id },
      });
      expect(profileImages.map((profileImage) => profileImage.imageId)).toEqual(
        [image.id],
      );
    });

    test("clears profile images when passed an empty array", async ({
      trpc,
      user,
    }) => {
      const image = await createOwnImage(user.id);
      await trpc.users.updateMyProfile({ profileImageIds: [image.id] });

      await trpc.users.updateMyProfile({ profileImageIds: [] });

      const profileImages = await prisma.userProfileImage.findMany({
        where: { userId: user.id },
      });
      expect(profileImages).toHaveLength(0);
    });

    test("keeps another user's image without the multiple images capability", async ({
      trpc,
      user,
      user2,
    }) => {
      const ownFresh = await createOwnImage(user.id);
      const ownFreshExtra = await createOwnImage(user.id);
      const othersImage = await createOwnImage(user2.id);

      await trpc.users.updateMyProfile({
        profileImageIds: [ownFresh.id, ownFreshExtra.id, othersImage.id],
      });

      const profileImages = await prisma.userProfileImage.findMany({
        where: { userId: user.id },
        orderBy: { order: "asc" },
      });
      expect(profileImages.map((profileImage) => profileImage.imageId)).toEqual(
        [ownFresh.id, othersImage.id],
      );
    });

    test("keeps own images older than a day without the multiple images capability", async ({
      trpc,
      user,
    }) => {
      const ownFresh = await createOwnImage(user.id);
      const ownOld = await prisma.image.create({
        data: {
          userId: user.id,
          location: "https://example.com/image.jpg",
          key: "example-key-old",
          json: {},
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
      });

      await trpc.users.updateMyProfile({
        profileImageIds: [ownFresh.id, ownOld.id],
      });

      const profileImages = await prisma.userProfileImage.findMany({
        where: { userId: user.id },
        orderBy: { order: "asc" },
      });
      expect(profileImages.map((profileImage) => profileImage.imageId)).toEqual(
        [ownFresh.id, ownOld.id],
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

    test("rejects a handle already in use regardless of casing", async ({
      trpc,
      user2,
    }) => {
      await prisma.user.update({
        where: { id: user2.id },
        data: { handle: "taken" },
      });

      await expect(
        trpc.users.updateMyProfile({ handle: "TAKEN" }),
      ).rejects.toThrow("already in use");
    });

    test("rejects pinning a recipe the caller does not own", async ({
      trpc,
      user,
      user2,
    }) => {
      const recipe = await prisma.recipe.create({
        data: recipeFactory(user2.id),
      });

      await expect(
        trpc.users.updateMyProfile({
          profileItems: [
            {
              title: "Their recipe",
              type: "recipe",
              visibility: "public",
              recipeId: recipe.id,
            },
          ],
        }),
      ).rejects.toThrow("your own recipes");

      const profileItems = await prisma.profileItem.findMany({
        where: { userId: user.id },
      });
      expect(profileItems).toHaveLength(0);
    });

    test("rejects pinning a label the caller does not own", async ({
      trpc,
      user2,
    }) => {
      const label = await prisma.label.create({
        data: { userId: user2.id, title: "Their label" },
      });

      await expect(
        trpc.users.updateMyProfile({
          profileItems: [
            {
              title: "Their label",
              type: "label",
              visibility: "public",
              labelId: label.id,
            },
          ],
        }),
      ).rejects.toThrow("your own labels");
    });

    test("throws when the caller is not logged in", async () => {
      await expect(
        anonymousTrpc.users.updateMyProfile({ name: "Nope" }),
      ).rejects.toThrow("Must be logged in");
    });
  });
});
