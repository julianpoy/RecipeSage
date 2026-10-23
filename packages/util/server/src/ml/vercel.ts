import { openai, createOpenAI } from "@ai-sdk/openai";
import { anthropic, createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  createGateway,
  wrapLanguageModel,
  type LanguageModel,
  type LanguageModelMiddleware,
  type Tool,
} from "ai";
import { config } from "../general/config";

const reasoningMiddleware = (
  disableReasoning: boolean | undefined,
): LanguageModelMiddleware => ({
  transformParams: async ({ params }) => ({
    ...params,
    reasoning: disableReasoning ? "none" : params.reasoning,
  }),
});

export const aiProvider: (
  modelId: string,
  options?: {
    requireParameters?: boolean;
    disableReasoning?: boolean;
  },
) => LanguageModel = (() => {
  const commonConfig = {
    apiKey: process.env.AI_API_KEY || "selfhost-invalid-placeholder",
    baseURL: process.env.AI_API_BASE_URL || undefined,
  };
  switch (config.ai.provider) {
    case "openrouter": {
      const provider = createOpenRouter(commonConfig);
      return (modelId, options) =>
        provider(modelId, {
          provider: {
            require_parameters: options?.requireParameters,
          },
          reasoning: options?.disableReasoning ? { effort: "none" } : undefined,
        });
    }
    case "vercel": {
      const provider = createGateway(commonConfig);
      return (modelId, options) =>
        wrapLanguageModel({
          model: provider(modelId),
          middleware: reasoningMiddleware(options?.disableReasoning),
        });
    }
    case "google": {
      const provider = createGoogleGenerativeAI(commonConfig);
      return (modelId, options) =>
        wrapLanguageModel({
          model: provider(modelId),
          middleware: reasoningMiddleware(options?.disableReasoning),
        });
    }
    case "openai": {
      const provider = createOpenAI(commonConfig);
      return (modelId, options) =>
        wrapLanguageModel({
          model: provider(modelId),
          middleware: reasoningMiddleware(options?.disableReasoning),
        });
    }
    case "anthropic": {
      const provider = createAnthropic(commonConfig);
      return (modelId, options) =>
        wrapLanguageModel({
          model: provider(modelId),
          middleware: reasoningMiddleware(options?.disableReasoning),
        });
    }
    default: {
      throw new Error(`Unsupported AI provider: ${config.ai.provider}`);
    }
  }
})();

export const aiProviderNativeTools: { web_search: Tool | undefined } = (() => {
  switch (config.ai.provider) {
    case "openrouter": {
      return {
        web_search: undefined,
      };
    }
    case "vercel": {
      return {
        web_search: undefined,
      };
    }
    case "google": {
      return {
        web_search: undefined,
      } as const;
    }
    case "openai": {
      return {
        web_search: openai.tools.webSearch({
          searchContextSize: "high",
        }),
      } as const;
    }
    case "anthropic": {
      return {
        web_search: anthropic.tools.webSearch_20250305({
          maxUses: 3,
        }),
      } as const;
    }
    default: {
      throw new Error(`Unsupported AI provider`);
    }
  }
})();
