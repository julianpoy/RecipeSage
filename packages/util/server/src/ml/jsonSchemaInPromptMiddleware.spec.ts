import { describe, it, expect } from "vitest";
import { generateText, Output, wrapLanguageModel } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { z } from "zod";
import { aiStructuredModel } from "./aiStructuredModel";
import { jsonSchemaInPromptMiddleware } from "./jsonSchemaInPromptMiddleware";

const schema = aiStructuredModel(
  z.object({
    ingredients: z.string().nullable().describe("A list of ingredients"),
  }),
);

const createMockModel = () =>
  new MockLanguageModelV4({
    doGenerate: {
      content: [{ type: "text", text: '{"ingredients":"2 eggs"}' }],
      finishReason: { unified: "stop", raw: "stop" },
      usage: {
        inputTokens: {
          total: 1,
          noCache: 1,
          cacheRead: undefined,
          cacheWrite: undefined,
        },
        outputTokens: { total: 1, text: 1, reasoning: undefined },
      },
      warnings: [],
    },
  });

const wrap = (model: MockLanguageModelV4) =>
  wrapLanguageModel({ model, middleware: jsonSchemaInPromptMiddleware });

describe("jsonSchemaInPromptMiddleware", () => {
  it("adds the schema to the end of the existing system message", async () => {
    const model = createMockModel();

    await generateText({
      model: wrap(model),
      system: "Original system prompt",
      prompt: "Some text",
      output: Output.object({ schema }),
    });

    const call = model.doGenerateCalls[0];
    const resolvedSchema = await schema.jsonSchema;
    expect(call.prompt[0]).toMatchObject({
      role: "system",
      content: `Original system prompt\n\nRespond with JSON that matches this JSON schema:\n${JSON.stringify(resolvedSchema)}`,
    });
    expect(call.prompt.filter((m) => m.role === "system")).toHaveLength(1);
    expect(call.responseFormat).toMatchObject({
      type: "json",
      schema: resolvedSchema,
    });
  });

  it("adds a system message when the call has none", async () => {
    const model = createMockModel();

    await generateText({
      model: wrap(model),
      prompt: "Some text",
      output: Output.object({ schema }),
    });

    const call = model.doGenerateCalls[0];
    const resolvedSchema = await schema.jsonSchema;
    expect(call.prompt[0]).toMatchObject({
      role: "system",
      content: `Respond with JSON that matches this JSON schema:\n${JSON.stringify(resolvedSchema)}`,
    });
    expect(call.prompt[1]).toMatchObject({ role: "user" });
  });

  it("does not change a call with no output schema", async () => {
    const model = createMockModel();

    await generateText({
      model: wrap(model),
      system: "Original system prompt",
      prompt: "Some text",
    });

    const call = model.doGenerateCalls[0];
    expect(call.prompt[0]).toMatchObject({
      role: "system",
      content: "Original system prompt",
    });
  });
});
