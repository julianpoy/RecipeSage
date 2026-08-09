import { setTimeout } from "node:timers/promises";
import {
  EmptyResponseBodyError,
  JSONParseError,
  NoObjectGeneratedError,
  NoOutputGeneratedError,
  TypeValidationError,
} from "ai";
import { metrics } from "../general/metrics";

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
  fn: (temperature: number) => Promise<T>,
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn(retryTemperature(attempt));
    } catch (err) {
      attempt++;
      const reason = retryReason(err);
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
