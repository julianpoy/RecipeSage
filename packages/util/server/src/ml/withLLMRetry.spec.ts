import { describe, it, expect, vi } from "vitest";
import {
  APICallError,
  JSONParseError,
  NoObjectGeneratedError,
  NoOutputGeneratedError,
  TypeValidationError,
} from "ai";
import { withLLMRetry } from "./withLLMRetry";
import { metrics } from "../general/metrics";

const makeNoObjectError = () =>
  new NoObjectGeneratedError({
    message: "fake",
    response: {
      id: "fake",
      timestamp: new Date(0),
      modelId: "fake",
    },
    usage: {
      inputTokens: undefined,
      inputTokenDetails: {
        noCacheTokens: undefined,
        cacheReadTokens: undefined,
        cacheWriteTokens: undefined,
      },
      outputTokens: undefined,
      outputTokenDetails: {
        textTokens: undefined,
        reasoningTokens: undefined,
      },
      totalTokens: undefined,
    },
    finishReason: "stop",
  });

describe("withLLMRetry", () => {
  it("returns the result on first success without retrying", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withLLMRetry("text_to_recipe", "fake-model", fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries after NoObjectGeneratedError and returns success", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(makeNoObjectError())
      .mockRejectedValueOnce(makeNoObjectError())
      .mockResolvedValue("ok");
    const result = await withLLMRetry("text_to_recipe", "fake-model", fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("rethrows the final NoObjectGeneratedError after 3 failed attempts", async () => {
    const finalError = makeNoObjectError();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(makeNoObjectError())
      .mockRejectedValueOnce(makeNoObjectError())
      .mockRejectedValueOnce(finalError);
    await expect(withLLMRetry("text_to_recipe", "fake-model", fn)).rejects.toBe(
      finalError,
    );
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("rethrows an unrecognized error immediately without retrying", async () => {
    const other = new Error("nope");
    const fn = vi.fn().mockRejectedValue(other);
    await expect(withLLMRetry("text_to_recipe", "fake-model", fn)).rejects.toBe(
      other,
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries after JSONParseError and returns success", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(
        new JSONParseError({ text: "not json", cause: new Error("bad") }),
      )
      .mockResolvedValue("ok");
    const result = await withLLMRetry("text_to_recipe", "fake-model", fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("retries after TypeValidationError and returns success", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(
        TypeValidationError.wrap({ value: {}, cause: new Error("bad shape") }),
      )
      .mockResolvedValue("ok");
    const result = await withLLMRetry("text_to_recipe", "fake-model", fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("retries after NoOutputGeneratedError and returns success", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new NoOutputGeneratedError())
      .mockResolvedValue("ok");
    const result = await withLLMRetry("text_to_recipe", "fake-model", fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("counts no_output retries and exhaustion under the no_output reason", async () => {
    const attemptSpy = vi.spyOn(metrics.llmRetryAttempt, "inc");
    const exhaustedSpy = vi.spyOn(metrics.llmRetryExhausted, "inc");

    const fn = vi.fn().mockRejectedValue(new NoOutputGeneratedError());
    await expect(
      withLLMRetry("text_to_nutrition", "fake-model", fn),
    ).rejects.toBeDefined();

    expect(fn).toHaveBeenCalledTimes(3);
    expect(attemptSpy).toHaveBeenCalledWith({
      category: "text_to_nutrition",
      reason: "no_output",
    });
    expect(exhaustedSpy).toHaveBeenCalledWith({
      category: "text_to_nutrition",
      reason: "no_output",
    });

    attemptSpy.mockRestore();
    exhaustedSpy.mockRestore();
  });

  it("does not retry transport errors, which the AI SDK already retries", async () => {
    const apiError = new APICallError({
      message: "rate limited",
      url: "https://example.com",
      requestBodyValues: {},
      statusCode: 429,
    });
    const fn = vi.fn().mockRejectedValue(apiError);
    await expect(withLLMRetry("text_to_recipe", "fake-model", fn)).rejects.toBe(
      apiError,
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("counts each retry attempt, and counts an exhaustion only when it gives up", async () => {
    const attemptSpy = vi.spyOn(metrics.llmRetryAttempt, "inc");
    const exhaustedSpy = vi.spyOn(metrics.llmRetryExhausted, "inc");

    const recovering = vi
      .fn()
      .mockRejectedValueOnce(makeNoObjectError())
      .mockResolvedValue("ok");
    await withLLMRetry("text_to_recipe", "fake-model", recovering);

    expect(attemptSpy).toHaveBeenCalledTimes(1);
    expect(attemptSpy).toHaveBeenCalledWith({
      category: "text_to_recipe",
      reason: "no_object",
    });
    expect(exhaustedSpy).not.toHaveBeenCalled();

    attemptSpy.mockClear();

    const failing = vi.fn().mockRejectedValue(makeNoObjectError());
    await expect(
      withLLMRetry("vision_to_recipe", "fake-model", failing),
    ).rejects.toBeDefined();

    expect(attemptSpy).toHaveBeenCalledTimes(2);
    expect(exhaustedSpy).toHaveBeenCalledTimes(1);
    expect(exhaustedSpy).toHaveBeenCalledWith({
      category: "vision_to_recipe",
      reason: "no_object",
    });

    attemptSpy.mockRestore();
    exhaustedSpy.mockRestore();
  });

  it("does not count transport errors as retries", async () => {
    const attemptSpy = vi.spyOn(metrics.llmRetryAttempt, "inc");
    const exhaustedSpy = vi.spyOn(metrics.llmRetryExhausted, "inc");

    const fn = vi.fn().mockRejectedValue(new Error("socket hang up"));
    await expect(
      withLLMRetry("text_to_recipe", "fake-model", fn),
    ).rejects.toBeDefined();

    expect(attemptSpy).not.toHaveBeenCalled();
    expect(exhaustedSpy).not.toHaveBeenCalled();

    attemptSpy.mockRestore();
    exhaustedSpy.mockRestore();
  });

  it("starts at temperature 0 and increases it on each retry", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(makeNoObjectError())
      .mockRejectedValueOnce(makeNoObjectError())
      .mockResolvedValue("ok");
    await withLLMRetry("text_to_recipe", "fake-model", fn);
    expect(fn).toHaveBeenNthCalledWith(1, 0, expect.any(Function));
    expect(fn).toHaveBeenNthCalledWith(2, 0.3, expect.any(Function));
    expect(fn).toHaveBeenNthCalledWith(3, 0.6, expect.any(Function));
  });

  it("waits ~400ms between attempts", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(makeNoObjectError())
      .mockResolvedValue("ok");
    const start = Date.now();
    await withLLMRetry("text_to_recipe", "fake-model", fn);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(380);
    expect(elapsed).toBeLessThan(800);
  });

  it("records each attempt outcome with the provider that served it", async () => {
    const resultSpy = vi.spyOn(metrics.llmResult, "inc");

    let attempt = 0;
    await withLLMRetry("text_to_recipe", "fake-model", async (_, onStepEnd) => {
      attempt++;
      if (attempt === 1) {
        onStepEnd({ providerMetadata: { openrouter: { provider: "Relace" } } });
        throw makeNoObjectError();
      }
      onStepEnd({
        providerMetadata: { openrouter: { provider: "Fireworks" } },
      });
      return "ok";
    });

    expect(resultSpy).toHaveBeenNthCalledWith(1, {
      category: "text_to_recipe",
      model: "fake-model",
      provider: "relace",
      outcome: "no_object",
    });
    expect(resultSpy).toHaveBeenNthCalledWith(2, {
      category: "text_to_recipe",
      model: "fake-model",
      provider: "fireworks",
      outcome: "ok",
    });

    resultSpy.mockRestore();
  });

  it("records an empty outcome when isEmpty matches the result", async () => {
    const resultSpy = vi.spyOn(metrics.llmResult, "inc");

    await withLLMRetry(
      "text_to_recipe",
      "fake-model",
      async () => "",
      (result) => !result,
    );

    expect(resultSpy).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "unknown", outcome: "empty" }),
    );

    resultSpy.mockRestore();
  });

  it("records an error outcome for errors that are not retried", async () => {
    const resultSpy = vi.spyOn(metrics.llmResult, "inc");

    await expect(
      withLLMRetry("text_to_recipe", "fake-model", async () => {
        throw new Error("socket hang up");
      }),
    ).rejects.toBeDefined();

    expect(resultSpy).toHaveBeenCalledTimes(1);
    expect(resultSpy).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "unknown", outcome: "error" }),
    );

    resultSpy.mockRestore();
  });
});
