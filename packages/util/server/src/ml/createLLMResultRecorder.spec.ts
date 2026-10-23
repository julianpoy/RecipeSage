import { describe, it, expect, vi, afterEach } from "vitest";
import type { ProviderMetadata } from "ai";
import { createLLMResultRecorder } from "./createLLMResultRecorder";
import { metrics } from "../general/metrics";

const recordedLabels = (providerMetadata: ProviderMetadata | undefined) => {
  const resultSpy = vi.spyOn(metrics.llmResult, "inc");

  const resultRecorder = createLLMResultRecorder(
    "text_to_recipe",
    "fake-model",
  );
  resultRecorder.onStepEnd({ providerMetadata });
  resultRecorder.record("ok");

  return resultSpy.mock.calls[0][0];
};

describe("createLLMResultRecorder", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("records the category, model, provider and outcome", () => {
    expect(recordedLabels({ openrouter: { provider: "Fireworks" } })).toEqual({
      category: "text_to_recipe",
      model: "fake-model",
      provider: "fireworks",
      outcome: "ok",
    });
  });

  it("reads the provider from gateway routing metadata", () => {
    expect(
      recordedLabels({
        gateway: { routing: { finalProvider: "togetherai" } },
      }),
    ).toEqual(expect.objectContaining({ provider: "togetherai" }));
  });

  it("records an unknown provider when OpenRouter sends an empty provider", () => {
    expect(recordedLabels({ openrouter: { provider: "" } })).toEqual(
      expect.objectContaining({ provider: "unknown" }),
    );
  });

  it("records an unknown provider when there is no provider metadata", () => {
    expect(recordedLabels(undefined)).toEqual(
      expect.objectContaining({ provider: "unknown" }),
    );
  });

  it("records an unknown provider when no step has ended", () => {
    const resultSpy = vi.spyOn(metrics.llmResult, "inc");

    createLLMResultRecorder("assistant", "fake-model").record("error");

    expect(resultSpy).toHaveBeenCalledWith({
      category: "assistant",
      model: "fake-model",
      provider: "unknown",
      outcome: "error",
    });
  });
});
