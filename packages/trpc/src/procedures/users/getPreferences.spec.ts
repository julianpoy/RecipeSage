import { prisma } from "@recipesage/prisma";
import { preferencesFactory } from "@recipesage/util/server/general";
import { test, anonymousTrpc } from "../../testutils";

describe("getPreferences", () => {
  describe("success", () => {
    test("returns null when the caller has no stored preferences", async ({
      trpc,
    }) => {
      const response = await trpc.users.getPreferences();
      expect(response).toBeNull();
    });

    test("returns the caller's stored preferences", async ({ trpc, user }) => {
      const storedPreferences = preferencesFactory();
      await trpc.users.updatePreferences(storedPreferences);

      const response = await trpc.users.getPreferences();
      expect(response).toEqual(storedPreferences);

      const persisted = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(persisted.preferences).toEqual(storedPreferences);
    });
  });

  describe("error", () => {
    test("throws when the caller is not logged in", async () => {
      await expect(anonymousTrpc.users.getPreferences()).rejects.toThrow(
        "Must be logged in",
      );
    });
  });
});
