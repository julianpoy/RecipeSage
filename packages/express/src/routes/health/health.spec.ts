import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { prisma } from "@recipesage/prisma";
import { healthRouter } from "./index";

const buildApp = () => {
  const app = express();
  app.use("/", healthRouter);
  return app;
};

describe("GET /health", () => {
  beforeEach(() => {
    vi.spyOn(prisma, "$queryRaw");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports every dependency as healthy when the database responds", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ "?column?": 1 }]);

    const response = await request(buildApp()).get("/health");

    expect(response.status).toEqual(200);
    expect(response.body).toEqual({ prisma: true });
  });

  it("reports a 500 with the failing dependency when the database is down", async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValue(
      new Error("connection refused"),
    );

    const response = await request(buildApp()).get("/health");

    expect(response.status).toEqual(500);
    expect(response.body).toEqual({ prisma: false });
  });

  it("does not log the database error", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    vi.mocked(prisma.$queryRaw).mockRejectedValue(
      new Error("connection refused"),
    );

    await request(buildApp()).get("/health");

    expect(consoleError).not.toHaveBeenCalled();
  });
});
