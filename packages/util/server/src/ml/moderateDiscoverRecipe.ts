import { z } from "zod";
import { generateText, Output } from "ai";
import { prisma, DiscoverApprovalState } from "@recipesage/prisma";
import {
  DISCOVER_CATEGORIES,
  DISCOVER_CATEGORY_GROUPS,
  DiscoverCategoryGroup,
  MAX_DISCOVER_CATEGORIES_PER_RECIPE,
  filterToValidDiscoverCategoryKeys,
} from "@recipesage/util/shared";
import { AI_MODEL_HIGH, aiProvider } from "./vercel";
import { withNoObjectRetry } from "./withNoObjectRetry";
import { computeDiscoverRankScore } from "../db/computeDiscoverRankScore";

const CATEGORY_GROUP_PROMPT_NAMES: Record<DiscoverCategoryGroup, string> = {
  course: "Course",
  cuisine: "Cuisine",
  dietary: "Dietary",
  mainIngredient: "Main ingredient",
  method: "Cooking method",
};

const CATEGORY_VOCABULARY = DISCOVER_CATEGORY_GROUPS.map((group) => {
  const keys = DISCOVER_CATEGORIES.filter(
    (category) => category.group === group,
  ).map((category) => category.key);
  return `${CATEGORY_GROUP_PROMPT_NAMES[group]}: ${keys.join(", ")}`;
}).join("\n");

const moderationResultSchema = z.object({
  appropriate: z.boolean(),
  reason: z.string(),
  categories: z.array(z.string()),
  language: z.string(),
});

export const moderateDiscoverRecipe = async (discoverRecipeId: string) => {
  const discoverRecipe = await prisma.discoverRecipe.findUnique({
    where: {
      id: discoverRecipeId,
    },
  });
  if (!discoverRecipe) return;

  const llmResponse = await withNoObjectRetry(() =>
    generateText({
      system:
        "You are a content moderation and classification utility for a public, family-friendly recipe discovery catalog. You do not add to or rewrite recipe content. You judge whether content is appropriate for a public catalog, assign categories strictly from an allowed list, and detect the primary language.",
      model: aiProvider(AI_MODEL_HIGH),
      temperature: 0,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                "Evaluate the following recipe for inclusion in a public recipe catalog.",
                "",
                "Set appropriate=false if it contains hateful, harassing, sexual, violent, illegal, dangerous, spam, advertising, or otherwise non-recipe or abusive content. Otherwise set appropriate=true.",
                "",
                `Choose between 1 and ${MAX_DISCOVER_CATEGORIES_PER_RECIPE} categories that best fit the recipe, drawn from the dimensions below. Choose at most one or two per dimension, and only include a category when it clearly applies. Use ONLY these exact keys:`,
                "",
                CATEGORY_VOCABULARY,
                "",
                "Detect the primary language of the recipe and return it as an ISO 639-1 code (for example: en, es, fr, de, zh, ja).",
                "",
                `Title: ${discoverRecipe.title}`,
                `Description: ${discoverRecipe.description}`,
                `Ingredients: ${discoverRecipe.ingredients}`,
                `Instructions: ${discoverRecipe.instructions}`,
                `Notes: ${discoverRecipe.notes}`,
              ].join("\n"),
            },
          ],
        },
      ],
      output: Output.object({
        schema: moderationResultSchema,
      }),
    }),
  );

  const output = llmResponse.output;

  const llmCategories = filterToValidDiscoverCategoryKeys(output.categories);
  const finalCategories = (
    llmCategories.length
      ? llmCategories
      : filterToValidDiscoverCategoryKeys(discoverRecipe.categories)
  ).slice(0, MAX_DISCOVER_CATEGORIES_PER_RECIPE);

  const detectedLanguage = output.language.trim().toLowerCase();
  const language = detectedLanguage
    ? detectedLanguage.slice(0, 35)
    : discoverRecipe.language;

  const rankScore = computeDiscoverRankScore({
    createdAt: discoverRecipe.createdAt,
    saveCount: discoverRecipe.saveCount,
    ratingAverage: discoverRecipe.ratingAverage,
    ratingCount: discoverRecipe.ratingCount,
  });

  await prisma.discoverRecipe.update({
    where: {
      id: discoverRecipe.id,
    },
    data: {
      approvalState: output.appropriate
        ? DiscoverApprovalState.ACTIVE
        : DiscoverApprovalState.SHADOWBANNED,
      categories: finalCategories,
      language,
      rankScore,
    },
  });
};
