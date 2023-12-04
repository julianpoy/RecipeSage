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
import { getLabelGroups } from "./procedures/labelGroups/getLabelGroups";
import { createLabelGroup } from "./procedures/labelGroups/createLabelGroup";
import { createLabel } from "./procedures/labels/createLabel";
import { deleteLabel } from "./procedures/labels/deleteLabel";
import { deleteLabelGroup } from "./procedures/labelGroups/deleteLabelGroup";
import { updateLabelGroup } from "./procedures/labelGroups/updateLabelGroup";
import { updateLabel } from "./procedures/labels/updateLabel";

export * from "./types/assistantMessageSummary";
export * from "./types/recipeSummary";
export * from "./types/userPublic";
export * from "./services/search"; // Legacy while old backend still needs it
export * from "./services/capabilities"; // Legacy while old backend still needs it

const appRouter = router({
  labelGroups: router({
    createLabelGroup,
    getLabelGroups,
    updateLabelGroup,
    deleteLabelGroup,
  }),
  labels: router({
    createLabel,
    getLabels,
    updateLabel,
    deleteLabel,
  }),
  recipes: router({
    getRecipes,
    searchRecipes,
    getSimilarRecipes,
  }),
  assistant: router({
    sendAssistantMessage,
    getAssistantMessages,
  }),

  // TODO: Legacy compat remove
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
