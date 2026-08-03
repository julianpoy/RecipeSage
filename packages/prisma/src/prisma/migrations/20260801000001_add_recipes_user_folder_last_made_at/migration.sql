CREATE INDEX CONCURRENTLY IF NOT EXISTS "recipes_user_folder_last_made_at" ON "Recipes" ("userId", "folder", "lastMadeAt" DESC);
