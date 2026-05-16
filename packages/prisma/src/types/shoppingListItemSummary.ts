import type { Prisma } from "../prisma/generated/client";
import { z } from "zod";
import { userPublic, userPublicSchema } from "./userPublic";

/**
 * Provides fields necessary for displaying a summary about a shopping list item
 **/
export const shoppingListItemSummary = {
  select: {
    id: true,
    shoppingListId: true,
    title: true,
    completed: true,
    categoryTitle: true,
    createdAt: true,
    updatedAt: true,
    user: userPublic,
    recipeId: true,
    recipe: {
      select: {
        id: true,
        title: true,
        ingredients: true,
        recipeImages: {
          select: {
            image: {
              select: {
                id: true,
                location: true,
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ShoppingListItemFindFirstArgs;

export type ShoppingListItemSummary = Prisma.ShoppingListItemGetPayload<
  typeof shoppingListItemSummary
> & {
  groupTitle: string;
};

export const shoppingListItemSummarySchema = z.object({
  id: z.uuid(),
  shoppingListId: z.uuid(),
  title: z.string(),
  completed: z.boolean(),
  categoryTitle: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  user: userPublicSchema,
  recipeId: z.uuid().nullable(),
  recipe: z
    .object({
      id: z.uuid(),
      title: z.string(),
      ingredients: z.string(),
      recipeImages: z.array(
        z.object({
          image: z.object({
            id: z.uuid(),
            location: z.string(),
          }),
        }),
      ),
    })
    .nullable(),
  groupTitle: z.string(),
});

const _checkSchemaSatisfiesType = {} as z.infer<
  typeof shoppingListItemSummarySchema
> satisfies ShoppingListItemSummary;
const _checkTypeSatisfiesSchema =
  {} as ShoppingListItemSummary satisfies z.infer<
    typeof shoppingListItemSummarySchema
  >;
