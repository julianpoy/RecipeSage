-- CreateIndex
CREATE UNIQUE INDEX CONCURRENTLY "Sessions_token_key" ON "Sessions"("token");
