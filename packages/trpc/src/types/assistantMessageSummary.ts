import { Prisma } from "@prisma/client";
import { recipeSummaryLite } from "./recipeSummaryLite";

/**
 * Provides assistant chat history with recipe summary included
 **/
export const assistantMessageSummary =
  Prisma.validator<Prisma.AssistantMessageArgs>()({
    select: {
      id: true,
      userId: true,
      role: true,
      content: true,
      name: true,
      recipeId: true,
      createdAt: true,
      updatedAt: true,
      recipe: recipeSummaryLite,
    },
  });

/**
 * Provides assistant chat history with recipe summary included
 **/
export type AssistantMessageSummary = Prisma.AssistantMessageGetPayload<
  typeof assistantMessageSummary
>;
