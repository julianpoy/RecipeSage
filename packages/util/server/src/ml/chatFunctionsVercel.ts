import { tool, type Tool } from "ai";
import { z } from "zod";
import {
  StandardizedRecipeImportEntry,
  convertPrismaRecipeSummaryToRecipeSummary,
} from "../db";
import { prisma, recipeSummary, RecipeSummary } from "@recipesage/prisma";
import { aiStructuredModel } from "./aiStructuredModel";

export type CreateAssistantRecipeToolResult = {
  storedRecipeInfo: RecipeSummary;
};
const createAssistantRecipeSchema = z.object({
  title: z.string().describe("The title of the recipe"),
  source: z
    .string()
    .describe(
      "The source site of the recipe, if it was pulled from a web search",
    )
    .nullable(),
  yield: z
    .string()
    .describe('The yield of the recipe. E.g. "2 servings" or "6 cupcakes"'),
  activeTime: z
    .string()
    .describe("The amount of time spent actively preparing the recipe"),
  totalTime: z
    .string()
    .describe(
      "The total amount of time it will take to cook the recipe including prep",
    ),
  ingredients: z
    .array(z.string().describe("An ingredient required for the recipe"))
    .describe("List of ingredients"),
  instructions: z
    .array(z.string().describe("An instruction for the recipe"))
    .describe("List of instructions"),
});

export const initCreateAssistantRecipeTool = (): Tool<
  z.infer<typeof createAssistantRecipeSchema>,
  CreateAssistantRecipeToolResult
> =>
  tool({
    strict: true,
    description:
      "Creates and displays a well-formatted embedded recipe to the user in the UI",
    inputSchema: createAssistantRecipeSchema,
    execute: async ({
      title,
      source,
      yield: recipeYield,
      activeTime,
      totalTime,
      ingredients,
      instructions,
    }) => {
      console.log("buildRecipe called with", {
        title,
        source,
        yield: recipeYield,
        activeTime,
        totalTime,
        ingredients,
        instructions,
      });

      const filterInstruction = (str: string) => {
        return str.replaceAll("**", "").replace(/^\d+./, "").trim();
      };
      const filterIngredient = (str: string) => {
        return str.replaceAll("**", "").trim();
      };

      const assistantUser = await prisma.user.findUniqueOrThrow({
        where: {
          email: "assistant@recipesage.com",
        },
      });

      const recipe = await prisma.recipe.create({
        data: {
          title: (title || "Unnamed").slice(0, 254),
          description: "",
          folder: "main",
          source: source || "RecipeSage Cooking Assistant",
          url: "",
          rating: undefined,
          yield: recipeYield || "",
          activeTime: activeTime || "",
          totalTime: totalTime || "",
          ingredients: ingredients.map(filterIngredient).join("\n"),
          instructions: instructions.map(filterInstruction).join("\n"),
          notes: "",
          userId: assistantUser.id,
        },
        ...recipeSummary,
      });

      // Return the same thing the AI sent us so that it replies to user with what it built
      // If we don't do this, the AI will create a new (different) recipe and reply with that
      return {
        storedRecipeInfo: convertPrismaRecipeSummaryToRecipeSummary(recipe),
      } satisfies CreateAssistantRecipeToolResult as CreateAssistantRecipeToolResult;
    },
  });

export const ocrFormatRecipeSchema = z.object({
  title: z.string().describe("The title of the recipe"),
  description: z
    .string()
    .nullable()
    .describe("The description provided by the author, if any"),
  yield: z
    .string()
    .nullable()
    .describe('The yield of the recipe. E.g. "2 servings" or "6 cupcakes"'),
  activeTime: z
    .string()
    .nullable()
    .describe("The amount of time spent actively preparing the recipe"),
  totalTime: z
    .string()
    .nullable()
    .describe(
      "The total amount of time it will take to cook the recipe including prep",
    ),
  ingredients: z
    .string()
    .nullable()
    .describe("Multiline string list of ingredients"),
  instructions: z
    .string()
    .nullable()
    .describe("Multiline string list of instructions"),
  notes: z
    .string()
    .nullable()
    .describe(
      "Multiline string of any notes by the author, or content that does not fit into the other fields",
    ),
  nutritionInfo: z
    .string()
    .nullable()
    .describe(
      "Any nutrition information present in the source text, preserved as-is. Include all nutrition values found (calories, fat, protein, carbs, etc). Null if no nutrition information is present.",
    ),
});

export const ocrFormatRecipeModelSchema = aiStructuredModel(
  ocrFormatRecipeSchema,
);

export const initOCRFormatRecipeTool = (
  result: StandardizedRecipeImportEntry[],
): Tool<
  z.infer<typeof ocrFormatRecipeSchema>,
  Omit<z.infer<typeof ocrFormatRecipeSchema>, "nutritionInfo">
> =>
  tool({
    strict: true,
    inputSchema: ocrFormatRecipeSchema,
    execute: async ({
      title,
      description,
      yield: recipeYield,
      activeTime,
      totalTime,
      ingredients,
      instructions,
      notes,
    }) => {
      console.log("initOCRFormatRecipeTool called with", {
        title,
        description,
        yield: recipeYield,
        activeTime,
        totalTime,
        ingredients,
        instructions,
        notes,
      });

      const markdownHeadersToRS = (line: string) => {
        if (line.startsWith("#")) {
          return `[${line.replace(/^#\s*/, "")}]`;
        }
        return line;
      };

      try {
        const entry: StandardizedRecipeImportEntry = {
          recipe: {
            title: title || "Unnamed",
            description: description || "",
            folder: "main",
            source: "",
            url: "",
            rating: undefined,
            yield: (recipeYield || "").replaceAll("<UNKNOWN>", ""),
            activeTime: (activeTime || "").replaceAll("<UNKNOWN>", ""),
            totalTime: (totalTime || "").replaceAll("<UNKNOWN>", ""),
            ingredients: (ingredients || "")
              .replaceAll("\\n", "\n")
              .split("\n")
              .map(markdownHeadersToRS)
              .join("\n"),
            instructions: (instructions || "")
              .replaceAll("\\n", "\n")
              .split("\n")
              .map(markdownHeadersToRS)
              .join("\n"),
            notes: (notes || "")
              .replaceAll("\\n", "\n")
              .split("\n")
              .map(markdownHeadersToRS)
              .join("\n"),
          },
          labels: [],
          images: [],
        };

        result.push(entry);
      } catch (e) {
        console.error("failed to construct a recipe", e);
      }

      // Return the same thing the AI sent us so that it replies to user with what it built
      // If we don't do this, the AI will create a new (different) recipe and reply with that
      return {
        title,
        description,
        yield: recipeYield,
        activeTime,
        totalTime,
        ingredients,
        instructions,
        notes,
      };
    },
  });
