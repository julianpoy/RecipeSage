/*
  Warnings:

  - Added the required column `warnWhenNotPresent` to the `LabelGroups` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "LabelGroups" ADD COLUMN     "warnWhenNotPresent" BOOLEAN NOT NULL;
