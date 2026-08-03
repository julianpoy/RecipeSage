import { prisma } from "@recipesage/prisma";
import { preferencesFactory } from "@recipesage/util/server/general";
import {
  AppTheme,
  OfflineModePromptOptions,
  SupportedFontSize,
} from "@recipesage/util/shared";
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

    test("retains stored preferences for keys the caller does not send", async ({
      trpc,
      user,
    }) => {
      await trpc.users.updatePreferences({
        ...preferencesFactory(),
        "cookMode.fontSize": SupportedFontSize.PX24,
        "global.offlineModePrompt": OfflineModePromptOptions.Never,
        "myRecipes.showRating": true,
        "measurementConverter.enabledUnits": ["cup"],
      });

      const {
        "cookMode.fontSize": _cookModeFontSize,
        "global.offlineModePrompt": _offlineModePrompt,
        "myRecipes.showRating": _showRating,
        "measurementConverter.enabledUnits": _enabledUnits,
        ...olderClientPreferences
      } = preferencesFactory();

      await trpc.users.updatePreferences(olderClientPreferences);

      const updated = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(updated.preferences).toMatchObject({
        "cookMode.fontSize": SupportedFontSize.PX24,
        "global.offlineModePrompt": OfflineModePromptOptions.Never,
        "myRecipes.showRating": true,
        "measurementConverter.enabledUnits": ["cup"],
      });
    });

    test("applies only the keys the caller sends", async ({ trpc, user }) => {
      await trpc.users.updatePreferences(preferencesFactory());

      await trpc.users.updatePreferences({
        "global.theme": AppTheme.Midnight,
      });

      const updated = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(updated.preferences).toEqual({
        ...preferencesFactory(),
        "global.theme": AppTheme.Midnight,
      });
    });

    test("stores preferences for a caller with none stored", async ({
      trpc,
      user,
    }) => {
      await trpc.users.updatePreferences({
        "global.theme": AppTheme.Dark,
      });

      const updated = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(updated.preferences).toEqual({ "global.theme": AppTheme.Dark });
    });
  });

  describe("error", () => {
    test("throws when the caller is not logged in", async () => {
      await expect(
        anonymousTrpc.users.updatePreferences(preferencesFactory()),
      ).rejects.toThrow("Must be logged in");
    });

    test("rejects an invalid preference value without storing anything", async ({
      trpc,
      user,
    }) => {
      const preferences = preferencesFactory();
      await trpc.users.updatePreferences(preferences);

      await expect(
        trpc.users.updatePreferences({
          "ShoppingList.ignoreItemTitles": "a".repeat(5001),
        }),
      ).rejects.toThrow();

      const updated = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(updated.preferences).toEqual(preferences);
    });
  });
});
