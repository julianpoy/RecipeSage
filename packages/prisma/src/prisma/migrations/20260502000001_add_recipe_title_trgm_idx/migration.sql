CREATE INDEX CONCURRENTLY "recipes_title_trgm_idx" ON "Recipes" USING gist (immutable_unaccent(lower(title)) gist_trgm_ops);
