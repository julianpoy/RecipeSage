import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { router } from "./trpc";
import { getRecipes } from "./procedures/recipes/getRecipes";
import { createContext } from "./context";

const appRouter = router({
  getRecipes,
});

export const trpcExpressMiddleware = createExpressMiddleware({
  router: appRouter,
  createContext,
});

export type AppRouter = typeof appRouter;
