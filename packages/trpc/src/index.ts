import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { router } from "./trpc";
import { getRecipes } from "./procedures/recipes/getRecipes";
import { searchRecipes } from "./procedures/recipes/searchRecipes";
import { createContext } from "./context";

export * from "./types/queryTypes";
export * from "./services/search"; // Legacy while old backend still needs it

const appRouter = router({
  getRecipes,
  searchRecipes,
});

export const trpcExpressMiddleware = createExpressMiddleware({
  router: appRouter,
  createContext,
});

export type AppRouter = typeof appRouter;
