import { describe, it, expect } from "vitest";
import { z } from "zod";
import { aiStructuredModel } from "./aiStructuredModel";

describe("aiStructuredModel", () => {
  it("resolves a json schema with nullable unions collapsed to type arrays", async () => {
    const model = aiStructuredModel(
      z.object({ calories: z.number().nullable() }),
    );
    const resolved = await model.jsonSchema;
    expect(resolved.properties?.calories).toEqual({ type: ["number", "null"] });
  });

  it("collapses the nested union zod emits for a nullable multi-type field", async () => {
    const model = aiStructuredModel(
      z.object({ amount: z.union([z.string(), z.number()]).nullable() }),
    );
    const resolved = await model.jsonSchema;
    expect(resolved.properties?.amount).toEqual({
      type: ["string", "number", "null"],
    });
  });

  it("validates valid input through the underlying zod schema", async () => {
    const model = aiStructuredModel(
      z.object({ calories: z.number().nullable() }),
    );
    expect(await model.validate?.({ calories: 5 })).toEqual({
      success: true,
      value: { calories: 5 },
    });
  });

  it("rejects invalid input through the underlying zod schema", async () => {
    const model = aiStructuredModel(
      z.object({ calories: z.number().nullable() }),
    );
    const result = await model.validate?.({ calories: "not-a-number" });
    expect(result?.success).toBe(false);
  });
});
