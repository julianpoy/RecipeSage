import { openai, createOpenAI } from "@ai-sdk/openai";
import { anthropic, createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { config } from "../general/config";

export const aiProvider = (() => {
  const commonConfig = {
    apiKey: process.env.AI_API_KEY || "selfhost-invalid-placeholder",
    baseURL: process.env.AI_API_BASE_URL || undefined,
  };
  switch (config.ai.provider) {
    case "openrouter": {
      return createOpenRouter(commonConfig);
    }
    case "google": {
      return createGoogleGenerativeAI(commonConfig);
    }
    case "openai": {
      return createOpenAI(commonConfig);
    }
    case "anthropic": {
      return createAnthropic(commonConfig);
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
