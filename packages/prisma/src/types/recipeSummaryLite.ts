import type { Prisma } from "../prisma/generated/client";
import { z } from "zod";
import { userPublic, userPublicSchema } from "./userPublic";

/**
 * Provides fields necessary for displaying a summary about a recipe,
 * not including ingredients, instructions, notes, etc.
 **/
export const recipeSummaryLite = {
  select: {
    id: true,
    userId: true,
    fromUserId: true,
    title: true,
    description: true,
    yield: true,
    activeTime: true,
    totalTime: true,
    source: true,
    url: true,
    folder: true,
    createdAt: true,
    updatedAt: true,
    lastMadeAt: true,
    rating: true,
    recipeLabels: {
      select: {
        label: {
          select: {
            title: true,
          },
        },
      },
    },
    recipeImages: {
      select: {
        order: true,
        image: {
          select: {
            location: true,
          },
        },
      },
    },
    fromUser: userPublic,
    user: userPublic,
  },
} satisfies Prisma.RecipeFindFirstArgs;

type InternalRecipeSummaryLite = Prisma.RecipeGetPayload<
  typeof recipeSummaryLite
>;

/**
 * Provides fields necessary for displaying a summary about a recipe,
 * not including ingredients, instructions, notes, etc.
 **/
export type RecipeSummaryLite = Omit<
  InternalRecipeSummaryLite,
  "lastMadeAt"
> & {
  lastMadeAt: string | null;
};

export const recipeSummaryLiteSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  fromUserId: z.uuid().nullable(),
  title: z.string(),
  description: z.string(),
  yield: z.string(),
  activeTime: z.string(),
  totalTime: z.string(),
  source: z.string(),
  url: z.string(),
  folder: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastMadeAt: z.string().nullable(),
  rating: z.number().int().nullable(),
  recipeLabels: z.array(
    z.object({
      label: z.object({
        title: z.string(),
      }),
    }),
  ),
  recipeImages: z.array(
    z.object({
      order: z.number().int(),
      image: z.object({
        location: z.string(),
      }),
    }),
  ),
  fromUser: userPublicSchema.nullable(),
  user: userPublicSchema,
});

const _checkSchemaSatisfiesType = {} as z.infer<
  typeof recipeSummaryLiteSchema
> satisfies RecipeSummaryLite;
const _checkTypeSatisfiesSchema = {} as RecipeSummaryLite satisfies z.infer<
  typeof recipeSummaryLiteSchema
>;
