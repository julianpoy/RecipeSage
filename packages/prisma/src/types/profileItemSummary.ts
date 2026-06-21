import type { Prisma } from "../prisma/generated/client";
import { z } from "zod";

export const PROFILE_ITEM_TYPES = ["all-recipes", "label", "recipe"] as const;
export const PROFILE_ITEM_VISIBILITIES = ["public", "friends-only"] as const;

export const profileItemTypeSchema = z.enum(PROFILE_ITEM_TYPES);
export const profileItemVisibilitySchema = z.enum(PROFILE_ITEM_VISIBILITIES);

export type ProfileItemType = (typeof PROFILE_ITEM_TYPES)[number];
export type ProfileItemVisibility = (typeof PROFILE_ITEM_VISIBILITIES)[number];

export const profileItemSummary = {
  select: {
    id: true,
    userId: true,
    title: true,
    type: true,
    visibility: true,
    order: true,
    recipe: {
      select: {
        id: true,
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
    },
    label: {
      select: {
        id: true,
        title: true,
      },
    },
  },
} satisfies Prisma.ProfileItemFindManyArgs;

export type PrismaProfileItemSummary = Prisma.ProfileItemGetPayload<
  typeof profileItemSummary
>;

export interface ProfileItemSummary {
  id: string;
  userId: string;
  title: string;
  type: ProfileItemType;
  visibility: ProfileItemVisibility;
  order: number;
  recipe: {
    id: string;
    images: {
      id: string;
      location: string;
    }[];
  } | null;
  label: {
    id: string;
    title: string;
  } | null;
}

export const profileItemSummarySchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  title: z.string(),
  type: profileItemTypeSchema,
  visibility: profileItemVisibilitySchema,
  order: z.number().int(),
  recipe: z
    .object({
      id: z.uuid(),
      images: z.array(
        z.object({
          id: z.uuid(),
          location: z.string(),
        }),
      ),
    })
    .nullable(),
  label: z
    .object({
      id: z.uuid(),
      title: z.string(),
    })
    .nullable(),
});

const _checkSchemaSatisfiesType = {} as z.infer<
  typeof profileItemSummarySchema
> satisfies ProfileItemSummary;
const _checkTypeSatisfiesSchema = {} as ProfileItemSummary satisfies z.infer<
  typeof profileItemSummarySchema
>;
