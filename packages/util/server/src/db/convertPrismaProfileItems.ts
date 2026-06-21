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
    recipe: profileItem.recipe
      ? {
          id: profileItem.recipe.id,
          images: profileItem.recipe.recipeImages.map(
            (recipeImage) => recipeImage.image,
          ),
        }
      : null,
    label: profileItem.label
      ? {
          id: profileItem.label.id,
          title: profileItem.label.title,
        }
      : null,
  };
};

export const convertPrismaProfileItemsToProfileItemSummaries = (
  profileItems: PrismaProfileItemSummary[],
): ProfileItemSummary[] => {
  return profileItems.map(convertPrismaProfileItemToProfileItemSummary);
};
