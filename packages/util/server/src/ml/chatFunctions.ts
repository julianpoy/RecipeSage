import { RunnableToolFunction } from "openai/lib/RunnableFunction";
import { StandardizedRecipeImportEntry } from "../db";

export type RSRunnableFunction =
  | ReturnType<typeof initOCRFormatRecipe>
  | ReturnType<typeof initBuildRecipe>;

export const initBuildRecipe = (
  result: StandardizedRecipeImportEntry[],
): RunnableToolFunction<{
  title: unknown;
  yield: unknown;
  activeTime: unknown;
  totalTime: unknown;
  ingredients: unknown;
  instructions: unknown;
}> => ({
  type: "function",
  function: {
    name: "embedRecipe",
    description: "Displays a well-formatted embedded recipe to the user",
    parse: JSON.parse,
    function: (args) => {
      console.log("buildRecipe called with", args);

      const filterInstruction = (str: string) => {
        return str.replaceAll("**", "").replace(/^\d+./, "").trim();
      };
      const filterIngredient = (str: string) => {
        return str.replaceAll("**", "").trim();
      };

      try {
        const recipe: StandardizedRecipeImportEntry = {
          recipe: {
            title: typeof args.title === "string" ? args.title : "Unnamed",
            description: "",
            folder: "main",
            source: "RecipeSage Cooking Assistant",
            url: "",
            rating: undefined,
            yield: typeof args.yield === "string" ? args.yield : "",
            activeTime:
              typeof args.activeTime === "string" ? args.activeTime : "",
            totalTime: typeof args.totalTime === "string" ? args.totalTime : "",
            ingredients: Array.isArray(args.ingredients)
              ? args.ingredients.map(filterIngredient).join("\n")
              : "",
            instructions: Array.isArray(args.instructions)
              ? args.instructions.map(filterInstruction).join("\n")
              : "",
            notes: "",
          },
          labels: [],
          images: [],
        };

        result.push(recipe);
      } catch (e) {
        console.error("failed to construct a recipe", e);
      }

      // Return the same thing GPT sent us so that it replies to user with what it built
      // If we don't do this, ChatGPT will create a new (different) recipe and reply with that
      return args;
    },
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "The title of the recipe",
        },
        yield: {
          type: "string",
          description: `The yield of the recipe. E.g. "2 servings" or "6 cupcakes"`,
        },
        activeTime: {
          type: "string",
          description: "The amount of time spent actively preparing the recipe",
        },
        totalTime: {
          type: "string",
          description:
            "The total amount of time it will take to cook the recipe including prep",
        },
        ingredients: {
          type: "array",
          items: {
            type: "string",
            description: "An ingredient required for the recipe",
          },
        },
        instructions: {
          type: "array",
          items: {
            type: "string",
            description: "An instruction for the recipe",
          },
        },
      },
      required: ["title", "ingredients", "instructions"],
    },
  },
});

export const initOCRFormatRecipe = (
  result: StandardizedRecipeImportEntry[],
): RunnableToolFunction<{
  title: unknown;
  description: unknown;
  yield: unknown;
  activeTime: unknown;
  totalTime: unknown;
  ingredients: unknown;
  instructions: unknown;
  notes: unknown;
}> => ({
  type: "function",
  function: {
    name: "saveRecipe",
    description: "Saves a recipe. This must always be used.",
    parse: JSON.parse,
    function: (args) => {
      console.log("buildRecipe called with", args);

      try {
        const entry: StandardizedRecipeImportEntry = {
          recipe: {
            title: typeof args.title === "string" ? args.title : "Unnamed",
            description:
              typeof args.description === "string" ? args.description : "",
            folder: "main",
            source: "",
            url: "",
            rating: undefined,
            yield: typeof args.yield === "string" ? args.yield : "",
            activeTime:
              typeof args.activeTime === "string" ? args.activeTime : "",
            totalTime: typeof args.totalTime === "string" ? args.totalTime : "",
            ingredients: Array.isArray(args.ingredients)
              ? args.ingredients.join("\n")
              : "",
            instructions: Array.isArray(args.instructions)
              ? args.instructions.join("\n")
              : "",
            notes: typeof args.notes === "string" ? args.notes : "",
          },
          labels: [],
          images: [],
        };

        result.push(entry);
      } catch (e) {
        console.error("failed to construct a recipe", e);
      }

      // Return the same thing GPT sent us so that it replies to user with what it built
      // If we don't do this, ChatGPT will create a new (different) recipe and reply with that
      return args;
    },
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "The title of the recipe",
        },
        description: {
          type: "string",
          description: "The description provided by the author, if any",
        },
        yield: {
          type: "string",
          description: `The yield of the recipe. E.g. "2 servings" or "6 cupcakes"`,
        },
        activeTime: {
          type: "string",
          description: "The amount of time spent actively preparing the recipe",
        },
        totalTime: {
          type: "string",
          description:
            "The total amount of time it will take to cook the recipe including prep",
        },
        ingredients: {
          type: "array",
          items: {
            type: "string",
            description: "An ingredient required for the recipe",
          },
        },
        instructions: {
          type: "array",
          items: {
            type: "string",
            description: "An instruction for the recipe",
          },
        },
        notes: {
          type: "string",
          description: "Any notes by the author.",
        },
      },
      required: ["title", "ingredients", "instructions"],
    },
  },
});
