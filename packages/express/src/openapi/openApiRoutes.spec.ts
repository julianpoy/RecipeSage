import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { typesafeExpressIndexRouter } from "../routes";
import { getRegisteredOpenApiRoutes } from "./registry";

const app = express();
app.use("/", typesafeExpressIndexRouter);

describe("registered OpenAPI routes", () => {
  const routes = getRegisteredOpenApiRoutes();

  it("registers routes for the documented express endpoints", () => {
    expect(routes.length).toBeGreaterThanOrEqual(21);
  });

  it.each(routes.map((route) => route.openapi))(
    "mounts $method $path at its declared location",
    async (openapi) => {
      const response = await request(app)[openapi.method](openapi.path);
      expect(response.status).not.toBe(404);
    },
  );
});
