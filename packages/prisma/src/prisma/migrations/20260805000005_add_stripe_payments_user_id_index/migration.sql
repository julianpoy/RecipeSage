-- CreateIndex
CREATE INDEX CONCURRENTLY IF NOT EXISTS "StripePayments_userId_idx" ON "StripePayments"("userId");
