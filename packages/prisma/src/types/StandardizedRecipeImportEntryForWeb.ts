import { z } from "zod";

export interface StandardizedRecipeImportEntryForWeb {
  recipe: {
    title: string;
    description?: string;
    yield?: string;
    activeTime?: string;
    totalTime?: string;
    source?: string;
    url?: string;
    notes?: string;
    ingredients?: string;
    instructions?: string;
    folder?: string;
    rating?: number;
    nutritionInfo?: string;
    nutritionServingSize?: string | null;
    nutritionCalories?: number | null;
    nutritionTotalFat?: number | null;
    nutritionSaturatedFat?: number | null;
    nutritionTransFat?: number | null;
    nutritionPolyunsaturatedFat?: number | null;
    nutritionMonounsaturatedFat?: number | null;
    nutritionCholesterol?: number | null;
    nutritionSodium?: number | null;
    nutritionTotalCarbs?: number | null;
    nutritionDietaryFiber?: number | null;
    nutritionTotalSugars?: number | null;
    nutritionAddedSugars?: number | null;
    nutritionProtein?: number | null;
    nutritionVitaminD?: number | null;
    nutritionCalcium?: number | null;
    nutritionIron?: number | null;
    nutritionPotassium?: number | null;
    nutritionOtherDetails?: string | null;
  };
  labels: string[];
  images: string[];
}

export const standardizedRecipeImportEntryForWebSchema = z.object({
  recipe: z.object({
    title: z.string(),
    description: z.string().optional(),
    yield: z.string().optional(),
    activeTime: z.string().optional(),
    totalTime: z.string().optional(),
    source: z.string().optional(),
    url: z.string().optional(),
    notes: z.string().optional(),
    ingredients: z.string().optional(),
    instructions: z.string().optional(),
    folder: z.string().optional(),
    rating: z.number().optional(),
    nutritionInfo: z.string().optional(),
    nutritionServingSize: z.string().nullable().optional(),
    nutritionCalories: z.number().nullable().optional(),
    nutritionTotalFat: z.number().nullable().optional(),
    nutritionSaturatedFat: z.number().nullable().optional(),
    nutritionTransFat: z.number().nullable().optional(),
    nutritionPolyunsaturatedFat: z.number().nullable().optional(),
    nutritionMonounsaturatedFat: z.number().nullable().optional(),
    nutritionCholesterol: z.number().nullable().optional(),
    nutritionSodium: z.number().nullable().optional(),
    nutritionTotalCarbs: z.number().nullable().optional(),
    nutritionDietaryFiber: z.number().nullable().optional(),
    nutritionTotalSugars: z.number().nullable().optional(),
    nutritionAddedSugars: z.number().nullable().optional(),
    nutritionProtein: z.number().nullable().optional(),
    nutritionVitaminD: z.number().nullable().optional(),
    nutritionCalcium: z.number().nullable().optional(),
    nutritionIron: z.number().nullable().optional(),
    nutritionPotassium: z.number().nullable().optional(),
    nutritionOtherDetails: z.string().nullable().optional(),
  }),
  labels: z.array(z.string()),
  images: z.array(z.string()),
});

const _checkSchemaSatisfiesType = {} as z.infer<
  typeof standardizedRecipeImportEntryForWebSchema
> satisfies StandardizedRecipeImportEntryForWeb;
const _checkTypeSatisfiesSchema =
  {} as StandardizedRecipeImportEntryForWeb satisfies z.infer<
    typeof standardizedRecipeImportEntryForWebSchema
  >;
