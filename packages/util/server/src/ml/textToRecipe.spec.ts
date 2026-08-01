import { describe, it, expect, vi, beforeEach } from "vitest";
import { NoOutputGeneratedError } from "ai";

const { generateTextMock } = vi.hoisted(() => ({
  generateTextMock: vi.fn(),
}));

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    generateText: (...args: unknown[]) => generateTextMock(...args),
  };
});

import { TextToRecipeInputType, textToRecipe } from "./textToRecipe";

const SAMPLE_TEXT = "A long enough block of recipe text";

describe("textToRecipe", () => {
  beforeEach(() => {
    generateTextMock.mockReset();
  });

  it("retries and returns undefined when the model never produces an output", async () => {
    generateTextMock.mockResolvedValue({
      get output(): never {
        throw new NoOutputGeneratedError();
      },
      totalUsage: { totalTokens: 10 },
    });

    const result = await textToRecipe(SAMPLE_TEXT, TextToRecipeInputType.Text);

    expect(result).toBeUndefined();
    expect(generateTextMock).toHaveBeenCalledTimes(3);
  });

  it("recovers when a later attempt produces an output", async () => {
    generateTextMock
      .mockResolvedValueOnce({
        get output(): never {
          throw new NoOutputGeneratedError();
        },
        totalUsage: { totalTokens: 10 },
      })
      .mockResolvedValue({
        output: { title: "Pancakes" },
        totalUsage: { totalTokens: 10 },
      });

    const result = await textToRecipe(SAMPLE_TEXT, TextToRecipeInputType.Text);

    expect(result?.recipe.title).toBe("Pancakes");
    expect(generateTextMock).toHaveBeenCalledTimes(2);
  });

  it("propagates non-retryable errors", async () => {
    generateTextMock.mockRejectedValue(new Error("boom"));

    await expect(
      textToRecipe(SAMPLE_TEXT, TextToRecipeInputType.Text),
    ).rejects.toThrow("boom");
  });
});
