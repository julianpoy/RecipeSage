import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prisma, User } from "@recipesage/prisma";
import { faker } from "@faker-js/faker";
import { processImageDeletionJob } from "./processImageDeletionJob";
import {
  discoverRecipeFactory,
  recipeFactory,
  userFactory,
} from "../../factories";

const { deleteObjectsMock } = vi.hoisted(() => ({
  deleteObjectsMock: vi.fn(),
}));

vi.mock("../../../storage", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  deleteObjects: deleteObjectsMock,
}));

describe("processImageDeletionJob", () => {
  let user: User;
  let otherUser: User;
  const imageIds: string[] = [];

  const createImage = async (userId: string | null) => {
    const image = await prisma.image.create({
      data: {
        userId,
        location: "https://example.com/image.jpg",
        key: faker.string.alphanumeric(20),
        json: {},
      },
    });
    imageIds.push(image.id);
    return image;
  };

  beforeEach(async () => {
    deleteObjectsMock.mockReset();
    deleteObjectsMock.mockResolvedValue([]);
    user = await prisma.user.create({ data: userFactory() });
    otherUser = await prisma.user.create({ data: userFactory() });
  });

  afterEach(async () => {
    await prisma.user.deleteMany({
      where: { id: { in: [user.id, otherUser.id] } },
    });
    await prisma.image.deleteMany({ where: { id: { in: imageIds } } });
    imageIds.length = 0;
  });

  it("deletes the files and rows of images with no links", async () => {
    const image = await createImage(user.id);

    await processImageDeletionJob({
      imageIds: [image.id],
      imageOwnerUserId: user.id,
    });

    expect(deleteObjectsMock).toHaveBeenCalledWith(expect.anything(), [
      image.key,
    ]);
    expect(
      await prisma.image.findUnique({ where: { id: image.id } }),
    ).toBeNull();
  });

  it("keeps an image that is still linked to a recipe", async () => {
    const image = await createImage(user.id);
    const recipe = await prisma.recipe.create({
      data: recipeFactory(user.id),
    });
    await prisma.recipeImage.create({
      data: { recipeId: recipe.id, imageId: image.id, order: 0 },
    });

    await processImageDeletionJob({
      imageIds: [image.id],
      imageOwnerUserId: user.id,
    });

    expect(deleteObjectsMock).not.toHaveBeenCalled();
    expect(
      (await prisma.image.findUnique({ where: { id: image.id } }))?.id,
    ).toEqual(image.id);
  });

  it("keeps an image that is still linked to a profile", async () => {
    const image = await createImage(user.id);
    await prisma.userProfileImage.create({
      data: { userId: user.id, imageId: image.id, order: 0 },
    });

    await processImageDeletionJob({
      imageIds: [image.id],
      imageOwnerUserId: user.id,
    });

    expect(deleteObjectsMock).not.toHaveBeenCalled();
    expect(
      (await prisma.image.findUnique({ where: { id: image.id } }))?.id,
    ).toEqual(image.id);
  });

  it("keeps an image that is still linked to a discover recipe", async () => {
    const image = await createImage(user.id);
    const discoverRecipe = await prisma.discoverRecipe.create({
      data: discoverRecipeFactory(user.id),
    });
    await prisma.discoverRecipeImage.create({
      data: {
        discoverRecipeId: discoverRecipe.id,
        imageId: image.id,
        order: 0,
      },
    });

    await processImageDeletionJob({
      imageIds: [image.id],
      imageOwnerUserId: user.id,
    });

    expect(deleteObjectsMock).not.toHaveBeenCalled();
    expect(
      (await prisma.image.findUnique({ where: { id: image.id } }))?.id,
    ).toEqual(image.id);
  });

  it("keeps an image owned by another user", async () => {
    const image = await createImage(otherUser.id);

    await processImageDeletionJob({
      imageIds: [image.id],
      imageOwnerUserId: user.id,
    });

    expect(deleteObjectsMock).not.toHaveBeenCalled();
    expect(
      (await prisma.image.findUnique({ where: { id: image.id } }))?.id,
    ).toEqual(image.id);
  });

  it("deletes an image with no owner when the owner is null", async () => {
    const image = await createImage(null);

    await processImageDeletionJob({
      imageIds: [image.id],
      imageOwnerUserId: null,
    });

    expect(
      await prisma.image.findUnique({ where: { id: image.id } }),
    ).toBeNull();
  });

  it("keeps an image that has an owner when the owner is null", async () => {
    const image = await createImage(user.id);

    await processImageDeletionJob({
      imageIds: [image.id],
      imageOwnerUserId: null,
    });

    expect(deleteObjectsMock).not.toHaveBeenCalled();
    expect(
      (await prisma.image.findUnique({ where: { id: image.id } }))?.id,
    ).toEqual(image.id);
  });

  it("keeps the rows of images whose files failed to delete and throws", async () => {
    const failedImage = await createImage(user.id);
    const deletedImage = await createImage(user.id);
    deleteObjectsMock.mockResolvedValue([failedImage.key]);

    await expect(
      processImageDeletionJob({
        imageIds: [failedImage.id, deletedImage.id],
        imageOwnerUserId: user.id,
      }),
    ).rejects.toThrow("Failed to delete 1 of 2 images from storage");

    expect(
      (await prisma.image.findUnique({ where: { id: failedImage.id } }))?.id,
    ).toEqual(failedImage.id);
    expect(
      await prisma.image.findUnique({ where: { id: deletedImage.id } }),
    ).toBeNull();
  });

  it("keeps every row when the storage request throws", async () => {
    const image = await createImage(user.id);
    deleteObjectsMock.mockRejectedValue(new Error("SlowDown"));

    await expect(
      processImageDeletionJob({
        imageIds: [image.id],
        imageOwnerUserId: user.id,
      }),
    ).rejects.toThrow("SlowDown");

    expect(
      (await prisma.image.findUnique({ where: { id: image.id } }))?.id,
    ).toEqual(image.id);
  });
});
