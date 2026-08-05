-- CreateIndex
CREATE INDEX CONCURRENTLY IF NOT EXISTS "StripeEvents_userId_idx" ON "StripeEvents"("userId");
