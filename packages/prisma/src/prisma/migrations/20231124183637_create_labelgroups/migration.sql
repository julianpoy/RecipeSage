/*
  Warnings:

  - Made the column `title` on table `Labels` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Labels" ADD COLUMN     "labelGroupId" UUID,
ALTER COLUMN "title" SET NOT NULL;

-- CreateTable
CREATE TABLE "LabelGroups" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "LabelGroups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LabelGroups_userId_title_uk" ON "LabelGroups"("userId", "title");

-- AddForeignKey
ALTER TABLE "Labels" ADD CONSTRAINT "Labels_labelGroupId_fkey" FOREIGN KEY ("labelGroupId") REFERENCES "LabelGroups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabelGroups" ADD CONSTRAINT "LabelGroups_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
