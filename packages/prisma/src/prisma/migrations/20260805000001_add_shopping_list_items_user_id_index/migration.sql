-- CreateIndex
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ShoppingListItems_userId_idx" ON "ShoppingListItems"("userId");
