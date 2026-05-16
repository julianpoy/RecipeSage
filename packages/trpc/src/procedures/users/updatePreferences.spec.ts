import { prisma } from "@recipesage/prisma";
import { preferencesFactory } from "@recipesage/util/server/general";
import { test, anonymousTrpc } from "../../testutils";

describe("updatePreferences", () => {
  describe("success", () => {
    test("stores the caller's preferences", async ({ trpc, user }) => {
      const preferences = preferencesFactory();

      const response = await trpc.users.updatePreferences(preferences);
      expect(response).toEqual("Ok");

      const updated = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(updated.preferences).toEqual(preferences);
    });

    test("replaces previously stored preferences", async ({ trpc, user }) => {
      await prisma.user.update({
        where: { id: user.id },
        data: { preferences: { stale: "data" } },
      });
      const preferences = preferencesFactory();

      await trpc.users.updatePreferences(preferences);

      const updated = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(updated.preferences).toEqual(preferences);
    });

    test("round-trips through getPreferences without dropping keys", async ({
      trpc,
    }) => {
      const preferences = preferencesFactory();

      await trpc.users.updatePreferences(preferences);
      const fetched = await trpc.users.getPreferences();

      expect(fetched).toEqual(preferences);
    });
  });

  describe("error", () => {
    test("throws when the caller is not logged in", async () => {
      await expect(
        anonymousTrpc.users.updatePreferences(preferencesFactory()),
      ).rejects.toThrow("Must be logged in");
    });
  });
});
