import { describe, it, expect } from "vitest";
import type { JSONSchema7 } from "ai";
import { nullableUnionsToTypeArrays } from "./nullableUnionsToTypeArrays";

describe("nullableUnionsToTypeArrays", () => {
  it("collapses a nullable number union into a type array, preserving description", () => {
    const result = nullableUnionsToTypeArrays({
      anyOf: [{ type: "number" }, { type: "null" }],
      description: "Calories per serving in kcal",
    });
    expect(result).toEqual({
      type: ["number", "null"],
      description: "Calories per serving in kcal",
    });
  });

  it("collapses a nullable string union into a type array", () => {
    const result = nullableUnionsToTypeArrays({
      anyOf: [{ type: "string" }, { type: "null" }],
    });
    expect(result).toEqual({ type: ["string", "null"] });
  });

  it("collapses nullable unions nested within object properties", () => {
    const result = nullableUnionsToTypeArrays({
      type: "object",
      additionalProperties: false,
      required: ["servingSize", "calories"],
      properties: {
        servingSize: { anyOf: [{ type: "string" }, { type: "null" }] },
        calories: {
          anyOf: [{ type: "number" }, { type: "null" }],
          description: "Calories",
        },
      },
    });
    expect(result).toEqual({
      type: "object",
      additionalProperties: false,
      required: ["servingSize", "calories"],
      properties: {
        servingSize: { type: ["string", "null"] },
        calories: { type: ["number", "null"], description: "Calories" },
      },
    });
  });

  it("collapses nullable unions inside array items", () => {
    const result = nullableUnionsToTypeArrays({
      type: "array",
      items: { anyOf: [{ type: "number" }, { type: "null" }] },
    });
    expect(result).toEqual({
      type: "array",
      items: { type: ["number", "null"] },
    });
  });

  it("collapses nullable unions inside tuple items", () => {
    const result = nullableUnionsToTypeArrays({
      type: "array",
      items: [
        { anyOf: [{ type: "string" }, { type: "null" }] },
        { type: "number" },
      ],
    });
    expect(result).toEqual({
      type: "array",
      items: [{ type: ["string", "null"] }, { type: "number" }],
    });
  });

  it("collapses the nested union that zod emits for .union([...]).nullable()", () => {
    const result = nullableUnionsToTypeArrays({
      anyOf: [
        { anyOf: [{ type: "string" }, { type: "number" }] },
        { type: "null" },
      ],
      description: "Amount, either a label or a value",
    });
    expect(result).toEqual({
      type: ["string", "number", "null"],
      description: "Amount, either a label or a value",
    });
  });

  it("preserves member-level keywords and parent description on a nullable enum", () => {
    const result = nullableUnionsToTypeArrays({
      anyOf: [{ type: "string", enum: ["a", "b"] }, { type: "null" }],
      description: "One of the allowed choices",
    });
    expect(result).toEqual({
      type: ["string", "null"],
      enum: ["a", "b"],
      description: "One of the allowed choices",
    });
  });

  it("leaves a non-nullable schema untouched", () => {
    const schema: JSONSchema7 = {
      type: "object",
      properties: { calories: { type: "number" } },
    };
    expect(nullableUnionsToTypeArrays(schema)).toEqual(schema);
  });

  it("leaves a non-nullable primitive union as anyOf", () => {
    const schema: JSONSchema7 = {
      anyOf: [{ type: "string" }, { type: "number" }],
    };
    expect(nullableUnionsToTypeArrays(schema)).toEqual(schema);
  });

  it("collapses a nullable object and recurses into its nested nullable properties", () => {
    const result = nullableUnionsToTypeArrays({
      anyOf: [
        {
          type: "object",
          additionalProperties: false,
          required: ["calories"],
          properties: {
            calories: { anyOf: [{ type: "number" }, { type: "null" }] },
          },
        },
        { type: "null" },
      ],
    });
    expect(result).toEqual({
      type: ["object", "null"],
      additionalProperties: false,
      required: ["calories"],
      properties: { calories: { type: ["number", "null"] } },
    });
  });

  it("collapses a nullable union of multiple primitives into a single type array, preserving description", () => {
    const result = nullableUnionsToTypeArrays({
      anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
      description: "Amount, either a label or a value",
    });
    expect(result).toEqual({
      type: ["string", "number", "null"],
      description: "Amount, either a label or a value",
    });
  });

  it("does not collapse a union of two non-null types but recurses into members", () => {
    const result = nullableUnionsToTypeArrays({
      anyOf: [
        {
          type: "object",
          properties: { a: { anyOf: [{ type: "number" }, { type: "null" }] } },
        },
        { type: "string" },
      ],
    });
    expect(result).toEqual({
      anyOf: [
        { type: "object", properties: { a: { type: ["number", "null"] } } },
        { type: "string" },
      ],
    });
  });

  it("leaves a nullable union of non-primitive members as anyOf while recursing into them", () => {
    const result = nullableUnionsToTypeArrays({
      anyOf: [
        {
          type: "object",
          properties: { a: { anyOf: [{ type: "number" }, { type: "null" }] } },
        },
        { type: "string" },
        { type: "null" },
      ],
    });
    expect(result).toEqual({
      anyOf: [
        { type: "object", properties: { a: { type: ["number", "null"] } } },
        { type: "string" },
        { type: "null" },
      ],
    });
  });
});
