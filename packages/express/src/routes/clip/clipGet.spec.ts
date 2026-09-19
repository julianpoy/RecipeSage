import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import bodyParser from "body-parser";
import request from "supertest";
import {
  ClipFetchError,
  ClipTimeoutError,
} from "@recipesage/util/server/general";

const clipUrlMock = vi.fn();

vi.mock("@recipesage/util/server/general", async () => {
  class ClipTimeoutError extends Error {
    constructor() {
      super();
      this.name = "ClipTimeoutError";
    }
  }
  class ClipFetchError extends Error {
    constructor() {
      super();
      this.name = "ClipFetchError";
    }
  }
  return {
    clipUrl: (...args: unknown[]) => clipUrlMock(...args),
    clipHtml: vi.fn(),
    ClipTimeoutError,
    ClipFetchError,
    validateSession: vi.fn(async () => ({
      id: "session-id",
      userId: "user-id",
    })),
    extendSession: vi.fn(),
    assertCreditsAvailable: vi.fn(),
    recordCreditsSpent: vi.fn(),
    isRecipeRecognitionSuccess: vi.fn(() => true),
  };
});

const buildApp = async () => {
  const { clipRouter } = await import("./index");
  const app = express();
  app.use(bodyParser.json());
  app.use("/clip", clipRouter);
  return app;
};

describe("GET /clip", () => {
  beforeEach(() => {
    clipUrlMock.mockReset();
  });

  it("returns flattened recipe with imageURL on success", async () => {
    clipUrlMock.mockResolvedValue({
      recipe: {
        title: "Pancakes",
        ingredients: "flour\nmilk",
        instructions: "mix\ncook",
      },
      images: ["https://example.com/img.jpg", "https://example.com/img2.jpg"],
      labels: [],
    });

    const app = await buildApp();
    const response = await request(app)
      .get("/clip")
      .set("Authorization", "Bearer token")
      .query({ url: "https://example.com/recipe" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      title: "Pancakes",
      ingredients: "flour\nmilk",
      instructions: "mix\ncook",
      imageURL: "https://example.com/img.jpg",
    });
    expect(clipUrlMock).toHaveBeenCalledWith("https://example.com/recipe");
  });

  it("returns empty imageURL when images array is empty", async () => {
    clipUrlMock.mockResolvedValue({
      recipe: { title: "No Image Recipe" },
      images: [],
      labels: [],
    });

    const app = await buildApp();
    const response = await request(app)
      .get("/clip")
      .set("Authorization", "Bearer token")
      .query({ url: "https://example.com/recipe" });

    expect(response.status).toBe(200);
    expect(response.body.imageURL).toBe("");
  });

  it("trims the URL before clipping", async () => {
    clipUrlMock.mockResolvedValue({
      recipe: { title: "Trimmed" },
      images: [],
      labels: [],
    });

    const app = await buildApp();
    await request(app)
      .get("/clip")
      .set("Authorization", "Bearer token")
      .query({ url: "   https://example.com/recipe   " });

    expect(clipUrlMock).toHaveBeenCalledWith("https://example.com/recipe");
  });

  it("returns 400 when url query param is missing", async () => {
    const app = await buildApp();
    const response = await request(app)
      .get("/clip")
      .set("Authorization", "Bearer token");

    expect(response.status).toBe(400);
    expect(clipUrlMock).not.toHaveBeenCalled();
  });

  it("returns 400 when url query param is empty", async () => {
    const app = await buildApp();
    const response = await request(app)
      .get("/clip")
      .set("Authorization", "Bearer token")
      .query({ url: "   " });

    expect(response.status).toBe(400);
    expect(clipUrlMock).not.toHaveBeenCalled();
  });

  it("returns 400 when clipUrl throws ClipTimeoutError", async () => {
    clipUrlMock.mockRejectedValue(new ClipTimeoutError());

    const app = await buildApp();
    const response = await request(app)
      .get("/clip")
      .set("Authorization", "Bearer token")
      .query({ url: "https://example.com/slow" });

    expect(response.status).toBe(400);
  });

  it("returns 400 when clipUrl throws ClipFetchError", async () => {
    clipUrlMock.mockRejectedValue(new ClipFetchError());

    const app = await buildApp();
    const response = await request(app)
      .get("/clip")
      .set("Authorization", "Bearer token")
      .query({ url: "https://example.com/unreachable" });

    expect(response.status).toBe(400);
  });

  it("returns 500 for unexpected errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    clipUrlMock.mockRejectedValue(new Error("boom"));

    const app = await buildApp();
    const response = await request(app)
      .get("/clip")
      .set("Authorization", "Bearer token")
      .query({ url: "https://example.com/broken" });

    expect(response.status).toBe(500);
  });
});
