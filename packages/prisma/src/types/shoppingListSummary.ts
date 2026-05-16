import type { Prisma } from "../prisma/generated/client";
import { z } from "zod";
import { userPublic, userPublicSchema } from "./userPublic";

/**
 * Provides fields necessary for displaying a summary about a shopping list,
 * not including items
 **/
export const shoppingListSummary = {
  select: {
    id: true,
    userId: true,
    user: userPublic,
    collaboratorUsers: {
      select: {
        user: userPublic,
      },
    },
    title: true,
    categoryOrder: true,
    createdAt: true,
    updatedAt: true,
    _count: {
      select: {
        items: true,
      },
    },
  },
} satisfies Prisma.ShoppingListFindFirstArgs;

/**
 * Provides fields necessary for displaying a summary about a shopping list,
 * not including items
 **/
export type ShoppingListSummary = Prisma.ShoppingListGetPayload<
  typeof shoppingListSummary
>;

export const shoppingListSummarySchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  user: userPublicSchema,
  collaboratorUsers: z.array(
    z.object({
      user: userPublicSchema,
    }),
  ),
  title: z.string(),
  categoryOrder: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  _count: z.object({
    items: z.number().int(),
  }),
});

const _checkSchemaSatisfiesType = {} as z.infer<
  typeof shoppingListSummarySchema
> satisfies ShoppingListSummary;
const _checkTypeSatisfiesSchema = {} as ShoppingListSummary satisfies z.infer<
  typeof shoppingListSummarySchema
>;
