import { createHTTPServer } from "@trpc/server/adapters/standalone";
import { router } from "./trpc";
import { getRecipes } from "./procedures/recipes/getRecipes";

const appRouter = router({
  getRecipes,
});

const server = createHTTPServer({
  router: appRouter,
});

const port = parseInt(process.env.PORT || "0", 10) || 3001;
server.listen(port);

export type AppRouter = typeof appRouter;
