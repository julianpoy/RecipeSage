import type { Prisma } from "../prisma/generated/client";
import { z } from "zod";
import {
  recipeSummaryLite,
  recipeSummaryLiteSchema,
  type RecipeSummaryLite,
} from "./recipeSummaryLite";

/**
 * Provides assistant chat history with recipe summary included
 **/
export const assistantMessageSummary = {
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
} satisfies Prisma.AssistantMessageFindFirstArgs;

type InternalAssistantMessageSummary = Prisma.AssistantMessageGetPayload<
  typeof assistantMessageSummary
>;

/**
 * Provides assistant chat history with recipe summary included
 **/
export type AssistantMessageSummary = Omit<
  InternalAssistantMessageSummary,
  "recipe"
> & {
  recipe: RecipeSummaryLite | null;
};

export const assistantMessageSummarySchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  role: z.string(),
  content: z.string().nullable(),
  name: z.string().nullable(),
  recipeId: z.uuid().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  recipe: recipeSummaryLiteSchema.nullable(),
});

const _checkSchemaSatisfiesType = {} as z.infer<
  typeof assistantMessageSummarySchema
> satisfies AssistantMessageSummary;
const _checkTypeSatisfiesSchema =
  {} as AssistantMessageSummary satisfies z.infer<
    typeof assistantMessageSummarySchema
  >;
