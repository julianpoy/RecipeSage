import { setTimeout } from "node:timers/promises";
import {
  EmptyResponseBodyError,
  JSONParseError,
  NoObjectGeneratedError,
  NoOutputGeneratedError,
  TypeValidationError,
} from "ai";
import { metrics } from "../general/metrics";
import { createLLMResultRecorder } from "./createLLMResultRecorder";

const MAX_ATTEMPTS = 3;
const RETRY_WAIT_MS = 400;
const RETRY_TEMPERATURE_STEP = 0.3;

const retryTemperature = (attempt: number) => attempt * RETRY_TEMPERATURE_STEP;

export type LLMRetryCategory =
  | "text_to_recipe"
  | "text_to_nutrition"
  | "vision_to_recipe"
  | "moderate_discover_recipe";

const retryReason = (error: unknown): string | undefined => {
  if (NoObjectGeneratedError.isInstance(error)) return "no_object";
  if (NoOutputGeneratedError.isInstance(error)) return "no_output";
  if (EmptyResponseBodyError.isInstance(error)) return "empty_response";
  if (JSONParseError.isInstance(error)) return "json_parse";
  if (TypeValidationError.isInstance(error)) return "type_validation";
  return undefined;
};

export async function withLLMRetry<T>(
  category: LLMRetryCategory,
  model: string,
  fn: (
    temperature: number,
    onStepEnd: ReturnType<typeof createLLMResultRecorder>["onStepEnd"],
  ) => Promise<T>,
  isEmpty?: (result: T) => boolean,
): Promise<T> {
  let attempt = 0;
  while (true) {
    const resultRecorder = createLLMResultRecorder(category, model);
    try {
      const result = await fn(
        retryTemperature(attempt),
        resultRecorder.onStepEnd,
      );
      resultRecorder.record(isEmpty?.(result) ? "empty" : "ok");
      return result;
    } catch (err) {
      attempt++;
      const reason = retryReason(err);
      resultRecorder.record(reason ?? "error");
      if (!reason) throw err;

      if (attempt >= MAX_ATTEMPTS) {
        metrics.llmRetryExhausted.inc({ category, reason });
        throw err;
      }

      metrics.llmRetryAttempt.inc({ category, reason });
      await setTimeout(RETRY_WAIT_MS);
    }
  }
}
