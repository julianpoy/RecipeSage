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
import { messagesRouter } from "./procedures/messages/messagesRouter";
import { discoverRouter } from "./procedures/discover/discoverRouter";

export const appRouter = router({
  discover: discoverRouter,
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
  messages: messagesRouter,
});

export const trpcExpressMiddleware = createExpressMiddleware({
  router: appRouter,
  createContext,
});

const TRPC_OPENAPI_BASE_PATH = "/compat/v2";

const generatedOpenApiDocument = generateOpenApiDocument(appRouter, {
  title: "RecipeSage API",
  description:
    "Public REST surface generated from RecipeSage's tRPC router. Procedures are grouped by tRPC sub-router (tag).",
  version: process.env.VERSION ?? "development",
  baseUrl: TRPC_OPENAPI_BASE_PATH,
});

const basePrefixedPaths: NonNullable<typeof generatedOpenApiDocument.paths> =
  {};
for (const [path, pathItem] of Object.entries(
  generatedOpenApiDocument.paths || {},
)) {
  basePrefixedPaths[`${TRPC_OPENAPI_BASE_PATH}${path}`] = pathItem;
}
generatedOpenApiDocument.paths = basePrefixedPaths;
delete generatedOpenApiDocument.servers;

for (const pathItem of Object.values(generatedOpenApiDocument.paths || {})) {
  const operations = [
    pathItem.get,
    pathItem.post,
    pathItem.put,
    pathItem.patch,
    pathItem.delete,
  ];

  for (const operation of operations) {
    if (operation && !operation.security) {
      operation.security = [];
    }
  }
}

export const openApiDocument = generatedOpenApiDocument;

export const openApiExpressMiddleware = createOpenApiExpressMiddleware({
  router: appRouter,
  createContext,
});

export type AppRouter = typeof appRouter;
