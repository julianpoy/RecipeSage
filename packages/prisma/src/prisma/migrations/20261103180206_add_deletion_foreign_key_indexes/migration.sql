-- CreateIndex
CREATE INDEX "AssistantMessages_recipeId_idx" ON "AssistantMessages"("recipeId");

-- CreateIndex
CREATE INDEX "profile_item_recipe_id" ON "ProfileItems"("recipeId");

-- CreateIndex
CREATE INDEX "profile_item_label_id" ON "ProfileItems"("labelId");

-- CreateIndex
CREATE INDEX "discover_recipes_source_recipe_id" ON "Discover_Recipes"("sourceRecipeId");

-- CreateIndex
CREATE INDEX "User_Profile_Images_imageId_idx" ON "User_Profile_Images"("imageId");

-- CreateIndex
CREATE INDEX "discover_recipe__saves_discover_recipe_id" ON "Discover_Recipe_Saves"("discoverRecipeId");

-- CreateIndex
CREATE INDEX "discover_recipe__reports_reporter_id" ON "Discover_Recipe_Reports"("reporterId");
