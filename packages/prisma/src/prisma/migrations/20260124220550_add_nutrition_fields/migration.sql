-- AlterTable
ALTER TABLE "Recipes" ADD COLUMN     "ingredientNutrition" JSONB,
ADD COLUMN     "nutritionCalories" INTEGER,
ADD COLUMN     "nutritionCarbs" INTEGER,
ADD COLUMN     "nutritionCholesterol" INTEGER,
ADD COLUMN     "nutritionFat" INTEGER,
ADD COLUMN     "nutritionFiber" INTEGER,
ADD COLUMN     "nutritionProtein" INTEGER,
ADD COLUMN     "nutritionSaturatedFat" INTEGER,
ADD COLUMN     "nutritionServingSize" TEXT,
ADD COLUMN     "nutritionSodium" INTEGER,
ADD COLUMN     "nutritionSugar" INTEGER,
ADD COLUMN     "nutritionUnsaturatedFat" INTEGER;
