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

describe("GET /healthz", () => {
  beforeEach(() => {
    vi.spyOn(prisma, "$queryRaw");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports healthy when the database responds", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ "?column?": 1 }]);

    const response = await request(buildApp()).get("/healthz");

    expect(response.status).toEqual(200);
    expect(response.text).toEqual("healthy");
  });

  it("reports unhealthy so the pod is rolled when the database is down", async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValue(
      new Error("connection refused"),
    );

    const response = await request(buildApp()).get("/healthz");

    expect(response.status).toEqual(500);
    expect(response.text).toEqual("unhealthy");
  });

  it("logs the database error rather than reporting it", async () => {
    const failure = new Error("connection refused");
    vi.mocked(prisma.$queryRaw).mockRejectedValue(failure);

    await request(buildApp()).get("/healthz");

    expect(console.error).toHaveBeenCalledWith(failure);
  });
});
