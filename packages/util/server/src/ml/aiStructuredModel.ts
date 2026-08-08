import { jsonSchema, zodSchema, type Schema } from "ai";
import type { z } from "zod";
import { nullableUnionsToTypeArrays } from "./nullableUnionsToTypeArrays";

export const aiStructuredModel = <Output>(
  schema: z.ZodType<Output>,
): Schema<Output> =>
  jsonSchema<Output>(
    () =>
      Promise.resolve(zodSchema(schema).jsonSchema).then(
        nullableUnionsToTypeArrays,
      ),
    {
      validate: (value) => {
        const parsed = schema.safeParse(value);
        return parsed.success
          ? { success: true, value: parsed.data }
          : { success: false, error: parsed.error };
      },
    },
  );
