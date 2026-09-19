-- AlterTable
ALTER TABLE "Discover_Recipes" ADD COLUMN     "qualityScore" INTEGER,
ADD COLUMN     "ratingScore" DOUBLE PRECISION NOT NULL DEFAULT 3.5;

-- DropIndex
DROP INDEX "discover_recipes_approval_state_rating";

-- CreateIndex
CREATE INDEX "discover_recipes_approval_state_rating_score" ON "Discover_Recipes"("approvalState", "ratingScore" DESC, "ratingCount" DESC);
