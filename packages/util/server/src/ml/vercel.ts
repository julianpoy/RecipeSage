import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";

const aiProvider = (() => {
  switch (process.env.AI_PROVIDER || "openai") {
    case "openai": {
      return createOpenAI({
        apiKey: process.env.OPENAI_API_KEY || "selfhost-invalid-placeholder",
        baseURL: process.env.OPENAI_API_BASE_URL || undefined,
      });
    }
    case "anthropic": {
      return createAnthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }
  }
})();
globalThis.AI_SDK_DEFAULT_PROVIDER = aiProvider;

export const AI_MODEL_HIGH = process.env.AI_MODEL_HIGH || "gpt-5";
export const AI_MODEL_LOW = process.env.AI_MODEL_LOW || "gpt-5-mini";
export const AI_MODEL_OCR = process.env.AI_MODEL_OCR || "gpt-5-mini";
