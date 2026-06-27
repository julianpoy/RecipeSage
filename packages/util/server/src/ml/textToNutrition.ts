import { z } from "zod";
import { metrics } from "../general";
import { generateText, Output } from "ai";
import { aiProvider } from "./vercel";
import { config } from "../general/config";
import { withNoObjectRetry } from "./withNoObjectRetry";

export const nutritionSchema = z.object({
  servingSize: z
    .string()
    .nullable()
    .describe("Serving size description, e.g. '1 cup (240g)'"),
  calories: z.number().nullable().describe("Calories per serving in kcal"),
  totalFat: z.number().nullable().describe("Total fat per serving in grams"),
  saturatedFat: z
    .number()
    .nullable()
    .describe("Saturated fat per serving in grams"),
  transFat: z.number().nullable().describe("Trans fat per serving in grams"),
  polyunsaturatedFat: z
    .number()
    .nullable()
    .describe("Polyunsaturated fat per serving in grams"),
  monounsaturatedFat: z
    .number()
    .nullable()
    .describe("Monounsaturated fat per serving in grams"),
  cholesterol: z
    .number()
    .nullable()
    .describe("Cholesterol per serving in milligrams"),
  sodium: z.number().nullable().describe("Sodium per serving in milligrams"),
  totalCarbs: z
    .number()
    .nullable()
    .describe("Total carbohydrates per serving in grams"),
  dietaryFiber: z
    .number()
    .nullable()
    .describe("Dietary fiber per serving in grams"),
  totalSugars: z
    .number()
    .nullable()
    .describe("Total sugars per serving in grams"),
  addedSugars: z
    .number()
    .nullable()
    .describe("Added sugars per serving in grams"),
  protein: z.number().nullable().describe("Protein per serving in grams"),
  vitaminD: z
    .number()
    .nullable()
    .describe("Vitamin D per serving in micrograms"),
  calcium: z.number().nullable().describe("Calcium per serving in milligrams"),
  iron: z.number().nullable().describe("Iron per serving in milligrams"),
  potassium: z
    .number()
    .nullable()
    .describe("Potassium per serving in milligrams"),
});

export type NutritionOutput = z.infer<typeof nutritionSchema>;

export const textToNutrition = async (
  text: string,
): Promise<NutritionOutput | undefined> => {
  metrics.convertTextToRecipe.inc();

  if (text.length < 10) return;
  if (text.length > 20000) text = text.substring(0, 20000);

  const llmResponse = await withNoObjectRetry(() =>
    generateText({
      system:
        "You are a nutrition data extraction utility. Extract nutrition information from the provided text. Only extract values that are explicitly stated in the text. If a value is not present, return null for that field. Do not estimate or calculate values that are not provided. All values should be per serving.",
      model: aiProvider(config.ai.model.nutrition),
      temperature: 0,
      prompt:
        "Extract the nutrition information from this text. Only include values that are explicitly mentioned. Return null for any values not found in the text.\n\n" +
        text,
      output: Output.object({
        schema: nutritionSchema,
      }),
    }),
  );

  if (llmResponse.totalUsage.totalTokens !== undefined) {
    metrics.llmTokensConsumed.observe(
      {
        category: "textToNutrition",
      },
      llmResponse.totalUsage.totalTokens,
    );
  }

  return llmResponse.output;
};
