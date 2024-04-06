-- AlterTable
ALTER TABLE "MealPlanItems" ADD COLUMN "scheduledDate" DATE;

UPDATE "MealPlanItems" SET "scheduledDate" = "scheduled";

ALTER TABLE "MealPlanItems" ALTER COLUMN "scheduledDate" SET NOT NULL;
