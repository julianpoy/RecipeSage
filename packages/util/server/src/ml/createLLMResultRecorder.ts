import type { ProviderMetadata } from "ai";
import { metrics } from "../general/metrics";
import type { LLMRetryCategory } from "./withLLMRetry";

const providerName = (providerMetadata: ProviderMetadata | undefined) => {
  const routing = providerMetadata?.gateway?.routing;
  if (
    routing &&
    typeof routing === "object" &&
    "finalProvider" in routing &&
    typeof routing.finalProvider === "string" &&
    routing.finalProvider
  ) {
    return routing.finalProvider.toLowerCase();
  }

  const openRouterProvider = providerMetadata?.openrouter?.provider;
  if (typeof openRouterProvider === "string" && openRouterProvider) {
    return openRouterProvider.toLowerCase();
  }

  return "unknown";
};

export const createLLMResultRecorder = (
  category: LLMRetryCategory | "assistant",
  model: string,
) => {
  let provider = "unknown";

  return {
    onStepEnd: (step: { providerMetadata: ProviderMetadata | undefined }) => {
      provider = providerName(step.providerMetadata);
    },
    record: (outcome: string) => {
      metrics.llmResult.inc({ category, model, provider, outcome });
    },
  };
};
