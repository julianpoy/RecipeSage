-- CreateEnum
CREATE TYPE "DiscoverApprovalState" AS ENUM ('PENDING', 'ACTIVE', 'SHADOWBANNED');

-- CreateTable
CREATE TABLE "Discover_Recipes" (
    "id" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "sourceRecipeId" UUID,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "yield" TEXT NOT NULL DEFAULT '',
    "activeTime" TEXT NOT NULL DEFAULT '',
    "totalTime" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "ingredients" TEXT NOT NULL DEFAULT '',
    "instructions" TEXT NOT NULL DEFAULT '',
    "language" VARCHAR(35) NOT NULL,
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "approvalState" "DiscoverApprovalState" NOT NULL DEFAULT 'PENDING',
    "ratingAverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "saveCount" INTEGER NOT NULL DEFAULT 0,
    "rankScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tosAgreedAt" TIMESTAMPTZ(6) NOT NULL,
    "tosVersion" VARCHAR(255) NOT NULL,
    "nutritionServingSize" TEXT,
    "nutritionCalories" DOUBLE PRECISION,
    "nutritionTotalFat" DOUBLE PRECISION,
    "nutritionSaturatedFat" DOUBLE PRECISION,
    "nutritionTransFat" DOUBLE PRECISION,
    "nutritionPolyunsaturatedFat" DOUBLE PRECISION,
    "nutritionMonounsaturatedFat" DOUBLE PRECISION,
    "nutritionCholesterol" DOUBLE PRECISION,
    "nutritionSodium" DOUBLE PRECISION,
    "nutritionTotalCarbs" DOUBLE PRECISION,
    "nutritionDietaryFiber" DOUBLE PRECISION,
    "nutritionTotalSugars" DOUBLE PRECISION,
    "nutritionAddedSugars" DOUBLE PRECISION,
    "nutritionProtein" DOUBLE PRECISION,
    "nutritionVitaminD" DOUBLE PRECISION,
    "nutritionCalcium" DOUBLE PRECISION,
    "nutritionIron" DOUBLE PRECISION,
    "nutritionPotassium" DOUBLE PRECISION,
    "nutritionOtherDetails" TEXT,
    "modifiedAt" TIMESTAMPTZ(6),
    "deletedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "tsv" tsvector,

    CONSTRAINT "Discover_Recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discover_Recipe_Images" (
    "id" UUID NOT NULL,
    "discoverRecipeId" UUID NOT NULL,
    "imageId" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Discover_Recipe_Images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discover_Recipe_Ratings" (
    "id" UUID NOT NULL,
    "discoverRecipeId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Discover_Recipe_Ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discover_Recipe_Saves" (
    "id" UUID NOT NULL,
    "discoverRecipeId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "recipeId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Discover_Recipe_Saves_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "discover_recipes_author_id_created_at" ON "Discover_Recipes"("authorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "discover_recipes_approval_state_rank_score" ON "Discover_Recipes"("approvalState", "rankScore" DESC);

-- CreateIndex
CREATE INDEX "discover_recipes_approval_state_created_at" ON "Discover_Recipes"("approvalState", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "discover_recipes_approval_state_save_count" ON "Discover_Recipes"("approvalState", "saveCount" DESC, "createdAt" DESC);

-- CreateIndex
CREATE INDEX "discover_recipes_approval_state_rating" ON "Discover_Recipes"("approvalState", "ratingAverage" DESC, "ratingCount" DESC);

-- CreateIndex
CREATE INDEX "discover_recipes_language" ON "Discover_Recipes"("language");

-- CreateIndex
CREATE INDEX "discover_recipes_categories_idx" ON "Discover_Recipes" USING GIN ("categories");

-- CreateIndex
CREATE INDEX "discover_recipes_tsv_idx" ON "Discover_Recipes" USING GIN ("tsv");

-- CreateIndex
CREATE INDEX "discover_recipe__images_discover_recipe_id" ON "Discover_Recipe_Images"("discoverRecipeId");

-- CreateIndex
CREATE INDEX "discover_recipe__images_image_id" ON "Discover_Recipe_Images"("imageId");

-- CreateIndex
CREATE INDEX "discover_recipe__ratings_user_id" ON "Discover_Recipe_Ratings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Discover_Recipe_Ratings_discoverRecipeId_userId_uk" ON "Discover_Recipe_Ratings"("discoverRecipeId", "userId");

-- CreateIndex
CREATE INDEX "discover_recipe__saves_user_id_discover_recipe_id" ON "Discover_Recipe_Saves"("userId", "discoverRecipeId");

-- CreateIndex
CREATE UNIQUE INDEX "Discover_Recipe_Saves_discoverRecipeId_userId_uk" ON "Discover_Recipe_Saves"("discoverRecipeId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Discover_Recipe_Saves_recipeId_uk" ON "Discover_Recipe_Saves"("recipeId");

-- AddForeignKey
ALTER TABLE "Discover_Recipes" ADD CONSTRAINT "Discover_Recipes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discover_Recipes" ADD CONSTRAINT "Discover_Recipes_sourceRecipeId_fkey" FOREIGN KEY ("sourceRecipeId") REFERENCES "Recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discover_Recipe_Images" ADD CONSTRAINT "Discover_Recipe_Images_discoverRecipeId_fkey" FOREIGN KEY ("discoverRecipeId") REFERENCES "Discover_Recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discover_Recipe_Images" ADD CONSTRAINT "Discover_Recipe_Images_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discover_Recipe_Ratings" ADD CONSTRAINT "Discover_Recipe_Ratings_discoverRecipeId_fkey" FOREIGN KEY ("discoverRecipeId") REFERENCES "Discover_Recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discover_Recipe_Ratings" ADD CONSTRAINT "Discover_Recipe_Ratings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discover_Recipe_Saves" ADD CONSTRAINT "Discover_Recipe_Saves_discoverRecipeId_fkey" FOREIGN KEY ("discoverRecipeId") REFERENCES "Discover_Recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discover_Recipe_Saves" ADD CONSTRAINT "Discover_Recipe_Saves_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discover_Recipe_Saves" ADD CONSTRAINT "Discover_Recipe_Saves_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION discover_recipes_tsv_trigger() RETURNS trigger AS $$
BEGIN
  NEW.tsv :=
    setweight(to_tsvector('simple', left(coalesce(NEW.title, ''), 255)), 'A') ||
    setweight(to_tsvector('simple', left(coalesce(NEW.description, ''), 255)), 'B') ||
    setweight(to_tsvector('simple', left(coalesce(NEW.ingredients, ''), 3000)), 'B') ||
    setweight(to_tsvector('simple', left(coalesce(NEW.notes, ''), 3000)), 'C') ||
    setweight(to_tsvector('simple', left(coalesce(NEW.instructions, ''), 3000)), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS discover_recipes_tsv_update ON "Discover_Recipes";
CREATE TRIGGER discover_recipes_tsv_update
  BEFORE INSERT OR UPDATE OF title, description, ingredients, notes, instructions
  ON "Discover_Recipes"
  FOR EACH ROW
  EXECUTE FUNCTION discover_recipes_tsv_trigger();

-- CreateTable
CREATE TABLE "Discover_Recipe_Links" (
    "id" UUID NOT NULL,
    "discoverRecipeId" UUID NOT NULL,
    "linkedDiscoverRecipeId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Discover_Recipe_Links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "discover_recipe_links_pair_uk" ON "Discover_Recipe_Links"("discoverRecipeId", "linkedDiscoverRecipeId");

-- CreateIndex
CREATE INDEX "discover_recipe_links_discover_recipe_id" ON "Discover_Recipe_Links"("discoverRecipeId");

-- CreateIndex
CREATE INDEX "discover_recipe_links_linked_discover_recipe_id" ON "Discover_Recipe_Links"("linkedDiscoverRecipeId");

-- AddForeignKey
ALTER TABLE "Discover_Recipe_Links" ADD CONSTRAINT "Discover_Recipe_Links_discoverRecipeId_fkey" FOREIGN KEY ("discoverRecipeId") REFERENCES "Discover_Recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discover_Recipe_Links" ADD CONSTRAINT "Discover_Recipe_Links_linkedDiscoverRecipeId_fkey" FOREIGN KEY ("linkedDiscoverRecipeId") REFERENCES "Discover_Recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TYPE "UserDiscoverStanding" AS ENUM ('NORMAL', 'TRUSTED', 'SHADOWBANNED');
ALTER TABLE "Users" ADD COLUMN "discoverStanding" "UserDiscoverStanding" NOT NULL DEFAULT 'NORMAL';

CREATE TYPE "DiscoverReportSource" AS ENUM ('USER', 'SYSTEM');
CREATE TYPE "DiscoverReportStatus" AS ENUM ('OPEN', 'ACTIONED', 'DISMISSED');

CREATE TABLE "Discover_Recipe_Reports" (
    "id" UUID NOT NULL,
    "discoverRecipeId" UUID NOT NULL,
    "source" "DiscoverReportSource" NOT NULL,
    "reporterId" UUID,
    "reason" TEXT NOT NULL,
    "status" "DiscoverReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Discover_Recipe_Reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Discover_Recipe_Reports_discoverRecipeId_reporterId_uk" ON "Discover_Recipe_Reports"("discoverRecipeId", "reporterId");

CREATE INDEX "discover_recipe__reports_status_created_at" ON "Discover_Recipe_Reports"("status", "createdAt");

CREATE INDEX "discover_recipe__reports_discover_recipe_id" ON "Discover_Recipe_Reports"("discoverRecipeId");

ALTER TABLE "Discover_Recipe_Reports" ADD CONSTRAINT "Discover_Recipe_Reports_discoverRecipeId_fkey" FOREIGN KEY ("discoverRecipeId") REFERENCES "Discover_Recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Discover_Recipe_Reports" ADD CONSTRAINT "Discover_Recipe_Reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
