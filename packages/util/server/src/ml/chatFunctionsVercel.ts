import { tool } from "ai";
import { z } from "zod";
import { StandardizedRecipeImportEntry } from "../db";
import { prisma, recipeSummary, RecipeSummary } from "@recipesage/prisma";

export type CreateAssistantRecipeToolResult = {
  storedRecipeInfo: RecipeSummary;
};
export const initCreateAssistantRecipeTool = () =>
  tool({
    description:
      "Creates and displays a well-formatted embedded recipe to the user in the UI",
    inputSchema: z.object({
      title: z.string().describe("The title of the recipe"),
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
    }),
    execute: async ({
      title,
      yield: recipeYield,
      activeTime,
      totalTime,
      ingredients,
      instructions,
    }) => {
      console.log("buildRecipe called with", {
        title,
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
          title: title || "Unnamed",
          description: "",
          folder: "main",
          source: "RecipeSage Cooking Assistant",
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
        storedRecipeInfo: recipe,
      } satisfies CreateAssistantRecipeToolResult as CreateAssistantRecipeToolResult;
    },
  });

export const initOCRFormatRecipeTool = (
  result: StandardizedRecipeImportEntry[],
) =>
  tool({
    description: "Saves a recipe. This must always be used.",
    inputSchema: z.object({
      title: z.string().describe("The title of the recipe"),
      description: z
        .string()
        .optional()
        .describe("The description provided by the author, if any"),
      yield: z
        .string()
        .optional()
        .describe('The yield of the recipe. E.g. "2 servings" or "6 cupcakes"'),
      activeTime: z
        .string()
        .optional()
        .describe("The amount of time spent actively preparing the recipe"),
      totalTime: z
        .string()
        .optional()
        .describe(
          "The total amount of time it will take to cook the recipe including prep",
        ),
      ingredients: z
        .array(z.string().describe("An ingredient required for the recipe"))
        .describe("List of ingredients"),
      instructions: z
        .array(z.string().describe("An instruction for the recipe"))
        .describe("List of instructions"),
      notes: z.string().optional().describe("Any notes by the author."),
    }),
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
      console.log("buildRecipe called with", {
        title,
        description,
        yield: recipeYield,
        activeTime,
        totalTime,
        ingredients,
        instructions,
        notes,
      });

      try {
        const entry: StandardizedRecipeImportEntry = {
          recipe: {
            title: title || "Unnamed",
            description: description || "",
            folder: "main",
            source: "",
            url: "",
            rating: undefined,
            yield: recipeYield || "",
            activeTime: activeTime || "",
            totalTime: totalTime || "",
            ingredients: ingredients.join("\n"),
            instructions: instructions.join("\n"),
            notes: notes || "",
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
