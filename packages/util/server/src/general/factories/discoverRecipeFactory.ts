import { faker } from "@faker-js/faker";
import { DiscoverApprovalState } from "@recipesage/prisma";

export function discoverRecipeFactory(authorId: string) {
  return {
    authorId,
    title: faker.string.alphanumeric(10),
    description: faker.string.alphanumeric(10),
    language: "en",
    approvalState: DiscoverApprovalState.ACTIVE,
    tosAgreedAt: new Date(),
    tosVersion: "1",
  };
}

export function discoverRecipeContentFactory() {
  return {
    title: faker.string.alphanumeric(10),
    description: faker.string.alphanumeric(10),
    yield: "",
    activeTime: "",
    totalTime: "",
    notes: "",
    ingredients: "",
    instructions: "",
    nutritionServingSize: null,
    nutritionCalories: null,
    nutritionTotalFat: null,
    nutritionSaturatedFat: null,
    nutritionTransFat: null,
    nutritionPolyunsaturatedFat: null,
    nutritionMonounsaturatedFat: null,
    nutritionCholesterol: null,
    nutritionSodium: null,
    nutritionTotalCarbs: null,
    nutritionDietaryFiber: null,
    nutritionTotalSugars: null,
    nutritionAddedSugars: null,
    nutritionProtein: null,
    nutritionVitaminD: null,
    nutritionCalcium: null,
    nutritionIron: null,
    nutritionPotassium: null,
    nutritionOtherDetails: null,
  };
}
