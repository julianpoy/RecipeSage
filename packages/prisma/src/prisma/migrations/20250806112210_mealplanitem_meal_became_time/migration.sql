/*
  Warnings:

  - Made the column `mealTime` on table `MealOptions` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "MealOptions" ALTER COLUMN "mealTime" SET NOT NULL;

UPDATE "MealPlanItems" SET "meal" = '10:00' WHERE "meal" = 'breakfast';
UPDATE "MealPlanItems" SET "meal" = '13:00' WHERE "meal" = 'lunch';
UPDATE "MealPlanItems" SET "meal" = '18:00' WHERE "meal" = 'dinner';
UPDATE "MealPlanItems" SET "meal" = '19:00' WHERE "meal" = 'snack';
UPDATE "MealPlanItems" SET "meal" = '20:00' WHERE "meal" = 'other';

ALTER TABLE "MealPlanItems" ALTER COLUMN "meal" SET DATA TYPE VARCHAR(5);