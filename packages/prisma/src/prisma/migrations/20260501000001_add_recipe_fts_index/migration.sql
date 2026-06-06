CREATE INDEX CONCURRENTLY "recipes_tsv_idx" ON "Recipes" USING gin(tsv);
