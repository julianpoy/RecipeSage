CREATE INDEX CONCURRENTLY IF NOT EXISTS "recipes_user_folder_updated_at" ON "Recipes" ("userId", "folder", "updatedAt" DESC, "id");
