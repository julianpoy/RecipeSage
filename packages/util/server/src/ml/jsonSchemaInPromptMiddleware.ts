import type { LanguageModelMiddleware } from "ai";

export const jsonSchemaInPromptMiddleware: LanguageModelMiddleware = {
  transformParams: async ({ params }) => {
    const { prompt, responseFormat } = params;

    if (responseFormat?.type !== "json" || !responseFormat.schema) {
      return params;
    }

    const instruction = `Respond with JSON that matches this JSON schema:\n${JSON.stringify(responseFormat.schema)}`;

    const systemMessageIndex = prompt.findIndex(
      (message) => message.role === "system",
    );

    if (systemMessageIndex === -1) {
      return {
        ...params,
        prompt: [{ role: "system", content: instruction }, ...prompt],
      };
    }

    return {
      ...params,
      prompt: prompt.map((message, index) =>
        index === systemMessageIndex && message.role === "system"
          ? { ...message, content: `${message.content}\n\n${instruction}` }
          : message,
      ),
    };
  },
};
