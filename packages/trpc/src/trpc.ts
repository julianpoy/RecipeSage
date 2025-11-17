import { inferAsyncReturnType, initTRPC } from "@trpc/server";
import { createContext } from "./context";
import { trace, SpanStatusCode } from "@opentelemetry/api";
import { customTrpcTransformer } from "@recipesage/util/shared";
import * as Sentry from "@sentry/node";

/**
 * Initialization of tRPC backend
 * Should be done only once per backend!
 */
type Context = inferAsyncReturnType<typeof createContext>;
const t = initTRPC.context<Context>().create({
  transformer: customTrpcTransformer,
});

const sentryMiddleware = t.middleware(
  Sentry.trpcMiddleware({
    attachRpcInput: true,
  }),
);

const otelMiddleware = t.middleware(async ({ path, next }) => {
  const tracer = trace.getTracer("trpc");

  return tracer.startActiveSpan(`tRPC: ${path}`, async (span) => {
    try {
      const result = await next();
      span.setAttribute("rpc.method", path);
      span.updateName(`/trpc/${path}`); // Change span name to reflect the procedure
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });
      throw error;
    } finally {
      span.end();
    }
  });
});

/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const router = t.router;
export const publicProcedure = t.procedure
  .use(otelMiddleware)
  .use(sentryMiddleware);
