-- CreateTable
CREATE TABLE "AssistantMessages" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" VARCHAR(255) NOT NULL,
    "content" TEXT,
    "name" TEXT,
    "json" JSONB NOT NULL,
    "recipeId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AssistantMessages_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AssistantMessages" ADD CONSTRAINT "AssistantMessages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantMessages" ADD CONSTRAINT "AssistantMessages_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
