-- CreateTable
CREATE TABLE "MealOptions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "mealTime" VARCHAR(5),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MealOptions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MealOptions" ADD CONSTRAINT "MealOptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
