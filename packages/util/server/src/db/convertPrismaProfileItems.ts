import {
  profileItemTypeSchema,
  profileItemVisibilitySchema,
  type PrismaProfileItemSummary,
  type ProfileItemSummary,
} from "@recipesage/prisma";

export const convertPrismaProfileItemToProfileItemSummary = (
  profileItem: PrismaProfileItemSummary,
): ProfileItemSummary => {
  return {
    id: profileItem.id,
    userId: profileItem.userId,
    title: profileItem.title,
    type: profileItemTypeSchema.parse(profileItem.type),
    visibility: profileItemVisibilitySchema.parse(profileItem.visibility),
    order: profileItem.order,
    recipe: profileItem.recipe,
    label: profileItem.label,
  };
};

export const convertPrismaProfileItemsToProfileItemSummaries = (
  profileItems: PrismaProfileItemSummary[],
): ProfileItemSummary[] => {
  return profileItems.map(convertPrismaProfileItemToProfileItemSummary);
};
