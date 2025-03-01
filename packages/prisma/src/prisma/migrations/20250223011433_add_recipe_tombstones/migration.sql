-- CreateTable
CREATE TABLE "RecipeTombstones" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "RecipeTombstones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recipetombstones_user_id" ON "RecipeTombstones"("userId");

-- CreateIndex
CREATE INDEX "profile_item_user_id" ON "ProfileItems"("userId");

-- AddForeignKey
ALTER TABLE "RecipeTombstones" ADD CONSTRAINT "RecipeTombstones_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
