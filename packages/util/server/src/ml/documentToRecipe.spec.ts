import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const extractTextFromDocumentMock = vi.fn();
const textToRecipeMock = vi.fn();

vi.mock("../general/extractTextFromDocument", () => ({
  extractTextFromDocument: (...args: unknown[]) =>
    extractTextFromDocumentMock(...args),
}));

vi.mock("./textToRecipe", () => ({
  TextToRecipeInputType: {
    OCR: "OCR",
    Document: "Document",
    Text: "Text",
    Webpage: "Webpage",
  },
  textToRecipe: (...args: unknown[]) => textToRecipeMock(...args),
}));

describe("documentToRecipe", () => {
  beforeEach(() => {
    extractTextFromDocumentMock.mockReset();
    textToRecipeMock.mockReset();
  });

  it("extracts text from the document and passes it to textToRecipe", async () => {
    extractTextFromDocumentMock.mockResolvedValue("Cookies\n\nFlour, sugar");
    const recipe = {
      recipe: { title: "Cookies" },
      images: [],
      labels: [],
    };
    textToRecipeMock.mockResolvedValue(recipe);

    const { documentToRecipe } = await import("./documentToRecipe");
    const { TextToRecipeInputType } = await import("./textToRecipe");

    const result = await documentToRecipe("/tmp/recipe.docx");

    expect(extractTextFromDocumentMock).toHaveBeenCalledWith(
      "/tmp/recipe.docx",
    );
    expect(textToRecipeMock).toHaveBeenCalledWith(
      "Cookies\n\nFlour, sugar",
      TextToRecipeInputType.Document,
    );
    expect(result).toBe(recipe);
  });

  it("propagates extractTextFromDocument errors", async () => {
    extractTextFromDocumentMock.mockRejectedValue(new Error("pandoc failed"));

    const { documentToRecipe } = await import("./documentToRecipe");

    await expect(documentToRecipe("/tmp/bad.docx")).rejects.toThrow(
      "pandoc failed",
    );
    expect(textToRecipeMock).not.toHaveBeenCalled();
  });

  it("returns undefined when textToRecipe returns undefined", async () => {
    extractTextFromDocumentMock.mockResolvedValue("too short");
    textToRecipeMock.mockResolvedValue(undefined);

    const { documentToRecipe } = await import("./documentToRecipe");

    const result = await documentToRecipe("/tmp/short.md");
    expect(result).toBeUndefined();
  });

  describe("with a .txt file", () => {
    let workDir: string;

    beforeEach(async () => {
      workDir = await mkdtemp(join(tmpdir(), "documentToRecipe-spec-"));
    });

    afterEach(async () => {
      await rm(workDir, { recursive: true, force: true });
    });

    it("reads the file directly and skips pandoc", async () => {
      const path = join(workDir, "recipe.txt");
      await writeFile(path, "Pancakes\n\nFlour, milk\n\nMix and cook.\n");

      const recipe = {
        recipe: { title: "Pancakes" },
        images: [],
        labels: [],
      };
      textToRecipeMock.mockResolvedValue(recipe);

      const { documentToRecipe } = await import("./documentToRecipe");
      const { TextToRecipeInputType } = await import("./textToRecipe");

      const result = await documentToRecipe(path);

      expect(extractTextFromDocumentMock).not.toHaveBeenCalled();
      expect(textToRecipeMock).toHaveBeenCalledWith(
        "Pancakes\n\nFlour, milk\n\nMix and cook.\n",
        TextToRecipeInputType.Document,
      );
      expect(result).toBe(recipe);
    });
  });
});
