import { createExpressMiddleware } from "@trpc/server/adapters/express";
import {
  generateOpenApiDocument,
  createOpenApiExpressMiddleware,
} from "trpc-to-openapi";
import { router } from "./trpc";
import { createContext } from "./context";
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
import { imagesRouter } from "./procedures/images/imagesRouter";

export const appRouter = router({
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
  images: imagesRouter,
});

export const trpcExpressMiddleware = createExpressMiddleware({
  router: appRouter,
  createContext,
});

export const openApiDocument = generateOpenApiDocument(appRouter, {
  title: "RecipeSage API",
  description:
    "Public REST surface generated from RecipeSage's tRPC router. Procedures are grouped by tRPC sub-router (tag).",
  version: "1.0.0",
  baseUrl: "/compat/v2",
});

export const openApiExpressMiddleware = createOpenApiExpressMiddleware({
  router: appRouter,
  createContext,
});

export type AppRouter = typeof appRouter;
