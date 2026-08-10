import { NoOutputGeneratedError } from "ai";
import { withLLMRetry, type LLMRetryCategory } from "./withLLMRetry";

export async function withLLMRetryOptional<T>(
  category: LLMRetryCategory,
  fn: (temperature: number) => Promise<T>,
): Promise<T | undefined> {
  try {
    return await withLLMRetry(category, fn);
  } catch (err) {
    if (NoOutputGeneratedError.isInstance(err)) return undefined;
    throw err;
  }
}
