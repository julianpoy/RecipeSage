import { openai, createOpenAI } from "@ai-sdk/openai";
import { anthropic, createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export const aiProvider = (() => {
  const commonConfig = {
    apiKey: process.env.AI_API_KEY || "selfhost-invalid-placeholder",
    baseURL: process.env.AI_API_BASE_URL || undefined,
  };
  const provider = process.env.AI_PROVIDER;
  switch (process.env.AI_PROVIDER || "openai") {
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
      throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }
})();

export const aiProviderNativeTools = (() => {
  switch (process.env.AI_PROVIDER || "openai") {
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

export const AI_MODEL_HIGH = process.env.AI_MODEL_HIGH || "gpt-5";
export const AI_MODEL_LOW = process.env.AI_MODEL_LOW || "gpt-5-mini";
export const AI_MODEL_OCR = process.env.AI_MODEL_OCR || "gpt-5-mini";
