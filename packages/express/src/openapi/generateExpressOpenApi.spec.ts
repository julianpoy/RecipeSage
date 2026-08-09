import { describe, it, expect } from "vitest";
import { oas31 } from "zod-openapi";
import "../routes";
import { generateExpressOpenApiParts } from "./generateExpressOpenApi";

const parts = generateExpressOpenApiParts();

const requestSchema = (
  operation: oas31.OperationObject | undefined,
  mediaType: string,
) => {
  const requestBody = operation?.requestBody;
  if (!requestBody || !("content" in requestBody)) {
    return undefined;
  }
  return requestBody.content[mediaType]?.schema;
};

describe("generateExpressOpenApiParts", () => {
  it("documents the clip endpoints with bearer security", () => {
    const get = parts.paths["/clip"]?.get;
    const post = parts.paths["/clip"]?.post;

    expect(get?.security).toEqual([{ Authorization: [] }]);
    expect(post?.security).toEqual([{ Authorization: [] }]);
    expect(get?.parameters).toBeDefined();
    expect(get?.responses?.["200"]).toBeDefined();
  });

  it("documents a file-upload import as multipart with a binary file", () => {
    const post = parts.paths["/import/job/paprika"]?.post;

    expect(requestSchema(post, "multipart/form-data")).toEqual({
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
      },
      required: ["file"],
    });
    expect(post?.responses?.["201"]).toBeDefined();
  });

  it("documents a JSON-body import as application/json", () => {
    const post = parts.paths["/import/job/urls"]?.post;

    expect(requestSchema(post, "application/json")).toBeDefined();
    expect(requestSchema(post, "multipart/form-data")).toBeUndefined();
  });

  it("documents a multi-file OCR upload as an array of binaries", () => {
    const post = parts.paths["/ml/getRecipeFromOCR"]?.post;

    expect(requestSchema(post, "multipart/form-data")).toEqual({
      type: "object",
      properties: {
        file: {
          type: "array",
          items: { type: "string", format: "binary" },
        },
      },
      required: ["file"],
    });
  });

  it("declares the bearer security scheme", () => {
    expect(parts.securitySchemes.Authorization).toEqual({
      type: "http",
      scheme: "bearer",
    });
  });

  it("does not document excluded routes", () => {
    const paths = Object.keys(parts.paths);
    expect(paths).not.toContain("/print/recipe/{recipeId}");
    expect(paths).not.toContain("/mealplans/{mealPlanId}/ical");
    expect(paths.some((path) => path.startsWith("/payments"))).toBe(false);
  });
});
