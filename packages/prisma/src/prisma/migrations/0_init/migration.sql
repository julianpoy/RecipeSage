-- CreateTable
CREATE TABLE "FCMTokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "token" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "FCMTokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Friendships" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "friendId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Friendships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Images" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "location" VARCHAR(255),
    "key" VARCHAR(255),
    "json" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Labels" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" VARCHAR(255),
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealPlanItems" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "mealPlanId" UUID NOT NULL,
    "recipeId" UUID,
    "title" TEXT,
    "scheduled" TIMESTAMPTZ(6),
    "meal" VARCHAR(255),
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "MealPlanItems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealPlan_Collaborators" (
    "id" UUID NOT NULL,
    "mealPlanId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "MealPlan_Collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealPlans" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "MealPlans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Messages" (
    "id" UUID NOT NULL,
    "fromUserId" UUID NOT NULL,
    "toUserId" UUID NOT NULL,
    "recipeId" UUID,
    "originalRecipeId" UUID,
    "body" TEXT,
    "type" VARCHAR(255),
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileItems" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "recipeId" UUID,
    "labelId" UUID,
    "title" VARCHAR(255) NOT NULL,
    "type" VARCHAR(255) NOT NULL,
    "visibility" VARCHAR(255) NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ProfileItems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipe_Images" (
    "id" UUID NOT NULL,
    "recipeId" UUID NOT NULL,
    "imageId" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Recipe_Images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipe_Labels" (
    "id" UUID NOT NULL,
    "recipeId" UUID NOT NULL,
    "labelId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Recipe_Labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipes" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "fromUserId" UUID,
    "title" TEXT,
    "description" TEXT,
    "yield" TEXT,
    "activeTime" TEXT,
    "totalTime" TEXT,
    "source" TEXT,
    "url" TEXT,
    "notes" TEXT,
    "ingredients" TEXT,
    "instructions" TEXT,
    "folder" VARCHAR(255),
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "indexedAt" TIMESTAMPTZ(6),
    "rating" INTEGER,

    CONSTRAINT "Recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" VARCHAR(255),
    "token" VARCHAR(255),
    "expires" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShoppingListItems" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "shoppingListId" UUID NOT NULL,
    "mealPlanItemId" UUID,
    "recipeId" UUID,
    "title" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ShoppingListItems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShoppingList_Collaborators" (
    "id" UUID NOT NULL,
    "shoppingListId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ShoppingList_Collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShoppingLists" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ShoppingLists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripePayments" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "amountPaid" INTEGER NOT NULL,
    "customerId" VARCHAR(255) NOT NULL,
    "customerEmail" VARCHAR(255),
    "paymentIntentId" VARCHAR(255) NOT NULL,
    "subscriptionId" VARCHAR(255),
    "invoiceBlob" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "StripePayments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSubscriptions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" VARCHAR(255),
    "expires" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "UserSubscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User_Profile_Images" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "imageId" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "User_Profile_Images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Users" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "passwordHash" TEXT,
    "passwordSalt" TEXT,
    "passwordVersion" INTEGER,
    "lastLogin" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "stripeCustomerId" VARCHAR(255),
    "handle" VARCHAR(255),
    "enableProfile" BOOLEAN NOT NULL DEFAULT false,
    "profileVisibility" VARCHAR(255),

    CONSTRAINT "Users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SequelizeMeta" (
    "name" VARCHAR(255) NOT NULL,

    CONSTRAINT "SequelizeMeta_pkey" PRIMARY KEY ("name")
);

-- CreateIndex
CREATE UNIQUE INDEX "Friendships_userId_friendId_uk" ON "Friendships"("userId", "friendId");

-- CreateIndex
CREATE INDEX "images_user_id" ON "Images"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Labels_userId_title_uk" ON "Labels"("userId", "title");

-- CreateIndex
CREATE INDEX "meal_plan_items_meal_plan_id" ON "MealPlanItems"("mealPlanId");

-- CreateIndex
CREATE INDEX "meal_plan_items_recipe_id" ON "MealPlanItems"("recipeId");

-- CreateIndex
CREATE UNIQUE INDEX "MealPlan_Collaborators_mealPlanId_userId_key" ON "MealPlan_Collaborators"("mealPlanId", "userId");

-- CreateIndex
CREATE INDEX "messages_original_recipe_id" ON "Messages"("originalRecipeId");

-- CreateIndex
CREATE INDEX "messages_recipe_id" ON "Messages"("recipeId");

-- CreateIndex
CREATE INDEX "recipe__images_recipe_id" ON "Recipe_Images"("recipeId");

-- CreateIndex
CREATE INDEX "recipe__images_image_id" ON "Recipe_Images"("imageId");

-- CreateIndex
CREATE INDEX "recipe__labels_label_id" ON "Recipe_Labels"("labelId");

-- CreateIndex
CREATE INDEX "recipe__labels_recipe_id" ON "Recipe_Labels"("recipeId");

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_Labels_labelId_recipeId_uk" ON "Recipe_Labels"("labelId", "recipeId");

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_Labels_recipeId_labelId_key" ON "Recipe_Labels"("recipeId", "labelId");

-- CreateIndex
CREATE INDEX "recipes_user_id" ON "Recipes"("userId");

-- CreateIndex
CREATE INDEX "recipes_from_user_id" ON "Recipes"("fromUserId");

-- CreateIndex
CREATE INDEX "shopping_list_items_recipe_id" ON "ShoppingListItems"("recipeId");

-- CreateIndex
CREATE INDEX "shopping_list_items_shopping_list_id" ON "ShoppingListItems"("shoppingListId");

-- CreateIndex
CREATE UNIQUE INDEX "ShoppingList_Collaborators_shoppingListId_userId_key" ON "ShoppingList_Collaborators"("shoppingListId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "StripePayments_paymentIntentId_key" ON "StripePayments"("paymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_uk" ON "Users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Users_stripeCustomerId_key" ON "Users"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Users_handle_uk" ON "Users"("handle");

-- AddForeignKey
ALTER TABLE "FCMTokens" ADD CONSTRAINT "FCMTokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendships" ADD CONSTRAINT "Friendships_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendships" ADD CONSTRAINT "Friendships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Images" ADD CONSTRAINT "Images_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Labels" ADD CONSTRAINT "Labels_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlanItems" ADD CONSTRAINT "MealPlanItems_mealPlanId_fkey" FOREIGN KEY ("mealPlanId") REFERENCES "MealPlans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlanItems" ADD CONSTRAINT "MealPlanItems_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlanItems" ADD CONSTRAINT "MealPlanItems_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlan_Collaborators" ADD CONSTRAINT "MealPlan_Collaborators_mealPlanId_fkey" FOREIGN KEY ("mealPlanId") REFERENCES "MealPlans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlan_Collaborators" ADD CONSTRAINT "MealPlan_Collaborators_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlans" ADD CONSTRAINT "MealPlans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Messages" ADD CONSTRAINT "Messages_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Messages" ADD CONSTRAINT "Messages_originalRecipeId_fkey" FOREIGN KEY ("originalRecipeId") REFERENCES "Recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Messages" ADD CONSTRAINT "Messages_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Messages" ADD CONSTRAINT "Messages_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileItems" ADD CONSTRAINT "ProfileItems_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "Labels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileItems" ADD CONSTRAINT "ProfileItems_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileItems" ADD CONSTRAINT "ProfileItems_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipe_Images" ADD CONSTRAINT "Recipe_Images_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipe_Images" ADD CONSTRAINT "Recipe_Images_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipe_Labels" ADD CONSTRAINT "Recipe_Labels_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "Labels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipe_Labels" ADD CONSTRAINT "Recipe_Labels_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipes" ADD CONSTRAINT "Recipes_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipes" ADD CONSTRAINT "Recipes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sessions" ADD CONSTRAINT "Sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingListItems" ADD CONSTRAINT "ShoppingListItems_mealPlanItemId_fkey" FOREIGN KEY ("mealPlanItemId") REFERENCES "MealPlanItems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingListItems" ADD CONSTRAINT "ShoppingListItems_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingListItems" ADD CONSTRAINT "ShoppingListItems_shoppingListId_fkey" FOREIGN KEY ("shoppingListId") REFERENCES "ShoppingLists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingListItems" ADD CONSTRAINT "ShoppingListItems_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingList_Collaborators" ADD CONSTRAINT "ShoppingList_Collaborators_shoppingListId_fkey" FOREIGN KEY ("shoppingListId") REFERENCES "ShoppingLists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingList_Collaborators" ADD CONSTRAINT "ShoppingList_Collaborators_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingLists" ADD CONSTRAINT "ShoppingLists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StripePayments" ADD CONSTRAINT "StripePayments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSubscriptions" ADD CONSTRAINT "UserSubscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User_Profile_Images" ADD CONSTRAINT "User_Profile_Images_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User_Profile_Images" ADD CONSTRAINT "User_Profile_Images_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

