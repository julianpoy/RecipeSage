import { prisma } from "@recipesage/prisma";
import {
  recipeFactory,
  discoverRecipeFactory,
} from "@recipesage/util/server/general";
import { test, anonymousTrpc } from "../../testutils";

const { revokeAuthorizationTokenMock } = vi.hoisted(() => ({
  revokeAuthorizationTokenMock: vi.fn(),
}));

vi.mock("apple-signin-auth", () => ({
  default: {
    revokeAuthorizationToken: revokeAuthorizationTokenMock,
    getClientSecret: () => "test-client-secret",
  },
}));

describe("deleteUser", () => {
  beforeEach(() => {
    revokeAuthorizationTokenMock.mockReset();
  });

  describe("apple auth token", () => {
    test("revokes the caller's Apple refresh tokens", async ({
      trpc,
      user,
    }) => {
      revokeAuthorizationTokenMock.mockResolvedValue("");
      await prisma.appleAuthToken.create({
        data: {
          userId: user.id,
          clientId: "com.recipesage.ios",
          appleUserId: "apple-user-id",
          refreshToken: "test-refresh-token",
        },
      });

      await trpc.users.deleteUser();

      expect(revokeAuthorizationTokenMock).toHaveBeenCalledWith(
        "test-refresh-token",
        expect.objectContaining({
          clientID: "com.recipesage.ios",
          tokenTypeHint: "refresh_token",
        }),
      );
      const appleAuthToken = await prisma.appleAuthToken.findFirst({
        where: { userId: user.id },
      });
      expect(appleAuthToken).toBeNull();
    });

    test("deletes the account when the revoke fails", async ({
      trpc,
      user,
    }) => {
      revokeAuthorizationTokenMock.mockRejectedValue(new Error("failed"));
      await prisma.appleAuthToken.create({
        data: {
          userId: user.id,
          clientId: "com.recipesage.ios",
          appleUserId: "apple-user-id",
          refreshToken: "test-refresh-token",
        },
      });

      await trpc.users.deleteUser();

      const deleted = await prisma.user.findUnique({
        where: { id: user.id },
      });
      expect(deleted).toBeNull();
    });
  });

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

    test("deletes images used only by the caller's discover recipes", async ({
      trpc,
      user,
    }) => {
      const image = await prisma.image.create({
        data: {
          userId: user.id,
          location: "https://example.com/image.jpg",
          key: "example-key",
          json: {},
        },
      });
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

      await trpc.users.deleteUser();

      const deletedImage = await prisma.image.findUnique({
        where: { id: image.id },
      });
      expect(deletedImage).toBeNull();
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
