import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

const documentToRecipeMock = vi.fn();

vi.mock("@recipesage/util/server/ml", () => ({
  documentToRecipe: (...args: unknown[]) => documentToRecipeMock(...args),
}));

vi.mock("@recipesage/util/server/general", async () => {
  class ExtractTextFromDocumentError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "ExtractTextFromDocumentError";
    }
  }
  return {
    validateSession: vi.fn(async () => ({
      id: "session-id",
      userId: "user-id",
    })),
    extendSession: vi.fn(),
    assertCreditsAvailable: vi.fn(),
    recordCreditsSpent: vi.fn(),
    isRecipeRecognitionSuccess: vi.fn(() => true),
    multerAutoCleanup: (
      _req: express.Request,
      _res: express.Response,
      next: express.NextFunction,
    ) => next(),
    isExtractableDocumentExtension: (extension: string) =>
      [
        ".docx",
        ".rtf",
        ".odt",
        ".md",
        ".markdown",
        ".html",
        ".htm",
        ".org",
      ].includes(extension.toLowerCase()),
    ExtractTextFromDocumentError,
  };
});

const buildApp = async () => {
  const { mlRouter } = await import("./index");
  const app = express();
  app.use("/ml", mlRouter);
  return app;
};

describe("POST /ml/getRecipeFromDocument", () => {
  beforeEach(() => {
    documentToRecipeMock.mockReset();
  });

  it("returns the recognized recipe for a supported document", async () => {
    const recognized = {
      recipe: {
        title: "Pancakes",
        ingredients: "flour\nmilk",
        instructions: "mix\ncook",
      },
      images: [],
      labels: [],
    };
    documentToRecipeMock.mockResolvedValue(recognized);

    const app = await buildApp();
    const response = await request(app)
      .post("/ml/getRecipeFromDocument")
      .set("Authorization", "Bearer token")
      .attach("file", Buffer.from("Pancake recipe"), {
        filename: "recipe.docx",
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(recognized);
    expect(documentToRecipeMock).toHaveBeenCalledOnce();
    const filePath = documentToRecipeMock.mock.calls[0][0];
    expect(filePath).toMatch(/\.docx$/);
  });

  it("returns 400 when the file is missing", async () => {
    const app = await buildApp();
    const response = await request(app)
      .post("/ml/getRecipeFromDocument")
      .set("Authorization", "Bearer token");

    expect(response.status).toBe(400);
    expect(documentToRecipeMock).not.toHaveBeenCalled();
  });

  it("returns 400 for unsupported extensions", async () => {
    const app = await buildApp();
    const response = await request(app)
      .post("/ml/getRecipeFromDocument")
      .set("Authorization", "Bearer token")
      .attach("file", Buffer.from("not a recipe"), {
        filename: "recipe.pages",
        contentType: "application/octet-stream",
      });

    expect(response.status).toBe(400);
    expect(documentToRecipeMock).not.toHaveBeenCalled();
  });

  it("accepts .txt files", async () => {
    const recognized = {
      recipe: { title: "Notes", ingredients: "", instructions: "" },
      images: [],
      labels: [],
    };
    documentToRecipeMock.mockResolvedValue(recognized);

    const app = await buildApp();
    const response = await request(app)
      .post("/ml/getRecipeFromDocument")
      .set("Authorization", "Bearer token")
      .attach("file", Buffer.from("plain text recipe"), {
        filename: "recipe.txt",
        contentType: "text/plain",
      });

    expect(response.status).toBe(200);
    expect(documentToRecipeMock).toHaveBeenCalledOnce();
    const filePath = documentToRecipeMock.mock.calls[0][0];
    expect(filePath).toMatch(/\.txt$/);
  });

  it("returns 400 when parsing yields no recipe", async () => {
    documentToRecipeMock.mockResolvedValue(undefined);

    const app = await buildApp();
    const response = await request(app)
      .post("/ml/getRecipeFromDocument")
      .set("Authorization", "Bearer token")
      .attach("file", Buffer.from("blank doc"), {
        filename: "recipe.md",
        contentType: "text/markdown",
      });

    expect(response.status).toBe(400);
    expect(documentToRecipeMock).toHaveBeenCalledOnce();
  });

  it("returns 400 when extraction throws ExtractTextFromDocumentError", async () => {
    const { ExtractTextFromDocumentError } =
      await import("@recipesage/util/server/general");
    documentToRecipeMock.mockRejectedValue(
      new ExtractTextFromDocumentError("pandoc failed"),
    );

    const app = await buildApp();
    const response = await request(app)
      .post("/ml/getRecipeFromDocument")
      .set("Authorization", "Bearer token")
      .attach("file", Buffer.from("corrupt doc"), {
        filename: "recipe.docx",
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

    expect(response.status).toBe(400);
    expect(documentToRecipeMock).toHaveBeenCalledOnce();
  });

  it("rethrows non-ExtractTextFromDocumentError errors as 500", async () => {
    documentToRecipeMock.mockRejectedValue(new Error("unexpected"));

    const app = await buildApp();
    const response = await request(app)
      .post("/ml/getRecipeFromDocument")
      .set("Authorization", "Bearer token")
      .attach("file", Buffer.from("doc"), {
        filename: "recipe.docx",
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

    expect(response.status).toBe(500);
    expect(documentToRecipeMock).toHaveBeenCalledOnce();
  });
});
