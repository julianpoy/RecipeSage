import { prisma } from "@recipesage/prisma";
import { preferencesFactory } from "@recipesage/util/server/general";
import {
  MealPlanViewTypeOptions,
  MyRecipesViewTypeOptions,
} from "@recipesage/util/shared";
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

    test("falls back to defaults for keys missing from stored preferences", async ({
      trpc,
      user,
    }) => {
      const {
        "recipeDetails.autoExpandNutrition": _autoExpandNutrition,
        "MealPlan.viewType": _mealPlanViewType,
        ...storedPreferences
      } = preferencesFactory();

      await prisma.user.update({
        where: { id: user.id },
        data: { preferences: storedPreferences },
      });

      const response = await trpc.users.getPreferences();

      expect(response?.["recipeDetails.autoExpandNutrition"]).toEqual(false);
      expect(response?.["MealPlan.viewType"]).toEqual(
        MealPlanViewTypeOptions.Calendar,
      );
      expect(response?.["myRecipes.viewType"]).toEqual(
        MyRecipesViewTypeOptions.Tiles,
      );
    });

    test("falls back to defaults for stored preferences holding invalid values", async ({
      trpc,
      user,
    }) => {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          preferences: {
            ...preferencesFactory(),
            "MealPlan.viewType": null,
            "recipeDetails.autoExpandNutrition": "nope",
            "measurementConverter.enabledUnits": 12,
          },
        },
      });

      const response = await trpc.users.getPreferences();

      expect(response?.["MealPlan.viewType"]).toEqual(
        MealPlanViewTypeOptions.Calendar,
      );
      expect(response?.["recipeDetails.autoExpandNutrition"]).toEqual(false);
      expect(
        response?.["measurementConverter.enabledUnits"].length,
      ).toBeGreaterThan(0);
    });

    test("preserves valid stored values alongside invalid ones", async ({
      trpc,
      user,
    }) => {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          preferences: {
            ...preferencesFactory(),
            "myRecipes.viewType": MyRecipesViewTypeOptions.Compact,
            "MealPlan.viewType": null,
          },
        },
      });

      const response = await trpc.users.getPreferences();

      expect(response?.["myRecipes.viewType"]).toEqual(
        MyRecipesViewTypeOptions.Compact,
      );
      expect(response?.["MealPlan.viewType"]).toEqual(
        MealPlanViewTypeOptions.Calendar,
      );
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
