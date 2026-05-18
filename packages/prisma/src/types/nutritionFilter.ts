import { z } from "zod";

export const nutritionRangeSchema = z.object({
  min: z.number().min(0).optional(),
  max: z.number().min(0).optional(),
  matchMissing: z.boolean().optional(),
});

export const nutritionFilterSchema = z.object({
  calories: nutritionRangeSchema.optional(),
  protein: nutritionRangeSchema.optional(),
  totalCarbs: nutritionRangeSchema.optional(),
  totalFat: nutritionRangeSchema.optional(),
  sodium: nutritionRangeSchema.optional(),
});

export type NutritionRange = z.infer<typeof nutritionRangeSchema>;
export type NutritionFilter = z.infer<typeof nutritionFilterSchema>;
