import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { z, ZodError } from "zod";

const { captureExceptionMock } = vi.hoisted(() => ({
  captureExceptionMock: vi.fn(),
}));

vi.mock("@recipesage/util/server/general", () => ({
  validateSession: vi.fn(),
  extendSession: vi.fn(),
}));

vi.mock("@sentry/node", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sentry/node")>();
  return {
    ...actual,
    captureException: captureExceptionMock,
  };
});

import { AuthenticationEnforcement } from "./authenticationEnforcement";
import { defineHandler } from "./defineHandler";

const buildApp = (
  handler: ReturnType<typeof defineHandler>,
): express.Express => {
  const app = express();
  app.post("/thing", ...handler);
  return app;
};

describe("defineHandler response validation", () => {
  beforeEach(() => {
    captureExceptionMock.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("reports an informative error to Sentry when the response fails validation", async () => {
    const handler = defineHandler(
      {
        schema: {
          response: z.object({
            jobId: z.string(),
          }),
        },
        authentication: AuthenticationEnforcement.None,
        openapi: {
          operationId: "import-importPaprika",
          method: "post",
          path: "/import/job/paprika",
          tags: ["import"],
          summary: "Import recipes from a Paprika export",
        },
      },
      async () => ({
        statusCode: 200,
        data: { jobId: 123 },
      }),
    );

    const response = await request(buildApp(handler)).post("/thing");

    expect(response.status).toBe(500);
    expect(captureExceptionMock).toHaveBeenCalledOnce();

    const captured = captureExceptionMock.mock.calls[0][0];
    if (!(captured instanceof Error)) {
      throw new Error("expected an Error to be captured");
    }
    expect(captured.message).toContain("POST /import/job/paprika");
    expect(captured.cause).toBeInstanceOf(ZodError);
  });

  it("sends the validated response and does not report to Sentry on success", async () => {
    const handler = defineHandler(
      {
        schema: {
          response: z.object({
            jobId: z.string(),
          }),
        },
        authentication: AuthenticationEnforcement.None,
      },
      async () => ({
        statusCode: 201,
        data: { jobId: "abc", extra: "stripped" },
      }),
    );

    const response = await request(buildApp(handler)).post("/thing");

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ jobId: "abc" });
    expect(captureExceptionMock).not.toHaveBeenCalled();
  });
});
