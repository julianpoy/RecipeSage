import type { Prisma } from "../prisma/generated/client";
import { z } from "zod";

const messageRecipe = {
  select: {
    id: true,
    title: true,
    recipeImages: {
      select: {
        image: {
          select: {
            id: true,
            location: true,
          },
        },
      },
      orderBy: {
        order: "asc",
      },
    },
  },
} satisfies Prisma.RecipeFindFirstArgs;

export const messageSummary = {
  select: {
    id: true,
    body: true,
    createdAt: true,
    updatedAt: true,
    fromUserId: true,
    toUserId: true,
    recipeId: true,
    originalRecipeId: true,
    recipe: messageRecipe,
    originalRecipe: messageRecipe,
  },
} satisfies Prisma.MessageFindFirstArgs;

export type PrismaMessageSummary = Prisma.MessageGetPayload<
  typeof messageSummary
>;

const messageRecipeSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  recipeImages: z.array(
    z.object({
      image: z.object({
        id: z.uuid(),
        location: z.string(),
      }),
    }),
  ),
});

export type MessageSummary = Omit<PrismaMessageSummary, "body"> & {
  body: string;
};

export const messageSummarySchema = z.object({
  id: z.uuid(),
  body: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  fromUserId: z.uuid(),
  toUserId: z.uuid(),
  recipeId: z.uuid().nullable(),
  originalRecipeId: z.uuid().nullable(),
  recipe: messageRecipeSchema.nullable(),
  originalRecipe: messageRecipeSchema.nullable(),
});

const _checkSchemaSatisfiesType = {} as z.infer<
  typeof messageSummarySchema
> satisfies MessageSummary;
const _checkTypeSatisfiesSchema = {} as MessageSummary satisfies z.infer<
  typeof messageSummarySchema
>;
