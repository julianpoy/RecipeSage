import { NoOutputGeneratedError } from "ai";
import { withLLMRetry, type LLMRetryCategory } from "./withLLMRetry";

export async function withLLMRetryOptional<T>(
  category: LLMRetryCategory,
  model: string,
  fn: Parameters<typeof withLLMRetry<T>>[2],
  isEmpty?: (result: T) => boolean,
): Promise<T | undefined> {
  try {
    return await withLLMRetry(category, model, fn, isEmpty);
  } catch (err) {
    if (NoOutputGeneratedError.isInstance(err)) return undefined;
    throw err;
  }
}
