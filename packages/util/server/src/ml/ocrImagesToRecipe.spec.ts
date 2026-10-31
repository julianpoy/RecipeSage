import { describe, it, expect, vi, beforeEach } from "vitest";

const { ocrImageBufferMock, visionToRecipeMock, textToRecipeMock } = vi.hoisted(
  () => ({
    ocrImageBufferMock: vi.fn(),
    visionToRecipeMock: vi.fn(),
    textToRecipeMock: vi.fn(),
  }),
);

vi.mock("../general", () => ({
  metrics: { convertImagesToRecipe: { inc: () => undefined } },
  transformImageBuffer: async (buffer: Buffer) => buffer,
  transformImageFile: async () => Buffer.from("file"),
  transformImageStreamToBuffer: async () => Buffer.from("stream"),
}));

vi.mock("../general/isFirebaseAvailable", () => ({
  IS_FIREBASE_AVAILABLE: true,
}));

vi.mock("./ocr", () => ({
  ocrImageBuffer: (...args: unknown[]) => ocrImageBufferMock(...args),
}));

vi.mock("./visionToRecipe", () => ({
  VisionToRecipeInputType: { Photo: 0, Document: 1 },
  visionToRecipe: (...args: unknown[]) => visionToRecipeMock(...args),
}));

vi.mock("./textToRecipe", () => ({
  OCR_MAX_VALID_TEXT: 20000,
  OCR_MIN_VALID_TEXT: 20,
  TextToRecipeInputType: { OCR: 0 },
  textToRecipe: (...args: unknown[]) => textToRecipeMock(...args),
}));

import { ocrImagesToRecipe } from "./ocrImagesToRecipe";
import { VisionToRecipeInputType } from "./visionToRecipe";
import { TextToRecipeInputType } from "./textToRecipe";

const OCR_TEXT = "Pancakes\n2 eggs\n1 cup flour\nMix and fry";

const recipeEntry = (ingredients: string, instructions: string) => ({
  recipe: { title: "Pancakes", ingredients, instructions },
  labels: [],
  images: [],
});

describe("ocrImagesToRecipe", () => {
  beforeEach(() => {
    ocrImageBufferMock.mockReset();
    visionToRecipeMock.mockReset();
    textToRecipeMock.mockReset();
    ocrImageBufferMock.mockResolvedValue([OCR_TEXT]);
  });

  it("returns the vision result and sends it the images and the OCR text", async () => {
    const image = Buffer.from("image");
    const visionResult = recipeEntry("2 eggs", "Mix and fry");
    visionToRecipeMock.mockResolvedValue(visionResult);

    const result = await ocrImagesToRecipe([image]);

    expect(result).toBe(visionResult);
    expect(visionToRecipeMock).toHaveBeenCalledWith(
      [image],
      VisionToRecipeInputType.Photo,
      OCR_TEXT,
    );
    expect(textToRecipeMock).not.toHaveBeenCalled();
  });

  it("passes the input type to the vision model", async () => {
    visionToRecipeMock.mockResolvedValue(recipeEntry("2 eggs", ""));

    await ocrImagesToRecipe(
      [Buffer.from("page")],
      VisionToRecipeInputType.Document,
    );

    expect(visionToRecipeMock).toHaveBeenCalledWith(
      expect.any(Array),
      VisionToRecipeInputType.Document,
      OCR_TEXT,
    );
  });

  it("returns nothing when the vision model finds no ingredients and no instructions", async () => {
    visionToRecipeMock.mockResolvedValue(recipeEntry(" ", ""));

    const result = await ocrImagesToRecipe([Buffer.from("image")]);

    expect(result).toBeUndefined();
    expect(textToRecipeMock).not.toHaveBeenCalled();
  });

  it("falls back to the OCR text when the vision model returns nothing", async () => {
    const textResult = recipeEntry("2 eggs", "Mix and fry");
    visionToRecipeMock.mockResolvedValue(undefined);
    textToRecipeMock.mockResolvedValue(textResult);

    const result = await ocrImagesToRecipe([Buffer.from("image")]);

    expect(result).toBe(textResult);
    expect(textToRecipeMock).toHaveBeenCalledWith(
      OCR_TEXT,
      TextToRecipeInputType.OCR,
    );
  });

  it("falls back to the OCR text when the vision model fails", async () => {
    const textResult = recipeEntry("2 eggs", "Mix and fry");
    visionToRecipeMock.mockRejectedValue(new Error("image too large"));
    textToRecipeMock.mockResolvedValue(textResult);

    const result = await ocrImagesToRecipe([Buffer.from("image")]);

    expect(result).toBe(textResult);
  });

  it("returns nothing when the OCR text fallback finds no ingredients and no instructions", async () => {
    visionToRecipeMock.mockResolvedValue(undefined);
    textToRecipeMock.mockResolvedValue({
      recipe: { title: "Clinic letterhead", notes: "Tel. 21 76 45" },
      labels: [],
      images: [],
    });

    const result = await ocrImagesToRecipe([Buffer.from("image")]);

    expect(result).toBeUndefined();
  });

  it("returns nothing without calling a model when the images have too little text", async () => {
    ocrImageBufferMock.mockResolvedValue(["Plate"]);

    const result = await ocrImagesToRecipe([Buffer.from("image")]);

    expect(result).toBeUndefined();
    expect(visionToRecipeMock).not.toHaveBeenCalled();
    expect(textToRecipeMock).not.toHaveBeenCalled();
  });
});
