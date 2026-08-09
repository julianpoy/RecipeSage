import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import bodyParser from "body-parser";
import request from "supertest";

const clipUrlMock = vi.fn();
const clipHtmlMock = vi.fn();

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
    clipHtml: (...args: unknown[]) => clipHtmlMock(...args),
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

describe("POST /clip", () => {
  beforeEach(() => {
    clipUrlMock.mockReset();
    clipHtmlMock.mockReset();
  });

  describe("with url body", () => {
    it("returns flattened recipe with imageURL for a url", async () => {
      clipUrlMock.mockResolvedValue({
        recipe: {
          title: "Tacos",
          ingredients: "tortilla\nbeef",
          instructions: "cook\nassemble",
        },
        images: ["https://example.com/taco.jpg"],
        labels: [],
      });

      const app = await buildApp();
      const response = await request(app)
        .post("/clip")
        .set("Authorization", "Bearer token")
        .send({ url: "https://example.com/taco" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        title: "Tacos",
        ingredients: "tortilla\nbeef",
        instructions: "cook\nassemble",
        imageURL: "https://example.com/taco.jpg",
      });
      expect(clipUrlMock).toHaveBeenCalledWith("https://example.com/taco");
      expect(clipHtmlMock).not.toHaveBeenCalled();
    });

    it("trims the url before clipping", async () => {
      clipUrlMock.mockResolvedValue({
        recipe: { title: "" },
        images: [],
        labels: [],
      });

      const app = await buildApp();
      await request(app)
        .post("/clip")
        .set("Authorization", "Bearer token")
        .send({ url: "  https://example.com/a  " });

      expect(clipUrlMock).toHaveBeenCalledWith("https://example.com/a");
    });

    it("returns 400 when clipUrl throws ClipTimeoutError", async () => {
      const { ClipTimeoutError } =
        await import("@recipesage/util/server/general");
      clipUrlMock.mockRejectedValue(new ClipTimeoutError());

      const app = await buildApp();
      const response = await request(app)
        .post("/clip")
        .set("Authorization", "Bearer token")
        .send({ url: "https://example.com/slow" });

      expect(response.status).toBe(400);
    });

    it("returns 400 when clipUrl throws ClipFetchError", async () => {
      const { ClipFetchError } =
        await import("@recipesage/util/server/general");
      clipUrlMock.mockRejectedValue(new ClipFetchError());

      const app = await buildApp();
      const response = await request(app)
        .post("/clip")
        .set("Authorization", "Bearer token")
        .send({ url: "https://example.com/no" });

      expect(response.status).toBe(400);
    });

    it("prefers url over html when both are provided", async () => {
      clipUrlMock.mockResolvedValue({
        recipe: { title: "FromUrl" },
        images: [],
        labels: [],
      });

      const app = await buildApp();
      const response = await request(app)
        .post("/clip")
        .set("Authorization", "Bearer token")
        .send({ url: "https://example.com/r", html: "<html></html>" });

      expect(response.status).toBe(200);
      expect(clipUrlMock).toHaveBeenCalledOnce();
      expect(clipHtmlMock).not.toHaveBeenCalled();
    });
  });

  describe("with html body", () => {
    it("returns flattened recipe with imageURL on success", async () => {
      clipHtmlMock.mockResolvedValue({
        recipe: {
          title: "Soup",
          ingredients: "broth\nveg",
          instructions: "simmer",
        },
        images: ["https://example.com/soup.jpg"],
        labels: [],
      });

      const app = await buildApp();
      const response = await request(app)
        .post("/clip")
        .set("Authorization", "Bearer token")
        .send({ html: "<html><body>recipe</body></html>" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        title: "Soup",
        ingredients: "broth\nveg",
        instructions: "simmer",
        imageURL: "https://example.com/soup.jpg",
      });
      expect(clipHtmlMock).toHaveBeenCalledWith(
        "<html><body>recipe</body></html>",
      );
    });

    it("returns empty imageURL when images array is empty", async () => {
      clipHtmlMock.mockResolvedValue({
        recipe: { title: "NoImage" },
        images: [],
        labels: [],
      });

      const app = await buildApp();
      const response = await request(app)
        .post("/clip")
        .set("Authorization", "Bearer token")
        .send({ html: "<html></html>" });

      expect(response.status).toBe(200);
      expect(response.body.imageURL).toBe("");
    });
  });

  it("returns 400 when neither url nor html are provided", async () => {
    const app = await buildApp();
    const response = await request(app)
      .post("/clip")
      .set("Authorization", "Bearer token")
      .send({});

    expect(response.status).toBe(400);
    expect(clipUrlMock).not.toHaveBeenCalled();
    expect(clipHtmlMock).not.toHaveBeenCalled();
  });

  it("returns 400 when url and html are both empty/whitespace", async () => {
    const app = await buildApp();
    const response = await request(app)
      .post("/clip")
      .set("Authorization", "Bearer token")
      .send({ url: "  ", html: "  " });

    expect(response.status).toBe(400);
    expect(clipUrlMock).not.toHaveBeenCalled();
    expect(clipHtmlMock).not.toHaveBeenCalled();
  });
});
