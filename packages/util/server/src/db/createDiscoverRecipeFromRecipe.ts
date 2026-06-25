import {
  PrismaTransactionClient,
  DiscoverApprovalState,
} from "@recipesage/prisma";

export interface DiscoverRecipeSnapshotContent {
  title: string;
  description: string;
  yield: string;
  activeTime: string;
  totalTime: string;
  notes: string;
  ingredients: string;
  instructions: string;
  nutritionServingSize?: string | null;
  nutritionCalories?: number | null;
  nutritionTotalFat?: number | null;
  nutritionSaturatedFat?: number | null;
  nutritionTransFat?: number | null;
  nutritionPolyunsaturatedFat?: number | null;
  nutritionMonounsaturatedFat?: number | null;
  nutritionCholesterol?: number | null;
  nutritionSodium?: number | null;
  nutritionTotalCarbs?: number | null;
  nutritionDietaryFiber?: number | null;
  nutritionTotalSugars?: number | null;
  nutritionAddedSugars?: number | null;
  nutritionProtein?: number | null;
  nutritionVitaminD?: number | null;
  nutritionCalcium?: number | null;
  nutritionIron?: number | null;
  nutritionPotassium?: number | null;
  nutritionOtherDetails?: string | null;
}

export const createDiscoverRecipeFromRecipe = (params: {
  sourceRecipeId: string;
  authorId: string;
  content: DiscoverRecipeSnapshotContent;
  language: string;
  tosVersion: string;
  imageIds: string[];
}) => {
  return async (tx: PrismaTransactionClient) => {
    const discoverRecipe = await tx.discoverRecipe.create({
      data: {
        authorId: params.authorId,
        sourceRecipeId: params.sourceRecipeId,
        approvalState: DiscoverApprovalState.PENDING,
        categories: [],
        language: params.language,
        tosAgreedAt: new Date(),
        tosVersion: params.tosVersion,
        ...params.content,
      },
    });

    if (params.imageIds.length) {
      await tx.discoverRecipeImage.createMany({
        data: params.imageIds.map((imageId, index) => ({
          discoverRecipeId: discoverRecipe.id,
          imageId,
          order: index,
        })),
      });
    }

    return discoverRecipe;
  };
};
