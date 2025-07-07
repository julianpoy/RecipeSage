-- CreateTable
CREATE TABLE "MealOptionItems" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "scheduled" TIME(0) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MealOptionItems_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MealOptionItems" ADD CONSTRAINT "MealOptionItems_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
