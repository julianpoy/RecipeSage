import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";
import * as Sentry from "@sentry/node";
import { router } from "./trpc";
import { createContext } from "./context";
import { TRPCError } from "@trpc/server";
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
import { mealOptionsRouter } from "./procedures/mealOptions/mealOptionsRouter";

const appRouter = router({
  labelGroups: labelGroupsRouter,
  labels: labelsRouter,
  payments: paymentsRouter,
  recipes: recipesRouter,
  mealPlans: mealPlansRouter,
  mealOptions: mealOptionsRouter,
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
