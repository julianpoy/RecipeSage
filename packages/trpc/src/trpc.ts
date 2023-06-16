import { inferAsyncReturnType, initTRPC } from "@trpc/server";
import { createContext } from "./context";

/**
 * Initialization of tRPC backend
 * Should be done only once per backend!
 */
type Context = inferAsyncReturnType<typeof createContext>;
const t = initTRPC.context<Context>().create();

/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const router = t.router;
export const publicProcedure = t.procedure;
