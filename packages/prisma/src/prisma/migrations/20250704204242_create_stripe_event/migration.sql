-- CreateTable
CREATE TABLE "StripeEvents" (
    "id" UUID NOT NULL,
    "stripeId" VARCHAR(255) NOT NULL,
    "userId" UUID,
    "blob" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "StripeEvents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StripeEvents_stripeId_key" ON "StripeEvents"("stripeId");

-- AddForeignKey
ALTER TABLE "StripeEvents" ADD CONSTRAINT "StripeEvents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
