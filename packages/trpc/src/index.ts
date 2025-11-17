import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { router } from "./trpc";
import { createContext } from "./context";
import { getRecipes } from "./procedures/recipes/getRecipes";
import { searchRecipes } from "./procedures/recipes/searchRecipes";
import { getSimilarRecipes } from "./procedures/recipes/getSimilarRecipes";
import { usersRouter } from "./procedures/users/usersRouter";
import { shoppingListsRouter } from "./procedures/shoppingLists/shoppingListsRouter";
import { recipesRouter } from "./procedures/recipes/recipesRouter";
import { mealPlansRouter } from "./procedures/mealPlans/mealPlansRouter";
import { labelsRouter } from "./procedures/labels/labelsRouter";
import { labelGroupsRouter } from "./procedures/labelGroups/labelGroupsRouter";
import { jobsRouter } from "./procedures/jobs/jobsRouter";
import { mlRouter } from "./procedures/ml/mlRouter";
import { assistantRouter } from "./procedures/assistant/assistantRouter";
import { paymentsRouter } from "./procedures/payments/paymentsRouter";

const appRouter = router({
  labelGroups: labelGroupsRouter,
  labels: labelsRouter,
  payments: paymentsRouter,
  recipes: recipesRouter,
  mealPlans: mealPlansRouter,
  shoppingLists: shoppingListsRouter,
  assistant: assistantRouter,
  users: usersRouter,
  ml: mlRouter,
  jobs: jobsRouter,

  getRecipes,
  searchRecipes,
  getSimilarRecipes,
});

export const trpcExpressMiddleware = createExpressMiddleware({
  router: appRouter,
  createContext,
});

export type AppRouter = typeof appRouter;
