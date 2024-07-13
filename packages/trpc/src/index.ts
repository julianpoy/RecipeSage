import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";
import * as Sentry from "@sentry/node";
import { router } from "./trpc";
import { createContext } from "./context";
import { TRPCError } from "@trpc/server";
import { getRecipes } from "./procedures/recipes/getRecipes";
import { searchRecipes } from "./procedures/recipes/searchRecipes";
import { getSimilarRecipes } from "./procedures/recipes/getSimilarRecipes";
import { sendAssistantMessage } from "./procedures/assistant/sendAssistantMessage";
import { getAssistantMessages } from "./procedures/assistant/getAssistantMessages";
import { getLabels } from "./procedures/labels/getLabels";
import { getAllVisibleLabels } from "./procedures/labels/getAllVisibleLabels";
import { getLabelsByUserId } from "./procedures/labels/getLabelsByUserId";
import { getLabelGroups } from "./procedures/labelGroups/getLabelGroups";
import { createLabelGroup } from "./procedures/labelGroups/createLabelGroup";
import { createLabel } from "./procedures/labels/createLabel";
import { deleteLabel } from "./procedures/labels/deleteLabel";
import { deleteLabelGroup } from "./procedures/labelGroups/deleteLabelGroup";
import { updateLabelGroup } from "./procedures/labelGroups/updateLabelGroup";
import { updateLabel } from "./procedures/labels/updateLabel";
import { createRecipe } from "./procedures/recipes/createRecipe";
import { updateRecipe } from "./procedures/recipes/updateRecipe";
import { getRecipe } from "./procedures/recipes/getRecipe";
import { deleteRecipe } from "./procedures/recipes/deleteRecipe";
import { getMe } from "./procedures/users/getMe";
import { updatePreferences } from "./procedures/users/updatePreferences";
import { getPreferences } from "./procedures/users/getPreferences";
import { getRecipeFromOCR } from "./procedures/ml/getRecipeFromOCR";
import { getRecipesByTitle } from "./procedures/recipes/getRecipesByTitle";
import { getUniqueRecipeTitle } from "./procedures/recipes/getUniqueRecipeTitle";
import { getRecipeFromPDF } from "./procedures/ml/getRecipeFromPDF";
import { getRecipeFromText } from "./procedures/ml/getRecipeFromText";
import { signInWithGoogle } from "./procedures/users/signInWithGoogle";
import { getMealPlan } from "./procedures/mealPlans/getMealPlan";
import { getMealPlanItems } from "./procedures/mealPlans/getMealPlanItems";
import { getMealPlans } from "./procedures/mealPlans/getMealPlans";
import { createMealPlan } from "./procedures/mealPlans/createMealPlan";
import { createMealPlanItem } from "./procedures/mealPlans/createMealPlanItem";
import { deleteMealPlan } from "./procedures/mealPlans/deleteMealPlan";
import { deleteMealPlanItem } from "./procedures/mealPlans/deleteMealPlanItem";
import { detachMealPlan } from "./procedures/mealPlans/detachMealPlan";
import { updateMealPlan } from "./procedures/mealPlans/updateMealPlan";
import { updateMealPlanItem } from "./procedures/mealPlans/updateMealPlanItem";
import { createMealPlanItems } from "./procedures/mealPlans/createMealPlanItems";
import { deleteMealPlanItems } from "./procedures/mealPlans/deleteMealPlanItems";
import { updateMealPlanItems } from "./procedures/mealPlans/updateMealPlanItems";
import { createShoppingList } from "./procedures/shoppingLists/createShoppingList";
import { createShoppingListItem } from "./procedures/shoppingLists/createShoppingListItem";
import { createShoppingListItems } from "./procedures/shoppingLists/createShoppingListItems";
import { deleteShoppingList } from "./procedures/shoppingLists/deleteShoppingList";
import { deleteShoppingListItem } from "./procedures/shoppingLists/deleteShoppingListItem";
import { deleteShoppingListItems } from "./procedures/shoppingLists/deleteShoppingListItems";
import { detachShoppingList } from "./procedures/shoppingLists/detachShoppingList";
import { getShoppingList } from "./procedures/shoppingLists/getShoppingList";
import { getShoppingListItems } from "./procedures/shoppingLists/getShoppingListItems";
import { getShoppingLists } from "./procedures/shoppingLists/getShoppingLists";
import { updateShoppingList } from "./procedures/shoppingLists/updateShoppingList";
import { updateShoppingListItem } from "./procedures/shoppingLists/updateShoppingListItem";
import { updateShoppingListItems } from "./procedures/shoppingLists/updateShoppingListItems";

const appRouter = router({
  labelGroups: router({
    createLabelGroup,
    getLabelGroups,
    updateLabelGroup,
    deleteLabelGroup,
  }),
  labels: router({
    createLabel,
    getAllVisibleLabels,
    getLabels,
    getLabelsByUserId,
    updateLabel,
    deleteLabel,
  }),
  recipes: router({
    createRecipe,
    getRecipe,
    updateRecipe,
    deleteRecipe,
    getRecipes,
    searchRecipes,
    getSimilarRecipes,
    getRecipesByTitle,
    getUniqueRecipeTitle,
  }),
  mealPlans: router({
    createMealPlan,
    createMealPlanItem,
    createMealPlanItems,
    deleteMealPlan,
    deleteMealPlanItem,
    deleteMealPlanItems,
    detachMealPlan,
    getMealPlan,
    getMealPlanItems,
    getMealPlans,
    updateMealPlan,
    updateMealPlanItem,
    updateMealPlanItems,
  }),
  shoppingLists: router({
    createShoppingList,
    createShoppingListItem,
    createShoppingListItems,
    deleteShoppingList,
    deleteShoppingListItem,
    deleteShoppingListItems,
    detachShoppingList,
    getShoppingList,
    getShoppingListItems,
    getShoppingLists,
    updateShoppingList,
    updateShoppingListItem,
    updateShoppingListItems,
  }),
  assistant: router({
    sendAssistantMessage,
    getAssistantMessages,
  }),
  users: router({
    getMe,
    updatePreferences,
    getPreferences,
    signInWithGoogle,
  }),
  ml: router({
    getRecipeFromOCR,
    getRecipeFromPDF,
    getRecipeFromText,
  }),

  getRecipes,
  searchRecipes,
  getSimilarRecipes,
});

export const trpcExpressMiddleware = createExpressMiddleware({
  router: appRouter,
  createContext,
  onError: (opts) => {
    const { error, type, path, input, ctx, req } = opts;

    const statusCode = getHTTPStatusCodeFromError(error);
    if (statusCode >= 500) {
      console.error(error, error.stack);

      const mainError =
        error instanceof TRPCError ? error.cause || error : error;

      Sentry.captureException(mainError, {
        extra: {
          statusCode,
          error,
          type,
          path,
          input,
          ctx,
          req,
        },
      });
    }
  },
});

export type AppRouter = typeof appRouter;
