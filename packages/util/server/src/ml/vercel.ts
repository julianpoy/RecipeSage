import { openai, createOpenAI } from "@ai-sdk/openai";
import { anthropic, createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";
import { config } from "../general/config";

export const aiProvider: (
  modelId: string,
  options?: {
    requireParameters?: boolean;
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
        provider(
          modelId,
          options?.requireParameters
            ? { provider: { require_parameters: true } }
            : undefined,
        );
    }
    case "google": {
      const provider = createGoogleGenerativeAI(commonConfig);
      return (modelId) => provider(modelId);
    }
    case "openai": {
      const provider = createOpenAI(commonConfig);
      return (modelId) => provider(modelId);
    }
    case "anthropic": {
      const provider = createAnthropic(commonConfig);
      return (modelId) => provider(modelId);
    }
    default: {
      throw new Error(`Unsupported AI provider: ${config.ai.provider}`);
    }
  }
})();

export const aiProviderNativeTools = (() => {
  switch (config.ai.provider) {
    case "openrouter": {
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
